/**
 * Node integrity suite — no WebGL.
 * Run: node burn-studio/tests/run-tests.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const js = path.join(__dirname, '..', 'js');

const Hash = require(path.join(js, 'hash.js'));
const Schema = require(path.join(js, 'schema.js'));
const Engine = require(path.join(js, 'engine.js'));
const Recorder = require(path.join(js, 'recorder.js'));
const Synthetic = require(path.join(js, 'synthetic-burn.js'));
const Adaptor = require(path.join(js, 'adaptor-ingress.js'));
const Pipeline = require(path.join(js, 'pipeline-view.js'));
const Compare = require(path.join(js, 'compare.js'));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('ok  ', msg);
  }
}

console.log('=== Burn Studio integrity tests ===\n');

// 1. Canonical hash stability
{
  const a = Hash.hashValue({ z: 1, a: [2, 3], m: { b: true } });
  const b = Hash.hashValue({ m: { b: true }, a: [2, 3], z: 1 });
  assert(a === b, 'canonicalize key order independent');
  assert(a.length === 16, 'hash hex length 16');
}

// 2. Schema rejects bad seq
{
  const e = Schema.validateEvent(
    { v: 1, type: 'spark', seq: 5, t_ms: 0, x: 0, y: 0, digest: '0123456789abcdef' },
    { prevSeq: 2 },
  );
  assert(e.some((x) => x.includes('seq')), 'schema catches seq gap');
}

// 3. Deterministic synthetic burns
{
  const p1 = Synthetic.generateBurn({ seed: 42, grid: 64, sparkCount: 40, snapshotEvery: 16 });
  const p2 = Synthetic.generateBurn({ seed: 42, grid: 64, sparkCount: 40, snapshotEvery: 16 });
  // events content (ignore burn_id / created_at)
  const strip = (p) =>
    JSON.stringify({
      seed: p.seed,
      grid: p.grid,
      events: p.events,
      chain: p.chain,
      final_state_hash: p.final_state_hash,
    });
  assert(strip(p1) === strip(p2), 'same seed ⇒ identical events+chain+final hash');
  assert(p1.final_state_hash === p2.final_state_hash, 'final_state_hash match');
}

// 4. Different seed different hash
{
  const p1 = Synthetic.generateBurn({ seed: 1, grid: 64, sparkCount: 20 });
  const p2 = Synthetic.generateBurn({ seed: 2, grid: 64, sparkCount: 20 });
  assert(p1.final_state_hash !== p2.final_state_hash, 'different seeds diverge');
}

// 5. loadPack verifies
{
  const p = Synthetic.generateBurn({ seed: 99, grid: 64, sparkCount: 30, snapshotEvery: 10 });
  const { final } = Recorder.loadPack(p);
  assert(Engine.stateHash(final) === p.final_state_hash, 'loadPack final hash');
}

// 6. Seek ≡ fold
{
  const p = Synthetic.generateBurn({ seed: 7, grid: 64, sparkCount: 50, snapshotEvery: 12 });
  const target = Math.floor(p.events.length / 2);
  const seq = p.events[target].seq;
  const viaSeek = Engine.seek(p.events, p.snapshots, seq);
  const viaFold = Engine.fold(p.events, { upToSeq: seq });
  assert(Engine.stateHash(viaSeek) === Engine.stateHash(viaFold), 'seek ≡ fold at mid');
}

// 7. Double fold idempotent
{
  const p = Synthetic.generateBurn({ seed: 11, grid: 64, sparkCount: 25 });
  const a = Engine.fold(p.events);
  const b = Engine.fold(p.events);
  assert(Engine.stateHash(a) === Engine.stateHash(b), 'double fold identical');
}

// 8. Corrupt chain hard-fails
{
  const p = Synthetic.generateBurn({ seed: 3, grid: 64, sparkCount: 15 });
  const bad = JSON.parse(JSON.stringify(p));
  bad.chain[3] = 'deadbeefdeadbeef';
  let threw = false;
  try {
    Recorder.loadPack(bad);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'corrupt chain rejected');
}

// 9. Corrupt event hard-fails on fold
{
  const p = Synthetic.generateBurn({ seed: 5, grid: 64, sparkCount: 15 });
  const bad = JSON.parse(JSON.stringify(p));
  // flip a pass alpha if present
  const alpha = bad.events.find((e) => e.type === 'alpha' && e.pass === true);
  if (alpha) {
    alpha.pass = false;
    alpha.veto = 2;
    let threw = false;
    try {
      // chain will fail first if we only change event without chain — good
      Recorder.loadPack(bad);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'mutated event without chain update rejected');
  } else {
    assert(true, 'skip alpha mutation (no pass alpha)');
  }
}

// 10. Slow tick does not change lattice hash contribution for activity
{
  const rec = Recorder.createRecorder({ seed: 100, grid: 64, snapshotEvery: 1000 });
  const st0 = rec.getState();
  const h0 = Engine.stateHash(st0);
  rec.append({
    type: 'slow_tick',
    t_ms: 1,
    phase: 'A',
    phi_ratio: 1.5,
    stress: 0,
  });
  const st1 = rec.getState();
  // activity/hop/adm must be unchanged
  let same = true;
  for (let i = 0; i < st0.activity.length; i++) {
    if (st0.activity[i] !== st1.activity[i] || st0.hop[i] !== st1.hop[i] || st0.adm[i] !== st1.adm[i]) {
      same = false;
      break;
    }
  }
  assert(same, 'slow_tick does not mutate lattice');
  assert(st1.metrics.slow_phase === 'A', 'slow_tick updates observation metrics');
  assert(h0 !== Engine.stateHash(st1), 'state hash still changes via metrics/seq (audit trail)');
}

// 11. Adaptor identity extinction
{
  let threw = false;
  try {
    Adaptor.envelopeToSpark({ a: 1, userId: 'nope' }, { grid: 64, strict: true });
  } catch (e) {
    threw = /IDENTITY/.test(e.message);
  }
  assert(threw, 'adaptor rejects userId');
  const ok = Adaptor.envelopeToSpark({ kind: 'x', n: 1 }, { grid: 64, strict: true });
  assert(/^[0-9a-f]{16}$/.test(ok.digest), 'adaptor digest 16 hex');
  assert(ok.sparkPartial.x >= 0 && ok.sparkPartial.x < 64, 'site in range');
}

// 12. Adaptor inject into recorder
{
  const rec = Recorder.createRecorder({ seed: 55, grid: 64, snapshotEvery: 100 });
  const r = Adaptor.injectEnvelope(rec, { kind: 'test', n: 0 }, { source: 'test', hops: 2 });
  assert(typeof r.pass === 'boolean', 'inject returns pass');
  rec.end();
  const pack = rec.getPack();
  Recorder.loadPack(pack);
  assert(pack.events.some((e) => e.type === 'spark'), 'inject wrote spark');
}

// 13. Pipeline derive pure
{
  const p = Synthetic.generateBurn({ seed: 8, grid: 64, sparkCount: 15 });
  const d = Pipeline.derive(p.events, p.events[p.events.length - 1].seq, 40);
  assert(d.stages.length === 7, 'pipeline has 7 stages');
  assert(Array.isArray(d.recent), 'pipeline recent events');
}

// 14. Compare same pack at progress
{
  const p = Synthetic.generateBurn({ seed: 9, grid: 64, sparkCount: 20 });
  const c = Compare.compareAtProgress(p, p, 0.5);
  assert(c.sameHash === true, 'compare identical packs same hash at 0.5');
  assert(c.delta.sparks === 0, 'compare delta sparks 0');
}

console.log('\n=== done ===');
if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('all passed');
process.exit(0);
