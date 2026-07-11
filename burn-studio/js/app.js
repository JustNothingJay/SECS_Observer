/**
 * Burn Studio application shell.
 * Live burn · scrub · recompute · import/export · pipeline · adaptor inject.
 * UNCOMMITTED workstream — review before git.
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
  let liveRec = null;
  let injectCount = 0;

  function log(msg, cls) {
    const t = new Date().toISOString().slice(11, 19);
    logLines.unshift({ t, msg, cls: cls || '' });
    if (logLines.length > 100) logLines.pop();
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

  function maxSeq() {
    if (!pack || !pack.events.length) return 0;
    return pack.events[pack.events.length - 1].seq;
  }

  function findEvent(seq) {
    if (!pack) return null;
    // events are dense seq from 0 — index often equals seq
    if (pack.events[seq] && pack.events[seq].seq === seq) return pack.events[seq];
    for (let i = 0; i < pack.events.length; i++) {
      if (pack.events[i].seq === seq) return pack.events[i];
    }
    return null;
  }

  function updatePipeline(seq) {
    if (!pack || typeof BurnPipeline === 'undefined') return;
    const d = BurnPipeline.derive(pack.events, seq, 32);
    const host = $('pipe-stages');
    if (host) {
      host.innerHTML = d.stages
        .map((st) => {
          let cls = 'pipe-stage';
          if (st.id === 'boundary' && d.lights.boundary) cls += ' on';
          if (st.id === 'alpha' && d.lights.alpha) {
            cls += d.lights.alpha_pass === false ? ' fail' : ' on';
          }
          if (st.id === 'validate' && d.lights.validate) cls += ' on';
          if (st.id === 'route' && d.lights.route) cls += ' on';
          if (st.id === 'react' && d.lights.react) cls += ' on';
          if (st.id === 'extinguish' && d.lights.extinguish) cls += ' on';
          if (st.id === 'purity' && d.lights.purity) cls += ' on';
          if (d.lights.panic) cls += ' panic';
          return `<div class="${cls}">${st.label}</div>`;
        })
        .join('');
    }
    const vetoEl = $('pipe-veto');
    if (vetoEl) {
      vetoEl.textContent = d.vetoName
        ? 'Veto: ' + d.vetoName
        : d.lights.panic
          ? 'PANIC — input blocked'
          : '';
    }
    const now = $('event-now');
    if (now) {
      const ev = findEvent(seq);
      now.textContent =
        'seq ' + seq + ' · ' + BurnPipeline.eventLine(ev) +
        (viewState ? ' · hash ' + BurnEngine.stateHash(viewState).slice(0, 12) + '…' : '');
    }
    const trail = $('event-trail');
    if (trail) {
      trail.innerHTML = d.recent
        .map(
          (e) =>
            `<div>${e.seq}: ${escapeHtml(BurnPipeline.eventLine(e))}</div>`,
        )
        .join('');
    }
  }

  function updateVetoBreak(s) {
    const el = $('veto-break');
    if (!el || !s) return;
    const vb = s.metrics.veto_breakdown || {};
    const names = BurnSchema.VETO_CLASSES;
    el.innerHTML = [1, 2, 3, 4, 5, 6]
      .map((k) => {
        const n = vb[k] || 0;
        return `<div class="vb ${n ? 'has' : ''}"><span>v${k} ${names[k] || ''}</span><span class="n">${n}</span></div>`;
      })
      .join('');
  }

  function seekTo(seq) {
    if (!pack) return;
    seq = Math.max(0, Math.min(maxSeq(), seq | 0));
    try {
      viewState = BurnEngine.seek(pack.events, pack.snapshots, seq);
      $('seq-label').textContent = String(viewState.seq);
      $('t-label').textContent = viewState.t_ms + ' ms';
      $('hash-label').textContent = BurnEngine.stateHash(viewState);
      $('scrub').value = String(viewState.seq);
      $('scrub').max = String(maxSeq());
      updateMetrics(viewState);
      updatePipeline(viewState.seq);
      updateVetoBreak(viewState);
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

    document.querySelectorAll('.slow-path .ph').forEach((el) => {
      el.classList.toggle('on', el.dataset.phase === m.slow_phase);
    });
    const phiBar = $('phi-fill');
    if (phiBar && typeof m.phi_ratio === 'number') {
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
        loadPack(JSON.parse(reader.result), file.name);
      } catch (e) {
        log('IMPORT FAIL: ' + e.message, 'err');
      }
    };
    reader.readAsText(file);
  }

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
    injectCount = 0;
    $('status-badge').textContent = 'LIVE';
    $('btn-live').textContent = 'Stop live';
    log('Live burn started seed=' + seed, 'ok');

    liveTimer = setInterval(() => {
      if (!liveMode || !liveRec) return;
      try {
        // Use adaptor ingress so live path = same code as inject
        BurnAdaptor.injectEnvelope(
          liveRec,
          {
            kind: 'live_tick',
            n: injectCount++,
            note: 'studio_live',
          },
          { source: 'live', hops: 2 + (injectCount % 3) },
        );
        if (injectCount % 6 === 0) {
          const s2 = liveRec.getState();
          liveRec.append({
            type: 'slow_tick',
            t_ms: s2.t_ms + 1,
            phase: ['A', 'B', 'C', 'D', 'E'][Math.min(4, Math.floor(injectCount / 40))],
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
    }, 140);
  }

  function stopLive() {
    const was = liveMode;
    liveMode = false;
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = null;
    if ($('btn-live')) $('btn-live').textContent = 'Live burn';
    if (liveRec && was) {
      try {
        liveRec.end();
        pack = liveRec.getPack();
        loadPack(pack, 'live-finalized');
      } catch (e) {
        log('Live finalize: ' + e.message, 'err');
      }
    }
    liveRec = null;
  }

  function startPlay() {
    stopLive();
    if (!pack) return;
    stopPlay();
    let seq = viewState ? viewState.seq : 0;
    if (seq >= maxSeq()) seq = 0;
    const speed = parseInt($('inp-speed').value, 10) || 40;
    playTimer = setInterval(() => {
      seq += 1;
      if (seq > maxSeq()) {
        stopPlay();
        return;
      }
      seekTo(seq);
    }, speed);
    $('status-badge').textContent = 'replaying';
  }

  function stopPlay() {
    if (playTimer) clearInterval(playTimer);
    playTimer = null;
  }

  function togglePlay() {
    if (playTimer) {
      stopPlay();
      $('status-badge').textContent = pack ? 'paused' : 'idle';
    } else if (liveMode) {
      stopLive();
    } else {
      startPlay();
    }
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

  /** Manual adaptor spark — identity-free envelope */
  function injectSpark() {
    if (liveMode && liveRec) {
      try {
        const r = BurnAdaptor.injectEnvelope(
          liveRec,
          {
            kind: 'manual_inject',
            n: injectCount++,
            doctrine: 'studio',
          },
          { source: 'manual', hops: 4 },
        );
        pack = liveRec.getPack();
        seekTo(maxSeq());
        log(
          'Injected spark ' + r.digest.slice(0, 8) + ' @' + r.site.x + ',' + r.site.y +
            (r.pass ? ' PASS' : ' VETO'),
          r.pass ? 'ok' : 'err',
        );
      } catch (e) {
        log('Inject fail: ' + e.message, 'err');
      }
      return;
    }
    // Offline: rebuild pack by appending via new recorder from existing events — heavy.
    // Simpler path: if no pack, start recorder; if pack exists, create recorder and replay then inject
    try {
      const seed = viewState ? viewState.seed : parseInt($('inp-seed').value, 10) || 0x53454353;
      const grid = viewState ? viewState.grid : parseInt($('inp-grid').value, 10) || 128;
      if (!pack) {
        liveRec = BurnRecorder.createRecorder({ seed, grid, source: 'inject-session', snapshotEvery: 24 });
      } else {
        // Continue from end by reconstructing recorder state is not exported —
        // generate a micro session on current seed topology
        liveRec = BurnRecorder.createRecorder({
          seed: seed ^ (injectCount + 1),
          grid,
          source: 'inject-session',
          snapshotEvery: 24,
        });
      }
      const r = BurnAdaptor.injectEnvelope(
        liveRec,
        {
          kind: 'manual_inject',
          n: injectCount++,
          doctrine: 'studio',
          // identity fields must be stripped / rejected:
          // userId: 'should-never-appear'
        },
        { source: 'manual', hops: 4, strict: true },
      );
      // also prove identity rejection
      try {
        BurnAdaptor.envelopeToSpark(
          { payload: 1, userId: 'bad' },
          { grid, strict: true },
        );
        log('IDENTITY CHECK FAILED — should have thrown', 'err');
      } catch (idErr) {
        log('Identity extinction OK: ' + idErr.message.slice(0, 60), 'ok');
      }
      liveRec.end();
      loadPack(liveRec.getPack(), 'inject-session');
      liveRec = null;
      log(
        'Injected ' + r.digest.slice(0, 8) + ' @' + r.site.x + ',' + r.site.y +
          (r.pass ? ' PASS' : ' VETO'),
        r.pass ? 'ok' : 'err',
      );
    } catch (e) {
      log('Inject fail: ' + e.message, 'err');
      liveRec = null;
    }
  }

  function step(delta) {
    stopPlay();
    stopLive();
    if (!pack) return;
    const cur = viewState ? viewState.seq : 0;
    seekTo(cur + delta);
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
    });
    $('btn-play').addEventListener('click', startPlay);
    $('btn-pause').addEventListener('click', () => {
      stopPlay();
      stopLive();
      $('status-badge').textContent = pack ? 'paused' : 'idle';
    });
    $('btn-export').addEventListener('click', exportPack);
    $('btn-verify').addEventListener('click', verifyNow);
    $('btn-inject').addEventListener('click', injectSpark);
    $('file-import').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importPack(f);
    });
    $('scrub').addEventListener('input', () => {
      stopPlay();
      if (liveMode) stopLive();
      seekTo(parseInt($('scrub').value, 10));
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        step(e.shiftKey ? -10 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        step(e.shiftKey ? 10 : 1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        stopPlay();
        seekTo(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        stopPlay();
        seekTo(maxSeq());
      } else if (e.key === 'v' || e.key === 'V') {
        verifyNow();
      } else if (e.key === 'g' || e.key === 'G') {
        runSynthetic();
      } else if (e.key === 'i' || e.key === 'I') {
        injectSpark();
      }
    });

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
