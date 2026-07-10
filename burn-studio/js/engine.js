/**
 * Deterministic fold engine.
 * state(seq) = fold(seed, events[0..seq])
 * No I/O. No Math.random. No Date.
 */
(function (root, factory) {
  const dep = (name, nodePath) => {
    if (typeof module === 'object' && module.exports) return require(nodePath);
    return root[name];
  };
  const factoryFn = (Hash, Schema, Rng) => factory(Hash, Schema, Rng);
  if (typeof module === 'object' && module.exports) {
    module.exports = factoryFn(
      require('./hash.js'),
      require('./schema.js'),
      require('./rng.js'),
    );
  } else {
    root.BurnEngine = factoryFn(root.BurnHash, root.BurnSchema, root.BurnRng);
  }
})(typeof self !== 'undefined' ? self : this, function (Hash, Schema, Rng) {
  'use strict';

  const PHI = 1.618033988749895;

  function buildTopology(seed, grid) {
    const rng = Rng.fromSeed((seed ^ 0xa5a5a5a5) >>> 0);
    const n = grid * grid;
    const adm = new Uint8Array(n);
    let admissible = 0;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const i = y * grid + x;
        // Structured land: fbm-like via multi-hash thresholds (deterministic)
        const h1 = Hash.fnv1a32(x + ',' + y + ',' + seed, seed);
        const h2 = Hash.fnv1a32((x >> 2) + ':' + (y >> 2) + ':' + seed, seed ^ 0x9e3779b9);
        const v = ((h1 & 0xffff) / 0xffff) * 0.65 + ((h2 & 0xffff) / 0xffff) * 0.35;
        const a = v > 0.38 ? 1 : 0;
        adm[i] = a;
        if (a) admissible++;
      }
    }
    // Ensure connected-ish mass: if too sparse, lower threshold fill from rng
    if (admissible < n * 0.35) {
      for (let i = 0; i < n; i++) {
        if (!adm[i] && rng.chance(0.22)) {
          adm[i] = 1;
          admissible++;
        }
      }
    }
    return { adm, admissible };
  }

  function createInitialState(seed, grid) {
    const { adm, admissible } = buildTopology(seed, grid);
    const n = grid * grid;
    return {
      schema_version: Schema.SCHEMA_VERSION,
      seed,
      grid,
      seq: -1,
      t_ms: 0,
      // per-cell: activity age (0 idle, 1.. = collapse), hop gen, veto residual
      activity: new Float32Array(n),
      hop: new Float32Array(n),
      veto: new Float32Array(n),
      adm,
      metrics: {
        sparks: 0,
        passed: 0,
        vetoed: 0,
        collapse_steps: 0,
        extinguish: 0,
        panic: 0,
        admissible,
        active_cells: 0,
        phi_ratio: 1,
        stress: 0,
        slow_phase: 'idle',
        veto_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      },
      panic: false,
      open_sparks: Object.create(null), // spark_seq -> {x,y,digest}
    };
  }

  function cloneState(s) {
    return {
      schema_version: s.schema_version,
      seed: s.seed,
      grid: s.grid,
      seq: s.seq,
      t_ms: s.t_ms,
      activity: new Float32Array(s.activity),
      hop: new Float32Array(s.hop),
      veto: new Float32Array(s.veto),
      adm: new Uint8Array(s.adm),
      metrics: JSON.parse(JSON.stringify(s.metrics)),
      panic: s.panic,
      open_sparks: JSON.parse(JSON.stringify(s.open_sparks)),
    };
  }

  /** Canonical serialisable view for hashing (typed arrays → arrays of numbers). */
  function serialiseForHash(s) {
    // Deep-copy metrics / open_sparks — never retain live references into state
    // (that was a snapshot corruption bug: later folds mutated stored restore payloads).
    return {
      schema_version: s.schema_version,
      seed: s.seed,
      grid: s.grid,
      seq: s.seq,
      t_ms: s.t_ms,
      activity: Array.from(s.activity),
      hop: Array.from(s.hop),
      veto: Array.from(s.veto),
      adm: Array.from(s.adm),
      metrics: JSON.parse(JSON.stringify(s.metrics)),
      panic: s.panic,
      open_sparks: JSON.parse(JSON.stringify(s.open_sparks)),
    };
  }

  function stateHash(s) {
    return Hash.hashValue(serialiseForHash(s));
  }

  function snapshotOf(s) {
    return {
      seq: s.seq,
      t_ms: s.t_ms,
      state_hash: stateHash(s),
      metrics: JSON.parse(JSON.stringify(s.metrics)),
      panic: s.panic,
      // full restore payload
      restore: serialiseForHash(s),
    };
  }

  function restoreFromSnapshot(snap) {
    const r = snap.restore;
    if (!r) throw new Error('snapshot missing restore payload');
    return {
      schema_version: r.schema_version,
      seed: r.seed,
      grid: r.grid,
      seq: r.seq,
      t_ms: r.t_ms,
      activity: Float32Array.from(r.activity),
      hop: Float32Array.from(r.hop),
      veto: Float32Array.from(r.veto),
      adm: Uint8Array.from(r.adm),
      metrics: JSON.parse(JSON.stringify(r.metrics)),
      panic: r.panic,
      open_sparks: JSON.parse(JSON.stringify(r.open_sparks)),
    };
  }

  function idx(s, x, y) {
    const g = s.grid;
    return ((y % g + g) % g) * g + ((x % g + g) % g);
  }

  function countActive(s) {
    let c = 0;
    for (let i = 0; i < s.activity.length; i++) if (s.activity[i] >= 1) c++;
    return c;
  }

  function ageAll(s, amount) {
    for (let i = 0; i < s.activity.length; i++) {
      if (s.activity[i] >= 1) {
        s.activity[i] += amount;
        if (s.activity[i] > 48) {
          s.activity[i] = 0;
          s.hop[i] = 0;
        }
      }
      if (s.veto[i] > 0) s.veto[i] *= 0.92;
      if (s.veto[i] < 0.02) s.veto[i] = 0;
    }
  }

  function applyEvent(s, ev) {
    const errs = Schema.validateEvent(ev, { prevSeq: s.seq });
    if (errs.length) throw new Error('invalid event seq=' + ev.seq + ': ' + errs.join('; '));

    s.seq = ev.seq;
    s.t_ms = ev.t_ms;

    switch (ev.type) {
      case 'burn_start': {
        // Re-init if folding from empty
        if (s.seed !== ev.seed || s.grid !== ev.grid) {
          const nu = createInitialState(ev.seed, ev.grid);
          Object.assign(s, nu);
          s.seq = ev.seq;
          s.t_ms = ev.t_ms;
        }
        break;
      }
      case 'spark': {
        if (s.panic) break;
        s.metrics.sparks += 1;
        const i = idx(s, ev.x, ev.y);
        s.open_sparks[String(ev.seq)] = {
          x: ev.x,
          y: ev.y,
          digest: ev.digest,
          source: ev.source || 'unknown',
        };
        // Spark marks boundary pressure even before alpha
        if (s.adm[i]) {
          s.activity[i] = Math.max(s.activity[i], 0.5);
        } else {
          s.veto[i] = Math.max(s.veto[i], 0.4);
        }
        break;
      }
      case 'alpha': {
        if (s.panic) break;
        const sp = s.open_sparks[String(ev.spark_seq)];
        if (!sp) throw new Error('alpha references missing spark_seq ' + ev.spark_seq);
        const i = idx(s, sp.x, sp.y);
        if (ev.pass) {
          if (!s.adm[i]) throw new Error('alpha pass on inadmissible cell — corrupt log');
          s.metrics.passed += 1;
          s.activity[i] = 1;
          s.hop[i] = 0;
        } else {
          s.metrics.vetoed += 1;
          s.metrics.veto_breakdown[ev.veto] =
            (s.metrics.veto_breakdown[ev.veto] || 0) + 1;
          s.veto[i] = 1;
          s.activity[i] = 0;
          s.hop[i] = 0;
          delete s.open_sparks[String(ev.spark_seq)];
        }
        break;
      }
      case 'collapse_step': {
        if (s.panic) break;
        const i = idx(s, ev.x, ev.y);
        if (!s.adm[i]) throw new Error('collapse on void cell — corrupt log');
        s.metrics.collapse_steps += 1;
        s.activity[i] = 1 + ev.hop * 0.15;
        s.hop[i] = ev.hop;
        // Neighbour bleed (deterministic local hop visual)
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let d = 0; d < 4; d++) {
          const nx = ev.x + dirs[d][0];
          const ny = ev.y + dirs[d][1];
          const j = idx(s, nx, ny);
          if (s.adm[j] && s.activity[j] < 1) {
            // only mark pressure; actual hop must be its own event for pure audit
            s.veto[j] = Math.max(s.veto[j], 0.05);
          }
        }
        ageAll(s, 0.35);
        break;
      }
      case 'extinguish': {
        const i = idx(s, ev.x, ev.y);
        s.metrics.extinguish += 1;
        s.activity[i] = 0;
        s.hop[i] = 0;
        // close any spark at site
        for (const k of Object.keys(s.open_sparks)) {
          const sp = s.open_sparks[k];
          if (sp.x === ev.x && sp.y === ev.y) delete s.open_sparks[k];
        }
        ageAll(s, 0.5);
        break;
      }
      case 'slow_tick': {
        s.metrics.slow_phase = ev.phase;
        s.metrics.phi_ratio = ev.phi_ratio;
        s.metrics.stress = ev.stress;
        // Slow path never mutates activity/hop/adm — observation only
        break;
      }
      case 'panic': {
        s.panic = true;
        s.metrics.panic += 1;
        s.metrics.stress = 4;
        break;
      }
      case 'recover': {
        s.panic = false;
        s.metrics.stress = 0;
        for (let i = 0; i < s.activity.length; i++) {
          s.activity[i] = 0;
          s.hop[i] = 0;
          s.veto[i] = 0;
        }
        s.open_sparks = Object.create(null);
        break;
      }
      case 'burn_end': {
        break;
      }
      default:
        throw new Error('unhandled type ' + ev.type);
    }

    s.metrics.active_cells = countActive(s);
    // Derived phi proximity metric for HUD (not the golden throughput claim — local ratio)
    const p = s.metrics.passed || 1;
    const v = s.metrics.vetoed || 0;
    const ratio = p / Math.max(1, v + p * 0.01);
    s.metrics.pass_veto_ratio = ratio;
    return s;
  }

  function fold(events, { fromState, upToSeq } = {}) {
    let s;
    if (fromState) s = cloneState(fromState);
    else {
      if (!events.length || events[0].type !== 'burn_start') {
        throw new Error('fold requires burn_start as first event without fromState');
      }
      s = createInitialState(events[0].seed, events[0].grid);
    }
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (upToSeq != null && ev.seq > upToSeq) break;
      if (fromState && ev.seq <= fromState.seq) continue;
      applyEvent(s, ev);
    }
    return s;
  }

  /**
   * Seek: use latest snapshot with snap.seq <= target, verify hash, fold forward.
   */
  function seek(events, snapshots, targetSeq) {
    let base = null;
    if (snapshots && snapshots.length) {
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (snapshots[i].seq <= targetSeq) {
          base = snapshots[i];
          break;
        }
      }
    }
    let s;
    if (base) {
      s = restoreFromSnapshot(base);
      const h = stateHash(s);
      if (h !== base.state_hash) {
        throw new Error(
          'SNAPSHOT_CORRUPT seq=' + base.seq + ' expected ' + base.state_hash + ' got ' + h,
        );
      }
    }
    return fold(events, { fromState: s, upToSeq: targetSeq });
  }

  function buildChain(events) {
    let prev = '0'.repeat(16);
    const links = [];
    for (let i = 0; i < events.length; i++) {
      prev = Hash.chainLink(prev, events[i]);
      links.push(prev);
    }
    return links;
  }

  function verifyChain(events, expectedLinks) {
    const links = buildChain(events);
    if (!expectedLinks || expectedLinks.length !== links.length) {
      return { ok: false, error: 'chain length mismatch' };
    }
    for (let i = 0; i < links.length; i++) {
      if (links[i] !== expectedLinks[i]) {
        return { ok: false, error: 'chain break at seq ' + events[i].seq };
      }
    }
    return { ok: true, links };
  }

  return {
    PHI,
    createInitialState,
    cloneState,
    serialiseForHash,
    stateHash,
    snapshotOf,
    restoreFromSnapshot,
    applyEvent,
    fold,
    seek,
    buildChain,
    verifyChain,
  };
});
