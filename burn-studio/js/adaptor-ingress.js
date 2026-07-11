/**
 * Adaptor ingress — map identity-free spark envelopes into burn events.
 *
 * Contract:
 *   - Never accept identity fields (id, userId, sessionId, email, token, deviceId, …)
 *   - Digest is over canonical payload only
 *   - Lattice site derived deterministically from digest + grid (or explicit x,y if provided and in range)
 *
 * This is the seam for terminal / game / vertical demos — not a mock of Fly admission.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./hash.js'), require('./schema.js'));
  } else {
    root.BurnAdaptor = factory(root.BurnHash, root.BurnSchema);
  }
})(typeof self !== 'undefined' ? self : this, function (Hash, Schema) {
  'use strict';

  const IDENTITY_KEYS = Object.freeze([
    'id', 'userId', 'user_id', 'sessionId', 'session_id', 'token', 'email',
    'deviceId', 'device_id', 'name', 'phone', 'ssn', 'account', 'username',
    'patientId', 'patient_id', 'traderId', 'operatorId',
  ]);

  function stripIdentity(obj, path, hits) {
    if (obj == null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((v, i) => stripIdentity(v, path + '[' + i + ']', hits));
    }
    const out = {};
    Object.keys(obj).forEach((k) => {
      const lower = k.toLowerCase();
      if (IDENTITY_KEYS.some((ik) => ik.toLowerCase() === lower || lower.includes('userid'))) {
        hits.push(path + '.' + k);
        return;
      }
      out[k] = stripIdentity(obj[k], path + '.' + k, hits);
    });
    return out;
  }

  /**
   * @param {object} envelope - identity-free payload
   * @param {{ grid: number, source?: string, t_ms?: number, strict?: boolean }} opts
   * @returns {{ sparkPartial: object, alphaHint: object|null, stripped: string[], digest: string }}
   */
  function envelopeToSpark(envelope, opts) {
    const grid = opts.grid;
    if (!grid || grid < 16) throw new Error('envelopeToSpark: grid required');
    const hits = [];
    const clean = stripIdentity(envelope, 'envelope', hits);
    if (opts.strict !== false && hits.length) {
      throw new Error('IDENTITY_EXTINCTION: rejected fields ' + hits.join(', '));
    }
    const digest = Hash.hashValue(clean);
    let x;
    let y;
    if (Number.isInteger(clean.x) && Number.isInteger(clean.y)) {
      x = ((clean.x % grid) + grid) % grid;
      y = ((clean.y % grid) + grid) % grid;
    } else {
      // site from digest bytes
      const h1 = Hash.fnv1a32(digest, 0x11111111);
      const h2 = Hash.fnv1a32(digest, 0x22222222);
      x = h1 % grid;
      y = h2 % grid;
    }
    const sparkPartial = {
      type: 'spark',
      t_ms: opts.t_ms != null ? opts.t_ms : 0,
      x,
      y,
      digest,
      source: opts.source || clean.source || 'adaptor',
    };
    // Optional doctrine tag for alpha hinting (not identity)
    let alphaHint = null;
    if (clean.force_veto === true) {
      alphaHint = { pass: false, veto: Number(clean.veto_class) || 5 };
    } else if (clean.force_pass === true) {
      alphaHint = { pass: true };
    }
    return { sparkPartial, alphaHint, stripped: hits, digest, clean };
  }

  /**
   * Append a full spark cycle onto a recorder (spark + alpha + optional collapse).
   * Alpha uses topology admissibility from recorder state unless alphaHint overrides.
   */
  function injectEnvelope(recorder, envelope, opts) {
    const st = recorder.getState();
    const grid = st.grid;
    const mapped = envelopeToSpark(envelope, {
      grid,
      source: opts && opts.source,
      t_ms: (st.t_ms || 0) + 1,
      strict: opts && opts.strict,
    });
    const sp = recorder.append(mapped.sparkPartial);
    const sparkSeq = sp.event.seq;
    const adm = st.adm[mapped.sparkPartial.y * grid + mapped.sparkPartial.x] === 1;
    let pass;
    let veto;
    if (mapped.alphaHint) {
      pass = mapped.alphaHint.pass && adm;
      if (!pass) veto = mapped.alphaHint.veto || (adm ? 2 : 1);
    } else {
      pass = adm;
      if (!pass) veto = adm ? 2 : 1;
    }
    const t2 = sp.event.t_ms + 1;
    if (pass) {
      recorder.append({ type: 'alpha', t_ms: t2, spark_seq: sparkSeq, pass: true });
      const hops = (opts && opts.hops) != null ? opts.hops : 3;
      let cx = mapped.sparkPartial.x;
      let cy = mapped.sparkPartial.y;
      for (let h = 0; h < hops; h++) {
        recorder.append({
          type: 'collapse_step',
          t_ms: t2 + 1 + h,
          x: cx,
          y: cy,
          stage: Schema.COLLAPSE_STAGES[Math.min(h, 3)],
          hop: h,
        });
        // deterministic walk from digest
        const d = Hash.fnv1a32(mapped.digest + ':' + h, h) % 4;
        if (d === 0) cx = (cx + 1) % grid;
        else if (d === 1) cx = (cx - 1 + grid) % grid;
        else if (d === 2) cy = (cy + 1) % grid;
        else cy = (cy - 1 + grid) % grid;
        if (!st.adm[cy * grid + cx]) break;
      }
      recorder.append({
        type: 'extinguish',
        t_ms: t2 + 1 + hops,
        x: mapped.sparkPartial.x,
        y: mapped.sparkPartial.y,
      });
    } else {
      recorder.append({
        type: 'alpha',
        t_ms: t2,
        spark_seq: sparkSeq,
        pass: false,
        veto: veto || 1,
      });
    }
    return { sparkSeq, pass, digest: mapped.digest, site: { x: mapped.sparkPartial.x, y: mapped.sparkPartial.y } };
  }

  return {
    IDENTITY_KEYS,
    stripIdentity,
    envelopeToSpark,
    injectEnvelope,
  };
});
