/**
 * Burn Studio event schema v1.
 * Identity-free. Append-only. Validated at record and at fold.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BurnSchema = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA_VERSION = 1;

  const EVENT_TYPES = Object.freeze([
    'burn_start',
    'spark',
    'alpha',
    'collapse_step',
    'extinguish',
    'slow_tick',
    'panic',
    'recover',
    'burn_end',
  ]);

  const VETO_CLASSES = Object.freeze({
    1: 'v1_axiom_violation',
    2: 'v2_drift_introduction',
    3: 'v3_identity_emergence',
    4: 'v4_invariant_breach',
    5: 'v5_corruption_attempt',
    6: 'v6_deployment_instability',
  });

  const COLLAPSE_STAGES = Object.freeze([
    'validate',
    'route',
    'react',
    'extinguish',
  ]);

  const SLOW_PHASES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'idle']);

  function isInt(n) {
    return typeof n === 'number' && Number.isInteger(n);
  }

  function isNonNegInt(n) {
    return isInt(n) && n >= 0;
  }

  function validateEvent(ev, { prevSeq } = {}) {
    const errors = [];
    if (!ev || typeof ev !== 'object') return ['event must be object'];
    if (ev.v !== SCHEMA_VERSION) errors.push('v must be ' + SCHEMA_VERSION);
    if (!EVENT_TYPES.includes(ev.type)) errors.push('unknown type: ' + ev.type);
    if (!isNonNegInt(ev.seq)) errors.push('seq must be non-negative integer');
    if (prevSeq != null && ev.seq !== prevSeq + 1) {
      errors.push('seq must be prev+1 (got ' + ev.seq + ', prev ' + prevSeq + ')');
    }
    if (!isNonNegInt(ev.t_ms)) errors.push('t_ms must be non-negative integer');

    switch (ev.type) {
      case 'burn_start':
        if (!isInt(ev.seed)) errors.push('burn_start.seed required');
        if (!isNonNegInt(ev.grid) || ev.grid < 16 || ev.grid > 512) {
          errors.push('burn_start.grid must be 16..512');
        }
        if (ev.grid & (ev.grid - 1)) errors.push('burn_start.grid must be power of 2');
        break;
      case 'spark':
        if (!isNonNegInt(ev.x) || !isNonNegInt(ev.y)) errors.push('spark.x/y required');
        if (typeof ev.digest !== 'string' || !/^[0-9a-f]{16}$/.test(ev.digest)) {
          errors.push('spark.digest must be 16 hex chars');
        }
        if (ev.source != null && typeof ev.source !== 'string') errors.push('spark.source string');
        break;
      case 'alpha':
        if (!isNonNegInt(ev.spark_seq)) errors.push('alpha.spark_seq required');
        if (ev.pass !== true && ev.pass !== false) errors.push('alpha.pass boolean');
        if (!ev.pass) {
          if (!isInt(ev.veto) || ev.veto < 1 || ev.veto > 6) errors.push('alpha.veto 1..6 when fail');
        }
        break;
      case 'collapse_step':
        if (!isNonNegInt(ev.x) || !isNonNegInt(ev.y)) errors.push('collapse_step.x/y');
        if (!COLLAPSE_STAGES.includes(ev.stage)) errors.push('collapse_step.stage invalid');
        if (!isNonNegInt(ev.hop)) errors.push('collapse_step.hop');
        break;
      case 'extinguish':
        if (!isNonNegInt(ev.x) || !isNonNegInt(ev.y)) errors.push('extinguish.x/y');
        break;
      case 'slow_tick':
        if (!SLOW_PHASES.includes(ev.phase)) errors.push('slow_tick.phase');
        if (typeof ev.phi_ratio !== 'number' || !Number.isFinite(ev.phi_ratio)) {
          errors.push('slow_tick.phi_ratio finite number');
        }
        if (!isNonNegInt(ev.stress)) errors.push('slow_tick.stress');
        if (ev.stress > 4) errors.push('slow_tick.stress 0..4');
        break;
      case 'panic':
        if (typeof ev.reason !== 'string' || !ev.reason) errors.push('panic.reason');
        break;
      case 'recover':
        break;
      case 'burn_end':
        if (!isNonNegInt(ev.total_sparks)) errors.push('burn_end.total_sparks');
        break;
      default:
        break;
    }
    return errors;
  }

  function validateBurnPack(pack) {
    const errors = [];
    if (!pack || typeof pack !== 'object') return ['pack must be object'];
    if (pack.schema_version !== SCHEMA_VERSION) errors.push('schema_version mismatch');
    if (!Array.isArray(pack.events) || pack.events.length === 0) errors.push('events required');
    if (pack.events[0].type !== 'burn_start') errors.push('first event must be burn_start');
    let prev = -1;
    for (let i = 0; i < pack.events.length; i++) {
      const e = pack.events[i];
      const ve = validateEvent(e, { prevSeq: prev });
      if (ve.length) errors.push('event[' + i + ']: ' + ve.join('; '));
      prev = e.seq;
    }
    if (pack.events[pack.events.length - 1].type !== 'burn_end') {
      errors.push('last event should be burn_end');
    }
    return errors;
  }

  return {
    SCHEMA_VERSION,
    EVENT_TYPES,
    VETO_CLASSES,
    COLLAPSE_STAGES,
    SLOW_PHASES,
    validateEvent,
    validateBurnPack,
  };
});
