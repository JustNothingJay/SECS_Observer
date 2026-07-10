/**
 * Append-only burn recorder + pack import/export.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./hash.js'),
      require('./schema.js'),
      require('./engine.js'),
    );
  } else {
    root.BurnRecorder = factory(root.BurnHash, root.BurnSchema, root.BurnEngine);
  }
})(typeof self !== 'undefined' ? self : this, function (Hash, Schema, Engine) {
  'use strict';

  function createRecorder({ seed, grid, source, snapshotEvery } = {}) {
    const s0 = seed != null ? seed : 0x53454353; // "SECS"
    const g = grid || 128;
    const every = snapshotEvery != null ? snapshotEvery : 64;

    const start = {
      v: Schema.SCHEMA_VERSION,
      type: 'burn_start',
      seq: 0,
      t_ms: 0,
      seed: s0,
      grid: g,
      source: source || 'studio',
    };

    const pack = {
      schema_version: Schema.SCHEMA_VERSION,
      burn_id: Hash.hashHex('burn:' + s0 + ':' + g + ':' + Date.now()),
      seed: s0,
      grid: g,
      source: source || 'studio',
      created_at: new Date().toISOString(),
      events: [start],
      chain: [],
      snapshots: [],
    };

    let state = Engine.createInitialState(s0, g);
    Engine.applyEvent(state, start);
    pack.chain = Engine.buildChain(pack.events);
    pack.snapshots.push(Engine.snapshotOf(state));

    function nextSeq() {
      return pack.events[pack.events.length - 1].seq + 1;
    }

    function append(partial) {
      const ev = Object.assign({}, partial, {
        v: Schema.SCHEMA_VERSION,
        seq: nextSeq(),
      });
      if (ev.t_ms == null) ev.t_ms = state.t_ms + 1;
      const errs = Schema.validateEvent(ev, {
        prevSeq: pack.events[pack.events.length - 1].seq,
      });
      if (errs.length) throw new Error('record reject: ' + errs.join('; '));
      Engine.applyEvent(state, ev);
      pack.events.push(ev);
      const link = Hash.chainLink(pack.chain[pack.chain.length - 1], ev);
      pack.chain.push(link);
      if (ev.seq % every === 0 || ev.type === 'burn_end' || ev.type === 'panic') {
        pack.snapshots.push(Engine.snapshotOf(state));
      }
      return { event: ev, state: Engine.cloneState(state), chain_tip: link };
    }

    function end(extra) {
      return append(
        Object.assign(
          {
            type: 'burn_end',
            t_ms: state.t_ms + 1,
            total_sparks: state.metrics.sparks,
          },
          extra || {},
        ),
      );
    }

    function getState() {
      return Engine.cloneState(state);
    }

    function getPack() {
      return JSON.parse(JSON.stringify({
        schema_version: pack.schema_version,
        burn_id: pack.burn_id,
        seed: pack.seed,
        grid: pack.grid,
        source: pack.source,
        created_at: pack.created_at,
        events: pack.events,
        chain: pack.chain,
        snapshots: pack.snapshots,
        tip_hash: pack.chain[pack.chain.length - 1],
        final_state_hash: Engine.stateHash(state),
      }));
    }

    return { append, end, getState, getPack, pack };
  }

  function loadPack(raw) {
    const pack = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const errs = Schema.validateBurnPack(pack);
    if (errs.length) throw new Error('pack invalid: ' + errs.join('; '));
    const chainCheck = Engine.verifyChain(pack.events, pack.chain);
    if (!chainCheck.ok) throw new Error('chain invalid: ' + chainCheck.error);
    // Full fold verify final hash if present
    const final = Engine.fold(pack.events);
    if (pack.final_state_hash && Engine.stateHash(final) !== pack.final_state_hash) {
      throw new Error('final_state_hash mismatch — burn corrupt');
    }
    // Verify each snapshot
    for (let i = 0; i < (pack.snapshots || []).length; i++) {
      const snap = pack.snapshots[i];
      const s = Engine.seek(pack.events, null, snap.seq);
      const h = Engine.stateHash(s);
      if (h !== snap.state_hash) {
        throw new Error('snapshot hash fail at seq ' + snap.seq);
      }
    }
    return { pack, final };
  }

  function exportJson(pack) {
    return JSON.stringify(pack, null, 2);
  }

  return { createRecorder, loadPack, exportJson };
});
