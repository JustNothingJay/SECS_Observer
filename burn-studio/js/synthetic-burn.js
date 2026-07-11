/**
 * Synthetic burn generator — deterministic from seed.
 * Models spark → alpha → collapse hops → extinguish + slow ticks.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./hash.js'),
      require('./schema.js'),
      require('./rng.js'),
      require('./engine.js'),
      require('./recorder.js'),
    );
  } else {
    root.BurnSynthetic = factory(
      root.BurnHash,
      root.BurnSchema,
      root.BurnRng,
      root.BurnEngine,
      root.BurnRecorder,
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Hash, Schema, Rng, Engine, Recorder) {
  'use strict';

  function generateBurn({
    seed = 0x53454353,
    grid = 128,
    sparkCount = 200,
    snapshotEvery = 48,
    source = 'synthetic',
    vetoRate = 0.12,
    panicAt = null,
  } = {}) {
    const rec = Recorder.createRecorder({ seed, grid, source, snapshotEvery });
    const rng = Rng.fromSeed(seed ^ 0xC0FFEE);
    let t = 0;
    const state = rec.getState();
    const adm = state.adm;
    const g = grid;

    function pickAdmissibleSite() {
      for (let attempt = 0; attempt < 64; attempt++) {
        const x = rng.int(g);
        const y = rng.int(g);
        if (adm[y * g + x]) return { x, y };
      }
      return { x: 0, y: 0 };
    }

    function pickAnySite() {
      return { x: rng.int(g), y: rng.int(g) };
    }

    let sparksDone = 0;
    while (sparksDone < sparkCount) {
      t += 1 + rng.int(3);
      const forceVeto = rng.chance(vetoRate);
      const site = forceVeto && rng.chance(0.5) ? pickAnySite() : pickAdmissibleSite();
      const digest = Hash.hashHex(
        'spark:' + seed + ':' + sparksDone + ':' + site.x + ',' + site.y,
      );

      const sparkRes = rec.append({
        type: 'spark',
        t_ms: t,
        x: site.x,
        y: site.y,
        digest,
        source: source,
      });
      const sparkSeq = sparkRes.event.seq;
      sparksDone++;

      t += 1;
      const cellAdm = adm[site.y * g + site.x] === 1;
      const pass = cellAdm && !forceVeto;
      if (pass) {
        rec.append({
          type: 'alpha',
          t_ms: t,
          spark_seq: sparkSeq,
          pass: true,
        });
        // collapse hops along a short deterministic walk
        let cx = site.x;
        let cy = site.y;
        // Always walk validate → route → react (SECS stage order), then extra hops as react
        const hops = 3 + rng.int(4);
        for (let h = 0; h < hops; h++) {
          t += 1;
          const stage =
            h === 0 ? 'validate' : h === 1 ? 'route' : h === 2 ? 'react' : 'react';
          rec.append({
            type: 'collapse_step',
            t_ms: t,
            x: cx,
            y: cy,
            stage,
            hop: h,
          });
          const dir = rng.int(4);
          if (dir === 0) cx = (cx + 1) % g;
          else if (dir === 1) cx = (cx - 1 + g) % g;
          else if (dir === 2) cy = (cy + 1) % g;
          else cy = (cy - 1 + g) % g;
          if (!adm[cy * g + cx]) break;
        }
        t += 1;
        rec.append({ type: 'extinguish', t_ms: t, x: site.x, y: site.y });
      } else {
        const veto = cellAdm ? 2 + rng.int(4) : 1; // void → axiom-ish; else other
        rec.append({
          type: 'alpha',
          t_ms: t,
          spark_seq: sparkSeq,
          pass: false,
          veto: Math.min(6, Math.max(1, veto)),
        });
      }

      // periodic slow path observation
      if (sparksDone % 8 === 0) {
        t += 1;
        const st = rec.getState();
        const stable = st.metrics.passed + 1;
        const volatile = st.metrics.vetoed + 1;
        const phiRatio = stable / volatile;
        let stress = 0;
        if (st.metrics.vetoed > st.metrics.passed * 0.5) stress = 2;
        if (st.metrics.vetoed > st.metrics.passed) stress = 3;
        const phases = Schema.SLOW_PHASES;
        const phase = phases[Math.min(4, Math.floor(sparksDone / 40))];
        rec.append({
          type: 'slow_tick',
          t_ms: t,
          phase: phase === 'idle' ? 'A' : phase,
          phi_ratio: phiRatio,
          stress,
        });
      }

      if (panicAt != null && sparksDone === panicAt) {
        t += 1;
        rec.append({ type: 'panic', t_ms: t, reason: 'synthetic_stress_threshold' });
        t += 5;
        rec.append({ type: 'recover', t_ms: t });
      }
    }

    t += 1;
    rec.end({ t_ms: t });
    return rec.getPack();
  }

  return { generateBurn };
});
