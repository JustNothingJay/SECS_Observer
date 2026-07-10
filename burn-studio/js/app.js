/**
 * Burn Studio application shell.
 * Live burn · scrub · recompute · import/export.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  let pack = null;
  let viewState = null;
  let liveMode = false;
  let liveTimer = null;
  let playTimer = null;
  let renderer = null;
  let logLines = [];

  function log(msg, cls) {
    const t = new Date().toISOString().slice(11, 19);
    logLines.unshift({ t, msg, cls: cls || '' });
    if (logLines.length > 80) logLines.pop();
    const el = $('log');
    if (!el) return;
    el.innerHTML = logLines
      .map((l) => `<div class="${l.cls}">[${l.t}] ${escapeHtml(l.msg)}</div>`)
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function setBusy(on) {
    document.querySelectorAll('button.btn').forEach((b) => {
      if (b.dataset.keep) return;
      // don't disable all — only heavy ops buttons use disabled attr set locally
    });
    $('status-badge').textContent = on ? 'working…' : pack ? 'burn loaded' : 'idle';
  }

  function maxSeq() {
    if (!pack || !pack.events.length) return 0;
    return pack.events[pack.events.length - 1].seq;
  }

  function seekTo(seq) {
    if (!pack) return;
    seq = Math.max(0, Math.min(maxSeq(), seq | 0));
    try {
      viewState = BurnEngine.seek(pack.events, pack.snapshots, seq);
      // integrity: optional rehash
      $('seq-label').textContent = String(viewState.seq);
      $('t-label').textContent = viewState.t_ms + ' ms';
      $('hash-label').textContent = BurnEngine.stateHash(viewState);
      $('scrub').value = String(viewState.seq);
      $('scrub').max = String(maxSeq());
      updateMetrics(viewState);
      if (renderer) renderer.draw(viewState);
    } catch (e) {
      log('SEEK FAIL: ' + e.message, 'err');
      console.error(e);
    }
  }

  function updateMetrics(s) {
    const m = s.metrics;
    $('m-sparks').textContent = m.sparks;
    $('m-pass').textContent = m.passed;
    $('m-veto').textContent = m.vetoed;
    $('m-active').textContent = m.active_cells;
    $('m-stress').textContent = m.stress;
    $('m-phi').textContent =
      typeof m.phi_ratio === 'number' ? m.phi_ratio.toFixed(3) : '—';
    $('m-panic').textContent = s.panic ? 'YES' : 'no';
    $('m-panic').className = 'val ' + (s.panic ? 'fail' : 'pass');
    $('m-chain').textContent = pack.tip_hash || pack.chain[pack.chain.length - 1] || '—';
    $('m-seed').textContent = String(s.seed);
    $('m-grid').textContent = s.grid + '²';
    $('m-events').textContent = String(pack.events.length);

    // slow path phases
    document.querySelectorAll('.slow-path .ph').forEach((el) => {
      el.classList.toggle('on', el.dataset.phase === m.slow_phase);
    });
    const phiBar = $('phi-fill');
    if (phiBar && typeof m.phi_ratio === 'number') {
      // map ratio toward golden-ish 1.618 as mid visual
      const pct = Math.max(5, Math.min(100, (m.phi_ratio / 3) * 100));
      phiBar.style.width = pct + '%';
    }
  }

  function loadPack(p, label) {
    stopLive();
    stopPlay();
    try {
      const verified = BurnRecorder.loadPack(p);
      pack = verified.pack;
      // ensure tip_hash
      pack.tip_hash = pack.chain[pack.chain.length - 1];
      log('Loaded burn ' + (pack.burn_id || '').slice(0, 12) + '… (' + label + ')', 'ok');
      log(
        'Verified chain + ' +
          (pack.snapshots || []).length +
          ' snapshots · ' +
          pack.events.length +
          ' events',
        'ok',
      );
      $('scrub').max = String(maxSeq());
      seekTo(maxSeq());
      $('status-badge').textContent = 'verified';
    } catch (e) {
      log('LOAD REJECTED: ' + e.message, 'err');
      pack = null;
      viewState = null;
      throw e;
    }
  }

  function runSynthetic() {
    setBusy(true);
    log('Generating synthetic burn (deterministic)…');
    try {
      const seed = parseInt($('inp-seed').value, 10) || 0x53454353;
      const grid = parseInt($('inp-grid').value, 10) || 128;
      const sparks = parseInt($('inp-sparks').value, 10) || 200;
      const packGen = BurnSynthetic.generateBurn({
        seed,
        grid,
        sparkCount: sparks,
        snapshotEvery: 48,
        source: 'synthetic',
        vetoRate: 0.11,
        panicAt: sparks > 80 ? Math.floor(sparks * 0.7) : null,
      });
      loadPack(packGen, 'synthetic seed=' + seed);
    } catch (e) {
      log('GENERATE FAIL: ' + e.message, 'err');
      console.error(e);
    }
    setBusy(false);
  }

  function exportPack() {
    if (!pack) {
      log('Nothing to export', 'err');
      return;
    }
    const blob = new Blob([BurnRecorder.exportJson(pack)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'burn-' + (pack.burn_id || 'export').slice(0, 16) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    log('Exported artifact pack', 'ok');
  }

  function importPack(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        loadPack(raw, file.name);
      } catch (e) {
        log('IMPORT FAIL: ' + e.message, 'err');
      }
    };
    reader.readAsText(file);
  }

  /** Live mode: generate sparks on a timer into a growing recorder */
  let liveRec = null;

  function startLive() {
    stopPlay();
    stopLive();
    const seed = (parseInt($('inp-seed').value, 10) || 0x53454353) ^ (Date.now() & 0xffff);
    const grid = parseInt($('inp-grid').value, 10) || 128;
    liveRec = BurnRecorder.createRecorder({
      seed,
      grid,
      source: 'live-studio',
      snapshotEvery: 32,
    });
    pack = liveRec.getPack();
    liveMode = true;
    $('status-badge').textContent = 'LIVE';
    log('Live burn started seed=' + seed, 'ok');

    const rng = BurnRng.fromSeed(seed);
    const adm = liveRec.getState().adm;
    let sparks = 0;

    liveTimer = setInterval(() => {
      if (!liveMode || !liveRec) return;
      try {
        const st = liveRec.getState();
        if (st.panic) {
          liveRec.append({ type: 'recover', t_ms: st.t_ms + 1 });
        }
        let x = rng.int(grid);
        let y = rng.int(grid);
        for (let k = 0; k < 20; k++) {
          if (adm[y * grid + x]) break;
          x = rng.int(grid);
          y = rng.int(grid);
        }
        const digest = BurnHash.hashHex('live:' + sparks + ':' + x + ',' + y);
        const t = st.t_ms + 1;
        const sp = liveRec.append({
          type: 'spark',
          t_ms: t,
          x,
          y,
          digest,
          source: 'live',
        });
        sparks++;
        const pass = adm[y * grid + x] === 1 && !rng.chance(0.1);
        if (pass) {
          liveRec.append({
            type: 'alpha',
            t_ms: t + 1,
            spark_seq: sp.event.seq,
            pass: true,
          });
          liveRec.append({
            type: 'collapse_step',
            t_ms: t + 2,
            x,
            y,
            stage: 'react',
            hop: rng.int(4),
          });
          liveRec.append({ type: 'extinguish', t_ms: t + 3, x, y });
        } else {
          liveRec.append({
            type: 'alpha',
            t_ms: t + 1,
            spark_seq: sp.event.seq,
            pass: false,
            veto: 1 + rng.int(6),
          });
        }
        if (sparks % 6 === 0) {
          const s2 = liveRec.getState();
          liveRec.append({
            type: 'slow_tick',
            t_ms: s2.t_ms + 1,
            phase: ['A', 'B', 'C', 'D', 'E'][Math.min(4, Math.floor(sparks / 50))],
            phi_ratio: (s2.metrics.passed + 1) / (s2.metrics.vetoed + 1),
            stress: Math.min(4, Math.floor(s2.metrics.vetoed / 40)),
          });
        }
        pack = liveRec.getPack();
        seekTo(maxSeq());
      } catch (e) {
        log('LIVE error: ' + e.message, 'err');
        stopLive();
      }
    }, 120);
  }

  function stopLive() {
    liveMode = false;
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = null;
    if (liveRec) {
      try {
        liveRec.end();
        pack = liveRec.getPack();
        // re-verify full pack
        loadPack(pack, 'live-finalized');
      } catch (e) {
        log('Live finalize: ' + e.message, 'err');
      }
      liveRec = null;
    }
  }

  function startPlay() {
    stopLive();
    if (!pack) return;
    stopPlay();
    let seq = viewState ? viewState.seq : 0;
    if (seq >= maxSeq()) seq = 0;
    playTimer = setInterval(() => {
      seq += 1;
      if (seq > maxSeq()) {
        stopPlay();
        return;
      }
      seekTo(seq);
    }, 40);
    $('status-badge').textContent = 'replaying';
  }

  function stopPlay() {
    if (playTimer) clearInterval(playTimer);
    playTimer = null;
  }

  function verifyNow() {
    if (!pack) {
      log('No pack', 'err');
      return;
    }
    try {
      BurnRecorder.loadPack(pack);
      const a = BurnEngine.fold(pack.events);
      const b = BurnEngine.fold(pack.events);
      const ha = BurnEngine.stateHash(a);
      const hb = BurnEngine.stateHash(b);
      if (ha !== hb) throw new Error('double-fold hash mismatch');
      log('VERIFY OK · final ' + ha, 'ok');
      // random seeks
      const mid = Math.floor(maxSeq() / 2);
      const s1 = BurnEngine.seek(pack.events, pack.snapshots, mid);
      const s2 = BurnEngine.fold(pack.events, { upToSeq: mid });
      if (BurnEngine.stateHash(s1) !== BurnEngine.stateHash(s2)) {
        throw new Error('seek vs fold mismatch at mid');
      }
      log('SEEK INTEGRITY OK at seq ' + mid, 'ok');
    } catch (e) {
      log('VERIFY FAIL: ' + e.message, 'err');
    }
  }

  function init() {
    const canvas = $('c');
    try {
      renderer = BurnRenderer.createRenderer(canvas);
    } catch (e) {
      log('WebGL: ' + e.message, 'err');
    }

    $('btn-gen').addEventListener('click', runSynthetic);
    $('btn-live').addEventListener('click', () => {
      if (liveMode) stopLive();
      else startLive();
      $('btn-live').textContent = liveMode ? 'Stop live' : 'Live burn';
    });
    $('btn-play').addEventListener('click', startPlay);
    $('btn-pause').addEventListener('click', () => {
      stopPlay();
      stopLive();
      $('btn-live').textContent = 'Live burn';
      $('status-badge').textContent = pack ? 'paused' : 'idle';
    });
    $('btn-export').addEventListener('click', exportPack);
    $('btn-verify').addEventListener('click', verifyNow);
    $('file-import').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importPack(f);
    });
    $('scrub').addEventListener('input', () => {
      stopPlay();
      stopLive();
      $('btn-live').textContent = 'Live burn';
      seekTo(parseInt($('scrub').value, 10));
    });

    // Boot: generate a default burn so the room is not empty
    runSynthetic();
    requestAnimationFrame(function loop() {
      if (renderer && viewState) renderer.draw(viewState);
      requestAnimationFrame(loop);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
