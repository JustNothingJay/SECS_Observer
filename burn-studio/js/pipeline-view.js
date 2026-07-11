/**
 * Derive fast-path pipeline presentation from events at/near current seq.
 * Pure — no GPU, no mutation of engine state.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./schema.js'));
  } else {
    root.BurnPipeline = factory(root.BurnSchema);
  }
})(typeof self !== 'undefined' ? self : this, function (Schema) {
  'use strict';

  const STAGES = Object.freeze([
    { id: 'boundary', label: 'Spark' },
    { id: 'alpha', label: 'α gate' },
    { id: 'validate', label: 'Validate' },
    { id: 'route', label: 'Route' },
    { id: 'react', label: 'React' },
    { id: 'extinguish', label: 'Extinguish' },
    { id: 'purity', label: '⊥₀' },
  ]);

  /**
   * Look at last N events ≤ seq and light the pipeline.
   */
  function derive(events, seq, windowSize) {
    const win = windowSize || 24;
    const atOrBefore = [];
    for (let i = 0; i < events.length; i++) {
      if (events[i].seq <= seq) atOrBefore.push(events[i]);
      else break;
    }
    const slice = atOrBefore.slice(-win);
    const lights = {
      boundary: false,
      alpha: false,
      alpha_pass: null,
      veto: null,
      validate: false,
      route: false,
      react: false,
      extinguish: false,
      purity: false,
      panic: false,
    };
    let lastSpark = null;
    let lastAlpha = null;
    let lastCollapse = null;
    let lastType = null;

    for (let i = 0; i < slice.length; i++) {
      const e = slice[i];
      lastType = e.type;
      if (e.type === 'spark') {
        lights.boundary = true;
        lastSpark = e;
        lights.alpha_pass = null;
        lights.veto = null;
      }
      if (e.type === 'alpha') {
        lights.alpha = true;
        lastAlpha = e;
        lights.alpha_pass = e.pass;
        lights.veto = e.pass ? null : e.veto;
        if (!e.pass) {
          lights.validate = false;
          lights.route = false;
          lights.react = false;
        }
      }
      if (e.type === 'collapse_step') {
        lastCollapse = e;
        if (e.stage === 'validate') lights.validate = true;
        if (e.stage === 'route') {
          lights.validate = true;
          lights.route = true;
        }
        if (e.stage === 'react') {
          lights.validate = true;
          lights.route = true;
          lights.react = true;
        }
        if (e.stage === 'extinguish') {
          lights.validate = true;
          lights.route = true;
          lights.react = true;
          lights.extinguish = true;
        }
      }
      if (e.type === 'extinguish') {
        lights.extinguish = true;
        lights.purity = true;
      }
      if (e.type === 'panic') lights.panic = true;
      if (e.type === 'recover') lights.panic = false;
    }

    // If last alpha failed, mark purity after veto (annihilate → empty)
    if (lastAlpha && !lastAlpha.pass) {
      lights.purity = true;
    }

    return {
      stages: STAGES,
      lights,
      lastSpark,
      lastAlpha,
      lastCollapse,
      lastType,
      recent: slice.slice(-8),
      vetoName: lastAlpha && !lastAlpha.pass
        ? Schema.VETO_CLASSES[lastAlpha.veto] || ('v' + lastAlpha.veto)
        : null,
    };
  }

  function eventLine(e) {
    if (!e) return '—';
    switch (e.type) {
      case 'spark':
        return 'spark @' + e.x + ',' + e.y + ' ' + (e.digest || '').slice(0, 8);
      case 'alpha':
        return e.pass ? 'α PASS' : 'α VETO ' + (Schema.VETO_CLASSES[e.veto] || e.veto);
      case 'collapse_step':
        return 'collapse ' + e.stage + ' hop=' + e.hop + ' @' + e.x + ',' + e.y;
      case 'extinguish':
        return 'extinguish @' + e.x + ',' + e.y;
      case 'slow_tick':
        return 'slow ' + e.phase + ' φ=' + Number(e.phi_ratio).toFixed(3) + ' stress=' + e.stress;
      case 'panic':
        return 'PANIC ' + e.reason;
      case 'recover':
        return 'recover';
      case 'burn_start':
        return 'burn_start seed=' + e.seed + ' grid=' + e.grid;
      case 'burn_end':
        return 'burn_end sparks=' + e.total_sparks;
      default:
        return e.type;
    }
  }

  return { STAGES, derive, eventLine };
});
