/**
 * Pure deterministic hashing for browser + Node.
 * FNV-1a 32-bit for chain links; extended to 64-bit hex via dual seeds.
 * No Web Crypto dependency — same bits on every platform.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BurnHash = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FNV_OFFSET = 0x811c9dc5;
  const FNV_PRIME = 0x01000193;

  function fnv1a32(str, seed) {
    let h = (seed == null ? FNV_OFFSET : (seed >>> 0)) >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, FNV_PRIME) >>> 0;
    }
    return h >>> 0;
  }

  function toHex8(n) {
    return (n >>> 0).toString(16).padStart(8, '0');
  }

  /** Stable 16-char hex from string (dual FNV). */
  function hashHex(str) {
    const a = fnv1a32(str, FNV_OFFSET);
    const b = fnv1a32(str, 0x811c9dc5 ^ 0x9e3779b9);
    return toHex8(a) + toHex8(b);
  }

  /**
   * Canonical JSON: sort object keys, no whitespace, arrays preserve order.
   * Rejects undefined, functions, NaN, Infinity, BigInt.
   */
  function canonicalize(value) {
    return stringify(value);
  }

  function stringify(v) {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'number') {
      if (!Number.isFinite(v)) throw new Error('canonicalize: non-finite number');
      if (Object.is(v, -0)) return '0';
      return String(v);
    }
    if (t === 'string') return JSON.stringify(v);
    if (t !== 'object') throw new Error('canonicalize: unsupported type ' + t);
    if (Array.isArray(v)) {
      return '[' + v.map(stringify).join(',') + ']';
    }
    const keys = Object.keys(v).sort();
    const parts = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (v[k] === undefined) continue;
      parts.push(JSON.stringify(k) + ':' + stringify(v[k]));
    }
    return '{' + parts.join(',') + '}';
  }

  function hashValue(value) {
    return hashHex(canonicalize(value));
  }

  /** Chain: H(prevHex + "\\n" + canonical(event)) */
  function chainLink(prevHex, event) {
    const body = (prevHex || '0'.repeat(16)) + '\n' + canonicalize(event);
    return hashHex(body);
  }

  return {
    fnv1a32,
    hashHex,
    canonicalize,
    hashValue,
    chainLink,
  };
});
