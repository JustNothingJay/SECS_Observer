/**
 * Dual-burn compare — recompute both packs to a seq index ratio and diff metrics.
 * Pure analysis; no rendering.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine.js'), require('./recorder.js'));
  } else {
    root.BurnCompare = factory(root.BurnEngine, root.BurnRecorder);
  }
})(typeof self !== 'undefined' ? self : this, function (Engine, Recorder) {
  'use strict';

  function loadSafe(raw) {
    return Recorder.loadPack(raw);
  }

  /**
   * @param {object} packA
   * @param {object} packB
   * @param {number} progress 0..1 through each burn's event range
   */
  function compareAtProgress(packA, packB, progress) {
    const p = Math.max(0, Math.min(1, progress));
    const seqA = Math.floor(packA.events[packA.events.length - 1].seq * p);
    const seqB = Math.floor(packB.events[packB.events.length - 1].seq * p);
    const sA = Engine.seek(packA.events, packA.snapshots, seqA);
    const sB = Engine.seek(packB.events, packB.snapshots, seqB);
    return {
      seqA,
      seqB,
      hashA: Engine.stateHash(sA),
      hashB: Engine.stateHash(sB),
      sameHash: Engine.stateHash(sA) === Engine.stateHash(sB),
      metricsA: sA.metrics,
      metricsB: sB.metrics,
      delta: {
        sparks: sA.metrics.sparks - sB.metrics.sparks,
        passed: sA.metrics.passed - sB.metrics.passed,
        vetoed: sA.metrics.vetoed - sB.metrics.vetoed,
        active: sA.metrics.active_cells - sB.metrics.active_cells,
      },
    };
  }

  function sameSeedTopology(packA, packB) {
    return packA.seed === packB.seed && packA.grid === packB.grid;
  }

  return { loadSafe, compareAtProgress, sameSeedTopology };
});
