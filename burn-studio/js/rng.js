/**
 * Seeded PRNG — Mulberry32. Same seed ⇒ same stream in browser and Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BurnRng = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fromSeed(seed) {
    const next = mulberry32(seed);
    return {
      next,
      int(maxExclusive) {
        return Math.floor(next() * maxExclusive);
      },
      pick(arr) {
        return arr[Math.floor(next() * arr.length)];
      },
      chance(p) {
        return next() < p;
      },
    };
  }

  return { mulberry32, fromSeed };
});
