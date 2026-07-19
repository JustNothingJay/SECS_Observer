/* Summit Arena client — family tables (2–5 humans) + server-authoritative play. */
(function () {
  'use strict';

  function wsUrl() {
    try {
      var q = new URLSearchParams(location.search).get('ws');
      if (q) return q;
      var saved = localStorage.getItem('sa_server');
      if (saved) return saved;
    } catch (e) {}
    return 'wss://secs-arena.fly.dev';
  }
  var WS_URL = wsUrl();
  var H = { 2:3, 3:5, 4:7, 5:9, 6:11, 7:13, 8:11, 9:9, 10:7, 11:5, 12:3 };
  var COL = ['#3d9a6a', '#c45a7a', '#7a6bc4', '#c47a3a', '#4a9a9a'];

  // ── Winner skins (kid-designed) ──
  // Each win unlocks a design session; skins stack forever.
  var SKIN_COLS = {
    default: ['#3d9a6a', '#c45a7a', '#7a6bc4', '#c47a3a', '#4a9a9a'],
    // EZ — pitch B&W; climb pills = oztag jersey kits
    bombaclarttttt: ['#e31c23', '#1b4f9c', '#f5c400', '#00a651', '#ff5a00'],
    // AC — yellow/white stripes; climb pills = pastel rainbow
    // pink · green · purple · orange · cyan
    duckduckgoose: ['#ffb6c8', '#b8e6b8', '#d4b8f0', '#ffd0a8', '#9eecf5']
  };
  var SKIN_ORDER = ['default', 'bombaclarttttt', 'duckduckgoose'];
  var SKIN_META = {
    default: { label: 'Default Arena', credit: '', badge: '' },
    bombaclarttttt: {
      label: 'BOMBACLARTTTTT',
      credit: 'EZ · oztag · black & white',
      badge: 'BOMBACLARTTTTT · EZ'
    },
    duckduckgoose: {
      label: 'duckduckgoose',
      credit: 'AC · yellow & white stripes · pastel climbs',
      badge: 'duckduckgoose · AC'
    }
  };
  var MAX_SEATS_UI = 5;
  /** Rebuild a <select> with 0..max options (or min..max). */
  function fillBotSelect(sel, maxBots, selected, minBots) {
    if (!sel) return;
    minBots = minBots == null ? 0 : minBots;
    maxBots = Math.max(minBots, maxBots | 0);
    var cur = selected != null ? String(selected) : sel.value;
    sel.innerHTML = '';
    for (var n = minBots; n <= maxBots; n++) {
      var o = document.createElement('option');
      o.value = String(n);
      o.textContent = String(n);
      sel.appendChild(o);
    }
    var want = parseInt(cur, 10);
    if (isNaN(want)) want = minBots;
    want = Math.max(minBots, Math.min(maxBots, want));
    sel.value = String(want);
  }
  var LS_SKIN = 'sa_skin_v1';
  function getSkin() {
    try {
      var s = localStorage.getItem(LS_SKIN) || 'default';
      return SKIN_COLS[s] ? s : 'default';
    } catch (e) { return 'default'; }
  }
  function applySkin(id, opts) {
    opts = opts || {};
    if (!SKIN_COLS[id]) id = 'default';
    COL = SKIN_COLS[id].slice();
    try {
      var wrap = document.getElementById('arWrap') || document.querySelector('.ar-wrap');
      if (wrap) {
        if (id === 'default') wrap.removeAttribute('data-ar-skin');
        else wrap.setAttribute('data-ar-skin', id);
      }
      try { localStorage.setItem(LS_SKIN, id); } catch (e) {}
      var meta = SKIN_META[id] || SKIN_META.default;
      var credit = document.getElementById('skinCredit');
      if (credit) credit.textContent = meta.credit || '';
      var badge = document.getElementById('arSkinBadge');
      if (badge) {
        badge.textContent = meta.badge || ((meta.label || '') + (meta.credit ? ' · ' + meta.credit : ''));
      }
    } catch (eSkin) {}
    // Re-paint only when asked (never block startup / connect)
    if (opts.repaint) {
      try { if (typeof renderGame === 'function' && curState) renderGame(); } catch (e2) {}
      try { if (typeof renderLobby === 'function') renderLobby(); } catch (e3) {}
    }
  }
  function populateSkinPicker() {
    var sel = $('skinPick');
    if (!sel) return;
    var cur = getSkin();
    sel.innerHTML = '';
    SKIN_ORDER.forEach(function (id) {
      var o = document.createElement('option');
      o.value = id;
      var m = SKIN_META[id] || { label: id };
      o.textContent = m.label + (m.credit ? ' — ' + m.credit : '');
      if (id === cur) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      applySkin(sel.value, { repaint: true });
      var m = SKIN_META[sel.value];
      if (m && sel.value !== 'default') {
        toast('Skin on: ' + m.label + (m.credit ? ' (' + m.credit + ')' : ''), 'ok');
      } else {
        toast('Default Arena skin', 'ok');
      }
    };
    // CSS only on first load — don't touch lobby DOM before connect wires up
    applySkin(cur, { repaint: false });
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getAliases() {
    try { return JSON.parse(localStorage.getItem('sa_aliases') || '[]') || []; }
    catch (e) { return []; }
  }
  function rememberAlias(n) {
    n = (n || '').trim(); if (!n) return;
    var a = getAliases().filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); });
    a.unshift(n); if (a.length > 12) a = a.slice(0, 12);
    try { localStorage.setItem('sa_aliases', JSON.stringify(a)); } catch (e) {}
  }
  function myAlias() { try { return localStorage.getItem('sa_alias') || ''; } catch (e) { return ''; } }
  function setAlias(n) { try { localStorage.setItem('sa_alias', n); } catch (e) {} }

  var ws = null, youId = null, mySeat = null, curState = null;
  var lobbyPlayers = [], lobbyParties = [], myParty = null;
  var reconnectT = null, bustHideT = null, pingT = null;
  var everConnected = false, reconnectAttempt = 0, intentionalClose = false;
  var inGame = false;
  var lastGameOver = null; // hold for rematch / stats
  var hostId = null;
  var mySaves = [];
  var rageCount = 0;
  // Assist / coach — personal pick vs match table rule
  var LS_ASSIST = 'sa_assist_v1';
  var matchAssistPolicy = 'player'; // 'player' | 'table' frozen at gameStart
  var matchAssistMode = 'solo';
  var coachPickSig = null;
  var ASSIST_BLURB = {
    solo: 'No hints — pure seat. Best for fair sibling head-to-head.',
    coach: 'Highlights one strong legal climb each turn. You still pick — just a nudge.',
    guide: 'Coach highlight plus a one-tap “Take highlight” button if you want that climb.'
  };
  function getPersonalAssist() {
    try {
      var v = localStorage.getItem(LS_ASSIST) || 'solo';
      return (v === 'coach' || v === 'guide' || v === 'solo') ? v : 'solo';
    } catch (e) { return 'solo'; }
  }
  function setPersonalAssist(v) {
    v = (v === 'coach' || v === 'guide') ? v : 'solo';
    try { localStorage.setItem(LS_ASSIST, v); } catch (e) {}
    return v;
  }
  /** Effective assist for this device right now (lobby personal or match lock). */
  function effectiveAssist() {
    if (inGame && matchAssistPolicy === 'table') return matchAssistMode || 'solo';
    return getPersonalAssist();
  }
  function updateAssistBlurb() {
    var bl = $('assistBlurb');
    var pick = $('assistPick');
    var mode = pick ? pick.value : getPersonalAssist();
    if (bl) bl.textContent = ASSIST_BLURB[mode] || ASSIST_BLURB.solo;
  }
  function wireAssistPickers() {
    var pick = $('assistPick');
    if (pick && !pick._wired) {
      pick._wired = true;
      pick.value = getPersonalAssist();
      pick.onchange = function () {
        setPersonalAssist(pick.value);
        updateAssistBlurb();
        if (inGame && matchAssistPolicy === 'player') renderControls();
        toast('Your assist: ' + pick.options[pick.selectedIndex].text, 'ok');
      };
    }
    updateAssistBlurb();
    function wirePolicy(policyEl, modeEl) {
      if (!policyEl || policyEl._wired) return;
      policyEl._wired = true;
      var sync = function () {
        if (modeEl) modeEl.hidden = policyEl.value !== 'table';
      };
      policyEl.onchange = sync;
      sync();
    }
    wirePolicy($('tableAssistPolicy'), $('tableAssistMode'));
    wirePolicy($('quickAssistPolicy'), $('quickAssistMode'));
    if ($('tableAssistPolicy') && !$('tableAssistPolicy')._hostSend) {
      $('tableAssistPolicy')._hostSend = true;
      var sendAssist = function () {
        if (!myParty || String(myParty.hostId) !== String(youId)) return;
        send({
          t: 'setPartyAssist',
          assistPolicy: $('tableAssistPolicy').value,
          assistMode: ($('tableAssistMode') && $('tableAssistMode').value) || 'solo'
        });
        var hint = $('tableAssistHint');
        if (hint) {
          hint.textContent = $('tableAssistPolicy').value === 'table'
            ? ('Whole table: ' + (($('tableAssistMode') && $('tableAssistMode').selectedOptions[0].text) || 'Solo'))
            : 'Each player uses their own assist (set under You).';
        }
      };
      $('tableAssistPolicy').addEventListener('change', sendAssist);
      if ($('tableAssistMode')) $('tableAssistMode').addEventListener('change', sendAssist);
    }
  }

  // ── Ledger (moved from Summit Lab — Arena matches only) ──
  // Prefer sa_games_v1; migrate old sl_games_v1 once so sibling history isn&apos;t lost.
  var LS_GAMES = 'sa_games_v1';
  var LS_GAMES_LEGACY = 'sl_games_v1';
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function getGames() {
    var g = lsGet(LS_GAMES, null);
    if (g instanceof Array) return g;
    var legacy = lsGet(LS_GAMES_LEGACY, []);
    if (legacy instanceof Array && legacy.length) {
      lsSet(LS_GAMES, legacy);
      return legacy;
    }
    return [];
  }
  function pushGame(rec) {
    var g = getGames();
    g.push(rec);
    if (g.length > 500) g = g.slice(g.length - 500);
    lsSet(LS_GAMES, g);
  }
  function isPlaceholderName(n) {
    var s = String(n || '').trim().toLowerCase();
    if (!s) return true;
    if (s === 'player' || s === 'you' || s === 'seat') return true;
    if (/^player\s*#?\s*\d+$/i.test(s)) return true; // Player 1, Player one via number
    if (/^player\s+(one|two|three|four|five)$/i.test(s)) return true;
    if (/^seat\s*\d+$/i.test(s)) return true;
    return false;
  }
  function cleanDisplayName(n) {
    var s = String(n || '').trim();
    return isPlaceholderName(s) ? null : s;
  }
  function recordArenaGame(m) {
    if (!m || !m.seats || m.winnerSeat == null) return;
    var me = myAlias();
    var seats = m.seats.map(function (s) {
      var nm = cleanDisplayName(s.name) || (s.human ? null : (s.name || 'Rival'));
      // Prefer live alias if this seat is "me" under a placeholder
      if (s.human && isPlaceholderName(s.name) && me) nm = me;
      if (!nm) nm = s.human ? 'Unknown' : (s.pilot || 'Rival');
      return { h: !!s.human, pilot: s.pilot || 'human', n: nm, c: s.claims || 0 };
    });
    // Skip total junk all-placeholder human games
    var realHumans = seats.filter(function (s) { return s.h && !isPlaceholderName(s.n) && s.n !== 'Unknown'; });
    if (realHumans.length < 1) return;
    pushGame({ t: Date.now(), seats: seats, win: m.winnerSeat, src: 'arena' });
    renderStats();
  }
  function renderStatsInto(body) {
    if (!body) return;
    var games = getGames();
    if (!games.length) {
      body.innerHTML = '<p class="stats-empty">No Arena games yet. Finish a match and it lands here.</p>';
      return;
    }
    var lb = {}, riv = {};
    for (var gi = 0; gi < games.length; gi++) {
      var rec = games[gi], humans = [];
      for (var si = 0; si < rec.seats.length; si++) {
        var s = rec.seats[si];
        if (!s.h) continue;
        var disp = cleanDisplayName(s.n);
        if (!disp) continue; // hide "Player 1" / empty placeholders
        var key = disp.toLowerCase();
        if (!lb[key]) lb[key] = { disp: disp, played: 0, won: 0 };
        lb[key].disp = disp;
        lb[key].played++;
        if (si === rec.win) lb[key].won++;
        humans.push({ i: si, key: key, n: disp, c: s.c || 0 });
      }
      for (var x = 0; x < humans.length; x++) {
        for (var y = x + 1; y < humans.length; y++) {
          var A = humans[x], B = humans[y];
          var first = A.key < B.key ? A : B, second = A.key < B.key ? B : A;
          var pk = first.key + '|' + second.key;
          if (!riv[pk]) riv[pk] = { a: first.n, b: second.n, aw: 0, bw: 0 };
          riv[pk].a = first.n; riv[pk].b = second.n;
          var wKey = null;
          if (rec.win === A.i) wKey = A.key;
          else if (rec.win === B.i) wKey = B.key;
          else if (A.c !== B.c) wKey = (A.c > B.c) ? A.key : B.key;
          if (wKey === first.key) riv[pk].aw++;
          else if (wKey === second.key) riv[pk].bw++;
        }
      }
    }
    var rows = [];
    for (var k in lb) if (lb.hasOwnProperty(k)) rows.push(lb[k]);
    rows.sort(function (p, q) {
      var pw = p.played ? p.won / p.played : 0, qw = q.played ? q.won / q.played : 0;
      if (qw !== pw) return qw - pw;
      return q.won - p.won;
    });
    var html = '';
    if (rows.length) {
      html += '<table class="stats-table"><thead><tr><th>Player</th><th>P</th><th>W</th><th>Win%</th></tr></thead><tbody>';
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r], pct = row.played ? Math.round(100 * row.won / row.played) : 0;
        html += '<tr><td class="stats-name">' + avatarHtml(row.disp) + ' ' + esc(row.disp) + '</td><td>' + row.played +
                '</td><td>' + row.won + '</td><td>' + pct + '%</td></tr>';
      }
      html += '</tbody></table>';
    }
    var rk = [];
    for (var pk2 in riv) if (riv.hasOwnProperty(pk2)) rk.push(riv[pk2]);
    if (rk.length) {
      rk.sort(function (p, q) { return (q.aw + q.bw) - (p.aw + p.bw); });
      html += '<div class="stats-sub">Rivalries</div><ul class="stats-riv">';
      for (var ri = 0; ri < rk.length && ri < 8; ri++) {
        var v = rk[ri];
        var ra = roleForName(v.a), rb = roleForName(v.b);
        var la = avatarHtml(v.a) + ' ' + esc(v.a) + (ra ? ' <i class="ar-sib-chip">' + esc(ra) + '</i>' : '');
        var lb2 = avatarHtml(v.b) + ' ' + esc(v.b) + (rb ? ' <i class="ar-sib-chip">' + esc(rb) + '</i>' : '');
        html += '<li><span>' + la + '</span><b>' + v.aw + '&ndash;' + v.bw +
                '</b><span>' + lb2 + '</span></li>';
      }
      html += '</ul>';
    }
    html += '<div class="stats-danger"><div class="stats-danger-label">⚠ Danger zone</div>' +
            '<button type="button" class="stats-reset stats-reset-btn">Erase all scores</button></div>';
    body.innerHTML = html;
    var rb = body.querySelector('.stats-reset-btn');
    if (rb) rb.onclick = function () {
      if (window.confirm('Erase ALL Arena scores on this device? This cannot be undone.')) {
        lsSet(LS_GAMES, []);
        renderStats();
      }
    };
  }
  function renderStats() {
    renderStatsInto($('statsBody'));
    renderStatsInto($('statsBodyGame'));
    renderSibUI();
  }

  // Victory boasts — winner picks one of three (YDKJ host energy, family-safe)
  var WIN_LINES = [
    'King of the mountain. Bow, bank, or both.',
    'That wasn\'t luck — that was pure summit science.',
    'I climbed. You watched. Roll credits.',
    'Three summits. Zero sympathy. Next customer!',
    'The dice liked me better. Fact-check that.',
    'Call the papers: another legend is born (it\'s me).',
    'You brought strategy. I brought the trophy.',
    'Survey says… I win. Ding ding ding!',
    'Please hold your applause until I\'ve finished gloating.',
    'Bank early? That\'s adorable. I banked last — and best.',
    'The towers have spoken. They said my name. Twice.',
    'Sibling note: this one goes on the fridge.',
    'I\'d say good game, but I\'m still high on altitude.',
    'Your climb was educational. Mine was victorious.',
    'Insert coin to congratulate the champion.',
    'Math is hard. Winning is easy. For some of us.',
    'That scoreboard is not a suggestion. It\'s a story about me.',
    'Pass the tablet — I need a better angle for my victory pose.',
    'Greed paid off. I\'m writing a self-help book.',
    'You almost had it! Psych. I had it.',
    'Error 200: victory successful.',
    'The house always wins… and today I am the house.',
    'Climb complete. Ego inflated. Feelings optional.',
    'I came, I rolled, I claimed three summits. Classic me.'
  ];
  function pickThreeWinLines() {
    var bag = WIN_LINES.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
    }
    return bag.slice(0, 3);
  }

  function setConn(on, text) {
    $('connDot').className = 'ar-dot' + (on ? ' on' : '');
    $('connText').textContent = text;
  }
  function setErr(msg) { $('errLine').textContent = msg || ''; }
  function send(o) {
    try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch (e) {}
  }

  // Soft toast for brief dropouts / back-online (doesn't yank the board away)
  var toastT = null;
  function toast(msg, kind) {
    var el = document.getElementById('arToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'arToast';
      el.className = 'ar-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.className = 'ar-toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    el.hidden = false;
    el.style.opacity = '1';
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.hidden = true; }, 280);
    }, 3200);
  }

  // Family pair flags (device-local) — Big Bro / Lil Sis / Ma / Pa / …
  var LS_SIB = 'sa_sib_v1';
  function getSibs() {
    var s = lsGet(LS_SIB, []);
    return (s instanceof Array) ? s : [];
  }
  function setSibs(list) { lsSet(LS_SIB, list); }
  function sibKey(a, b) {
    var x = String(a || '').toLowerCase(), y = String(b || '').toLowerCase();
    return x < y ? x + '|' + y : y + '|' + x;
  }
  function roleForName(name) {
    var n = String(name || '').toLowerCase();
    var list = getSibs();
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (String(s.a).toLowerCase() === n) return s.aRole;
      if (String(s.b).toLowerCase() === n) return s.bRole;
    }
    return null;
  }

  // Per-name emoji avatars — local cache + session memory; server is source of truth online
  var LS_AVATAR = 'sa_avatar_v1';
  var AVATAR_POOL = [
    '🙂', '😎', '🦊', '🐱', '🐶', '🦁', '🐯', '🐸', '🐵', '🐼',
    '🦄', '🐲', '🌟', '🔥', '⚡', '🎮', '🚀', '🏆', '🍕', '🍩',
    '🌈', '🧊', '🎯', '🎲', '👾', '🤖', '👑', '💎', '🌊', '🍀'
  ];
  var DEFAULT_AV = '🙂';
  // Session memory (faster + survives mid-game when party is cleared)
  var avatarMem = {};
  var gameSeats = null; // last gameStart seats (with avatars)

  function isDefaultAv(a) {
    a = String(a || '').trim();
    return !a || a === DEFAULT_AV || a === '🤖';
  }
  function getAvatarMap() {
    var m = lsGet(LS_AVATAR, {});
    return (m && typeof m === 'object') ? m : {};
  }
  function setAvatarMap(m) { lsSet(LS_AVATAR, m); }
  function setAvatarFor(name, emoji) {
    var k = String(name || '').trim().toLowerCase();
    if (!k || isDefaultAv(emoji)) return;
    avatarMem[k] = emoji;
    var m = getAvatarMap();
    if (m[k] !== emoji) {
      m[k] = emoji;
      setAvatarMap(m);
    }
  }
  function avatarFor(name) {
    var k = String(name || '').trim().toLowerCase();
    if (!k) return DEFAULT_AV;
    if (avatarMem[k] && !isDefaultAv(avatarMem[k])) return avatarMem[k];
    var m = getAvatarMap();
    if (m[k] && !isDefaultAv(m[k])) {
      avatarMem[k] = m[k];
      return m[k];
    }
    // Prefer server lobby avatar when we know this person is online
    for (var i = 0; i < lobbyPlayers.length; i++) {
      var p = lobbyPlayers[i];
      if (p && p.alias && String(p.alias).toLowerCase() === k &&
          p.avatar && !isDefaultAv(p.avatar)) {
        setAvatarFor(k, p.avatar);
        return p.avatar;
      }
    }
    // Party members (table)
    if (myParty && myParty.members) {
      for (var j = 0; j < myParty.members.length; j++) {
        var mm = myParty.members[j];
        if (mm && mm.alias && String(mm.alias).toLowerCase() === k &&
            mm.avatar && !isDefaultAv(mm.avatar)) {
          setAvatarFor(k, mm.avatar);
          return mm.avatar;
        }
      }
    }
    // In-game seats from gameStart
    if (gameSeats) {
      for (var g = 0; g < gameSeats.length; g++) {
        var gs = gameSeats[g];
        if (gs && gs.human && gs.name && String(gs.name).toLowerCase() === k &&
            gs.avatar && !isDefaultAv(gs.avatar)) {
          setAvatarFor(k, gs.avatar);
          return gs.avatar;
        }
      }
    }
    return DEFAULT_AV;
  }
  /** Avatar for a lobby/party/game player object (server non-default wins, then cache). */
  function avatarForPlayer(p) {
    if (!p) return DEFAULT_AV;
    var name = p.alias || p.name || '';
    var serverAv = p.avatar;
    if (serverAv && !isDefaultAv(serverAv)) {
      if (name) setAvatarFor(name, serverAv);
      return serverAv;
    }
    return avatarFor(name);
  }
  /** Remember faces from any list so they show online, at table, and in-game. */
  function learnAvatarsFromList(list) {
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p) continue;
      var name = p.alias || p.name;
      var av = p.avatar;
      if (name && av && !isDefaultAv(av)) setAvatarFor(name, av);
    }
  }
  function ensureMyAvatarOnServer() {
    var me = myAlias();
    var want = avatarFor(me);
    if (!me || isDefaultAv(want)) return;
    var have = null;
    if (myParty && myParty.members) {
      for (var i = 0; i < myParty.members.length; i++) {
        if (myParty.members[i].id === youId) { have = myParty.members[i].avatar; break; }
      }
    }
    if (have == null) {
      for (var j = 0; j < lobbyPlayers.length; j++) {
        if (lobbyPlayers[j].id === youId) { have = lobbyPlayers[j].avatar; break; }
      }
    }
    if (have !== want) send({ t: 'setAvatar', avatar: want });
  }
  function hasChosenAvatar(name) {
    var k = String(name || '').toLowerCase();
    if (!k) return false;
    if (avatarMem[k] && !isDefaultAv(avatarMem[k])) return true;
    var m = getAvatarMap();
    return Object.prototype.hasOwnProperty.call(m, k) && !isDefaultAv(m[k]);
  }
  function avatarHtml(name, cls, emojiOverride) {
    var em = emojiOverride != null ? emojiOverride : avatarFor(name);
    if (isDefaultAv(em) && name) em = avatarFor(name);
    return '<span class="ar-avatar' + (cls ? ' ' + cls : '') + '" title="' + esc(name || '') + '">' +
      em + '</span>';
  }
  var avatarPickOpen = false; // force-show after tap on preview
  function renderAvatarPicker() {
    var wrap = $('avatarPick');
    var lab = $('avatarPickLabel');
    if (!wrap) return;
    var me = myAlias() || '';
    var cur = avatarFor(me);
    var chosen = hasChosenAvatar(me);
    if ($('myAvatarPreview')) {
      $('myAvatarPreview').textContent = cur;
      $('myAvatarPreview').title = chosen
        ? 'Your avatar — tap to change'
        : 'Pick an avatar';
    }
    // Hide grid once selected (unless user re-opened it)
    if (chosen && !avatarPickOpen) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      if (lab) {
        lab.hidden = false;
        lab.textContent = 'Avatar locked in — tap your face to change';
        lab.style.color = '#8b9bb4';
      }
      return;
    }
    wrap.hidden = false;
    if (lab) {
      lab.hidden = false;
      lab.textContent = chosen ? 'Pick a new avatar' : 'Pick an avatar';
      lab.style.color = '';
    }
    wrap.innerHTML = '';
    AVATAR_POOL.forEach(function (em) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ar-avatar-btn' + (em === cur ? ' on' : '');
      b.textContent = em;
      b.title = 'Pick ' + em;
      b.onclick = function () {
        // Auto-save name from input if needed so face sticks to the real name
        var typed = (($('aliasInput') && $('aliasInput').value) || '').trim().slice(0, 18);
        var name = myAlias() || typed;
        if (!name) {
          setErr('Save a name first, then pick an avatar.');
          toast('Save your name first, then pick an avatar.', 'warn');
          return;
        }
        if (typed && typed !== myAlias()) {
          setAlias(typed);
          rememberAlias(typed);
          name = typed;
          if ($('aliasInput')) $('aliasInput').value = typed;
        }
        setAvatarFor(name, em);
        avatarPickOpen = false; // collapse after pick
        if ($('myAvatarPreview')) $('myAvatarPreview').textContent = em;
        // Sync name+face so server durable map + all devices match
        send({ t: 'setAlias', alias: name, avatar: em });
        send({ t: 'setAvatar', avatar: em });
        renderAvatarPicker();
        renderLobby();
        toast('Avatar set to ' + em + ' for ' + name, 'ok');
      };
      wrap.appendChild(b);
    });
  }
  function wireAvatarPreview() {
    var prev = $('myAvatarPreview');
    if (!prev || prev._avatarWired) return;
    prev._avatarWired = true;
    prev.onclick = function () {
      var me = myAlias() || '';
      if (!me) {
        toast('Save your name first, then pick an avatar.', 'warn');
        return;
      }
      avatarPickOpen = !avatarPickOpen;
      if (!hasChosenAvatar(me)) avatarPickOpen = true;
      renderAvatarPicker();
    };
  }

  function isSiblingStyleRole(role) {
    var r = String(role || '').toLowerCase();
    return r === 'big bro' || r === 'lil bro' || r === 'big sis' || r === 'lil sis' ||
      r === 'ma' || r === 'pa' || r === 'twin' || r === 'cousin';
  }
  function isFriendPair(s) {
    return String(s.aRole || '') === 'Friend' && String(s.bRole || '') === 'Friend';
  }
  function untagBlockedMessage(s) {
    var roles = [s.aRole, s.bRole].filter(Boolean);
    var label = roles.length ? roles.join(' / ') : 'sibling';
    return 'Go see your parents and tell them why you want to untag this ' + label + '.';
  }

  function renderSibUI() {
    var list = getSibs();
    var ul = $('sibList');
    if (ul) {
      ul.innerHTML = '';
      if (!list.length) {
        ul.innerHTML = '<li class="ar-empty" style="border:none;font-size:0.75rem;">No pairs flagged yet — totally fine. Tags are optional.</li>';
      } else {
        list.forEach(function (s, idx) {
          var li = document.createElement('li');
          var friendOnly = isFriendPair(s);
          // Friends can be removed; family/sibling-style tags need parents.
          var untagBtn = friendOnly
            ? '<button type="button" class="btn-ar" data-sib-x="' + idx + '" data-sib-friend="1" style="padding:0.15rem 0.4rem;font-size:0.7rem;margin-left:0.35rem;" title="Remove friend tag">✕</button>'
            : '<button type="button" class="btn-ar" data-sib-x="' + idx + '" data-sib-locked="1" style="padding:0.15rem 0.4rem;font-size:0.7rem;margin-left:0.35rem;" title="Sibling tags need a parent">✕</button>';
          li.innerHTML =
            '<span>' + avatarHtml(s.a) + ' ' + esc(s.a) + ' <i class="ar-sib-chip">' + esc(s.aRole) + '</i></span>' +
            '<b>vs</b>' +
            '<span>' + avatarHtml(s.b) + ' ' + esc(s.b) + ' <i class="ar-sib-chip">' + esc(s.bRole) + '</i> ' +
            untagBtn + '</span>';
          ul.appendChild(li);
        });
        ul.querySelectorAll('[data-sib-x]').forEach(function (btn) {
          btn.onclick = function () {
            var i = parseInt(btn.getAttribute('data-sib-x'), 10);
            var next = getSibs();
            var pair = next[i];
            if (!pair) return;
            // Sibling / family tags: cannot self-untag
            if (btn.getAttribute('data-sib-locked') === '1' ||
                (!isFriendPair(pair) && (isSiblingStyleRole(pair.aRole) || isSiblingStyleRole(pair.bRole)))) {
              var msg = untagBlockedMessage(pair);
              setErr(msg);
              toast(msg, 'warn');
              window.alert(msg);
              return;
            }
            // Friend–Friend pairs may be removed
            next.splice(i, 1);
            setSibs(next);
            setErr('');
            toast('Friend tag removed.', 'ok');
            renderSibUI();
            renderStats();
          };
        });
      }
    }
    // Opponents only — never yourself; empty selection by default
    var me = (myAlias() || '').trim();
    var opp = opponentsForTagging();
    var meLabel = $('sibMeLabel');
    if (meLabel) {
      meLabel.innerHTML = me
        ? ('Tagging as <strong>' + esc(me) + '</strong> — pick someone else below (optional).')
        : '<span style="color:#e05555;">Save your name above first</span>';
    }
    var sel = $('sibB');
    if (sel) {
      var cur = sel.value;
      // Drop selection if it is you or gone from list
      if (cur && me && cur.toLowerCase() === me.toLowerCase()) cur = '';
      if (cur && opp.indexOf(cur) === -1) cur = '';
      sel.innerHTML = '';
      var ph = document.createElement('option');
      ph.value = '';
      ph.textContent = !me
        ? '— save your name first —'
        : (!opp.length ? '— play someone first —' : '— nobody (pick to tag) —');
      sel.appendChild(ph);
      opp.forEach(function (n) {
        if (me && n.toLowerCase() === me.toLowerCase()) return;
        var o = document.createElement('option');
        o.value = n;
        o.textContent = n + (avatarFor(n) !== '🙂' ? ' ' + avatarFor(n) : '');
        sel.appendChild(o);
      });
      sel.value = cur || '';
    }
  }

  /** Names of humans you've shared a finished Arena game with (excludes you + placeholders). */
  function opponentsForTagging() {
    var me = (myAlias() || '').trim().toLowerCase();
    var map = {};
    getGames().forEach(function (g) {
      var humans = (g.seats || []).filter(function (s) {
        return s.h && cleanDisplayName(s.n);
      });
      if (!humans.length) return;
      var meIn = me && humans.some(function (h) { return h.n.toLowerCase() === me; });
      // Only count games you were in (if we know who "you" are)
      if (me && !meIn) return;
      humans.forEach(function (h) {
        var n = cleanDisplayName(h.n);
        if (!n) return;
        if (me && n.toLowerCase() === me) return;
        map[n] = 1;
      });
    });
    // Also anyone else currently online (friends about to play)
    lobbyPlayers.forEach(function (p) {
      var n = cleanDisplayName(p.alias);
      if (!n) return;
      if (me && n.toLowerCase() === me) return;
      map[n] = 1;
    });
    return Object.keys(map).sort(function (a, b) { return a.localeCompare(b); });
  }

  function flagSiblingPair() {
    var me = (myAlias() || '').trim();
    var b = ($('sibB') && $('sibB').value) || '';
    var aRole = ($('sibRoleA') && $('sibRoleA').value) || 'Friend';
    var bRole = ($('sibRoleB') && $('sibRoleB').value) || 'Friend';
    var a = me;
    // Never tag yourself
    if (b && me && b.toLowerCase() === me.toLowerCase()) {
      setErr('Pick someone else — you can\'t flag yourself.');
      toast('Pick someone else to flag.', 'warn');
      return;
    }
    if (!a) {
      setErr('Save your name first, then flag someone you\'ve played.');
      return;
    }
    if (!b || a.toLowerCase() === b.toLowerCase()) {
      setErr('Pick someone you\'ve played against (optional — tags not required).');
      return;
    }
    // Replacing an existing family/sibling pair is treated like untag + retag → parent gate
    var list = getSibs();
    var existing = null;
    for (var i = 0; i < list.length; i++) {
      if (sibKey(list[i].a, list[i].b) === sibKey(a, b)) { existing = list[i]; break; }
    }
    if (existing && !isFriendPair(existing) &&
        (isSiblingStyleRole(existing.aRole) || isSiblingStyleRole(existing.bRole))) {
      var msg = untagBlockedMessage(existing);
      setErr(msg);
      toast(msg, 'warn');
      window.alert(msg);
      return;
    }
    list = list.filter(function (s) { return sibKey(s.a, s.b) !== sibKey(a, b); });
    list.unshift({ a: a, b: b, aRole: aRole, bRole: bRole, t: Date.now() });
    if (list.length > 40) list = list.slice(0, 40);
    setSibs(list);
    setErr('');
    toast(aRole + ' ' + a + ' · ' + bRole + ' ' + b + ' — saved on this device.', 'ok');
    renderSibUI();
    renderStats();
  }

  function connect() {
    if (reconnectT) { clearTimeout(reconnectT); reconnectT = null; }
    if (ws) {
      try {
        intentionalClose = true;
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        if (ws.readyState === 0 || ws.readyState === 1) ws.close();
      } catch (e) {}
      ws = null;
      intentionalClose = false;
    }
    stopPing();
    var host = WS_URL.replace(/^wss?:\/\//, '');
    setConn(false, reconnectAttempt ? ('reconnecting… · ' + host) : ('connecting… · ' + host));
    try { ws = new WebSocket(WS_URL); }
    catch (e) { setConn(false, 'offline · bad server URL'); scheduleReconnect(); return; }

    ws.onopen = function () {
      var wasRe = reconnectAttempt > 0 || everConnected;
      everConnected = true;
      reconnectAttempt = 0;
      setConn(true, 'online · ' + host);
      setErr('');
      if (wasRe) toast('Back online — brief dropouts are normal on tablets.', 'ok');
      var helloName = myAlias() || 'Player';
      send({ t: 'hello', alias: helloName, avatar: avatarFor(helloName) });
      startPing();
    };
    ws.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      handle(m);
    };
    ws.onclose = function () {
      if (intentionalClose) return;
      stopPing();
      var host2 = WS_URL.replace(/^wss?:\/\//, '');
      setConn(false, (everConnected ? 'disconnected' : 'can\'t reach server') + ' · ' + host2);
      if (everConnected) {
        toast(inGame
          ? 'Connection blip — reconnecting. Stay on this screen if you can.'
          : 'Connection dropped — reconnecting…', 'warn');
      }
      if (inGame) {
        try { setStatus('Connection blip — reconnecting… (hang tight)', ''); } catch (e) {}
      }
      scheduleReconnect();
    };
    ws.onerror = function () {};
  }

  function scheduleReconnect() {
    if (reconnectT) return;
    reconnectAttempt = Math.min(reconnectAttempt + 1, 8);
    var delay = Math.min(20000, 1200 + reconnectAttempt * 1400);
    setConn(false, 'retry in ' + Math.round(delay / 1000) + 's · ' + WS_URL.replace(/^wss?:\/\//, ''));
    reconnectT = setTimeout(function () { reconnectT = null; connect(); }, delay);
  }

  function startPing() {
    stopPing();
    // App-level heartbeat keeps mobile + Fly proxy from timing out idle WS
    pingT = setInterval(function () {
      if (ws && ws.readyState === 1) send({ t: 'ping' });
    }, 12000);
  }
  function stopPing() {
    if (pingT) { clearInterval(pingT); pingT = null; }
  }

  function handle(m) {
    switch (m.t) {
      case 'welcome':
        youId = m.youId;
        $('meLine').textContent = m.alias ? ('playing as ' + m.alias) : '';
        // Server may restore a durable face for this name — learn it
        if (m.alias && m.avatar && !isDefaultAv(m.avatar)) {
          setAvatarFor(m.alias, m.avatar);
        }
        // Always re-push our local pick so durable map + other tablets stay in sync
        ensureMyAvatarOnServer();
        renderAvatarPicker();
        break;
      case 'lobby':
        lobbyPlayers = m.players || [];
        lobbyParties = m.parties || [];
        learnAvatarsFromList(lobbyPlayers);
        lobbyParties.forEach(function (pp) { learnAvatarsFromList(pp.members); });
        // Keep myParty in sync if we're listed
        if (myParty) {
          var found = null;
          for (var i = 0; i < lobbyParties.length; i++) {
            if (lobbyParties[i].id === myParty.id) { found = lobbyParties[i]; break; }
          }
          myParty = found;
        }
        ensureMyAvatarOnServer();
        renderLobby();
        break;
      case 'party':
        myParty = m.party;
        if (myParty && myParty.members) learnAvatarsFromList(myParty.members);
        ensureMyAvatarOnServer();
        if (m.request && myParty && String(myParty.hostId) === String(youId) &&
            m.request.type && m.request.fromId) {
          var rq = m.request;
          if (rq.type === 'bots') {
            toast((rq.fromAlias || 'Guest') + ' asks for ' + rq.bots +
              ' Rival' + (rq.bots === 1 ? '' : 's'), 'ok');
          } else if (rq.type === 'start') {
            toast((rq.fromAlias || 'Guest') + ' wants to start — accept to play', 'ok');
          }
        }
        if (m.requestDeclined && myParty && String(myParty.hostId) !== String(youId)) {
          toast((m.byAlias || 'Host') + ' said not yet', 'warn');
        }
        renderLobby();
        break;
      case 'partyRequestSent':
        if (m.msg) toast(m.msg, 'ok');
        break;
      case 'partyRequestResult':
        if (m.msg) toast(m.msg, m.accept ? 'ok' : 'warn');
        break;
      case 'invited':
        showInvite(m);
        break;
      case 'inviteDeclined':
        setErr((m.byAlias || 'Player') + ' declined.');
        break;
      case 'inviteCancelled':
        hideInvite();
        break;
      case 'gameStart':
        mySeat = m.seatIndex;
        hostId = m.hostId || null;
        hideInvite();
        hideWin();
        if ($('saveOverlay')) $('saveOverlay').hidden = true;
        inGame = true;
        myParty = null;
        lastGameOver = null;
        gameSeats = m.seats || null;
        matchAssistPolicy = m.assistPolicy === 'table' ? 'table' : 'player';
        matchAssistMode = (m.assistMode === 'coach' || m.assistMode === 'guide') ? m.assistMode : 'solo';
        learnAvatarsFromList(gameSeats);
        // Re-assert face once more at match start (covers late picks)
        ensureMyAvatarOnServer();
        showGame({ resumed: !!m.resumed, saveLabel: m.saveLabel });
        break;
      case 'state':
        curState = m.state;
        if (curState && curState.players) learnAvatarsFromList(curState.players);
        if (bustHideT) {
          clearTimeout(bustHideT); bustHideT = null;
          $('bustOverlay').hidden = true;
        }
        renderGame();
        break;
      case 'bust':
        showBust(m);
        break;
      case 'gameOver':
        onGameOver(m);
        break;
      case 'victoryTaunt':
        onVictoryTaunt(m);
        break;
      case 'opponentLeft':
        setStatus((m.byAlias ? esc(m.byAlias) + ' left' : 'Someone left') + ' — table closed.', '');
        toast(
          (m.byAlias || 'A player') +
          (m.reason === 'saved' ? ' paused the game.' : ' left the table (or lost connection).'),
          m.reason === 'saved' ? 'ok' : 'bad'
        );
        inGame = false;
        hideWin();
        setTimeout(showLobby, 1800);
        break;
      case 'saves':
        mySaves = m.saves || [];
        renderSaves();
        break;
      case 'gameSaved':
        toast('Saved: “' + (m.label || 'Paused') + '” — resume later from Saved games.', 'ok');
        inGame = false;
        hideWin();
        if ($('saveOverlay')) $('saveOverlay').hidden = true;
        showLobby();
        send({ t: 'listSaves' });
        break;
      case 'rageQuit':
        rageCount = m.count | 0;
        renderRage();
        toast(m.msg || 'Rage quit counted.', 'bad');
        break;
      case 'rageStats':
        rageCount = m.count | 0;
        renderRage();
        break;
      case 'error':
        setErr(m.msg || 'Something went wrong');
        toast(m.msg || 'Something went wrong', 'warn');
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  function renderRage() {
    var el = $('rageBody');
    if (!el) return;
    if (!rageCount) {
      el.innerHTML = 'No rage quits on record. Stay classy.';
      el.style.color = '#6fcf97';
      return;
    }
    el.style.color = '#e7ecf3';
    el.innerHTML =
      '<strong style="color:#e05555;">Rage quitometer: ' + rageCount + '</strong><br>' +
      (rageCount === 1
        ? 'You left a game without saving while you were losing. Chill.'
        : rageCount + ' times you left without saving while losing… stop rage quitting!');
  }

  function renderSaves() {
    var ul = $('savesList');
    if (!ul) return;
    ul.innerHTML = '';
    if (!mySaves.length) {
      ul.innerHTML = '<li class="ar-empty">Nothing parked yet. In a match, tap <b>Pause</b>.</li>';
      return;
    }
    mySaves.forEach(function (sv) {
      var li = document.createElement('li');
      var when = sv.t ? new Date(sv.t).toLocaleString() : '';
      var miss = (sv.missing && sv.missing.length)
        ? ('waiting: ' + sv.missing.join(', '))
        : 'all online';
      var left = document.createElement('div');
      left.innerHTML =
        '<span class="ar-pname">' + esc(sv.label || 'Paused') + '</span> ' +
        '<span class="ar-pstatus ' + (sv.ready ? 'idle' : 'party') + '">' + esc(miss) + '</span>' +
        '<div style="font-size:0.72rem;color:#8b9bb4;margin-top:0.15rem;">' +
        esc((sv.humans || []).join(' · ')) +
        (when ? ' · ' + esc(when) : '') + '</div>';
      var actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '0.35rem';
      var btn = document.createElement('button');
      btn.className = 'btn-ar primary';
      btn.type = 'button';
      btn.textContent = sv.ready ? 'Resume' : 'Need players';
      btn.disabled = !sv.ready;
      btn.onclick = function () {
        setErr('');
        send({ t: 'resumeSave', saveId: sv.id });
      };
      var del = document.createElement('button');
      del.className = 'btn-ar warn';
      del.type = 'button';
      del.textContent = '✕';
      del.title = 'Delete save';
      del.onclick = function () {
        if (window.confirm('Delete save “' + (sv.label || '') + '”?')) {
          send({ t: 'deleteSave', saveId: sv.id });
        }
      };
      actions.appendChild(btn);
      actions.appendChild(del);
      li.appendChild(left);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  // ── Lobby ──
  function showLobby() {
    inGame = false;
    $('gameView').hidden = true;
    $('lobbyView').hidden = false;
    renderLobby();
    renderSaves();
    renderRage();
  }

  /** Unique humans for "Who's online" — server may still briefly list reconnect ghosts. */
  function uniqueOnlinePeople() {
    var byAlias = {};
    var order = [];
    lobbyPlayers.forEach(function (p) {
      var k = String(p.alias || '').trim().toLowerCase();
      if (!k) return;
      var prev = byAlias[k];
      if (!prev) {
        byAlias[k] = p;
        order.push(k);
        return;
      }
      // Prefer our live youId, then non-idle (in party / game) over pure idle ghosts
      var score = function (x) {
        var s = 0;
        if (x.id === youId) s += 100;
        if (x.status === 'playing' || x.status === 'party') s += 10;
        if (x.status === 'inviting' || x.status === 'invited') s += 5;
        if (x.avatar && x.avatar !== '🙂') s += 1;
        return s;
      };
      if (score(p) >= score(prev)) byAlias[k] = p;
    });
    return order.map(function (k) { return byAlias[k]; });
  }

  function renderLobby() {
    var unique = uniqueOnlinePeople();
    var me = null;
    for (var i = 0; i < unique.length; i++) {
      if (unique[i].id === youId) { me = unique[i]; break; }
    }
    // Fallback: server may not have you yet, or id mismatch mid-reconnect
    if (!me) {
      for (var j = 0; j < lobbyPlayers.length; j++) {
        if (lobbyPlayers[j].id === youId) { me = lobbyPlayers[j]; break; }
      }
    }
    if (me) {
      $('meLine').textContent = 'playing as ' + me.alias +
        (me.status && me.status !== 'idle' ? ' · ' + me.status : '') +
        ' · ' + unique.length + ' online';
    }

    // My table panel — host UI vs guest UI must never both show
    var atTable = !!(myParty && myParty.members && myParty.members.length);
    var hc = $('hostControls');
    var gc = $('guestControls');
    var reqBox = $('hostRequestBox');
    function showEl(el, on) {
      if (!el) return;
      el.hidden = !on;
    }
    $('myTableCard').hidden = !atTable;
    $('openActions').hidden = atTable;
    if (!atTable) {
      showEl(hc, false);
      showEl(gc, false);
      showEl(reqBox, false);
    } else {
      // Strict string compare — hostId / youId must match for host chrome
      var isHost = String(myParty.hostId || '') === String(youId || '') && !!youId;
      // Real pending request only (not empty junk)
      var req = myParty.pendingRequest;
      if (!req || typeof req !== 'object' || !req.type || !req.fromId) req = null;

      learnAvatarsFromList(myParty.members);
      var names = myParty.members.map(function (m) {
        var tag = String(m.id) === String(myParty.hostId) ? ' (host)' : '';
        var you = String(m.id) === String(youId) ? ' ★' : '';
        var role = roleForName(m.alias);
        return avatarHtml(m.alias, '', avatarForPlayer(m)) + ' ' + esc(m.alias) +
          (role ? ' <i class="ar-sib-chip">' + esc(role) + '</i>' : '') + tag + you;
      }).join(' · ');
      // freeSeats = seats not taken by humans (can be Rivals or left empty)
      var freeSeats = Math.max(0, MAX_SEATS_UI - myParty.members.length);
      var openSeats = Math.max(0, freeSeats - (myParty.bots | 0));
      $('myTableTitle').textContent =
        'Table · ' + myParty.members.length + ' human' +
        (myParty.members.length === 1 ? '' : 's') +
        ' + ' + myParty.bots + ' Rival' + (myParty.bots === 1 ? '' : 's') +
        ' = ' + myParty.seats + '/5 seats' +
        (openSeats > 0 ? ' · ' + openSeats + ' empty' : '') +
        (isHost ? ' · you host' : ' · waiting on host');
      if ($('seatHint')) {
        $('seatHint').textContent =
          freeSeats + ' open seat' + (freeSeats === 1 ? '' : 's') + ' → Rivals 0–' + freeSeats;
      }
      $('myTableMembers').innerHTML = names || '…';

      // Mutually exclusive panels
      showEl(hc, isHost);
      showEl(gc, !isHost);
      // Host assist policy controls
      var pol = myParty.assistPolicy === 'table' ? 'table' : 'player';
      var amode = myParty.assistMode || 'solo';
      if (isHost) {
        if ($('tableAssistPolicy') && $('tableAssistPolicy').value !== pol) {
          $('tableAssistPolicy').value = pol;
        }
        if ($('tableAssistMode')) {
          $('tableAssistMode').value = amode;
          $('tableAssistMode').hidden = pol !== 'table';
        }
        if ($('tableAssistHint')) {
          $('tableAssistHint').textContent = pol === 'table'
            ? ('Whole table shares: ' + (ASSIST_BLURB[amode] || amode))
            : 'Each player uses their own assist (set under You). Default.';
        }
      } else if ($('guestTableSummary')) {
        // append assist note into guest summary later below
      }
      // Request bar: host only, and only when a guest actually asked
      showEl(reqBox, !!(isHost && req));
      if (isHost && req && reqBox) {
        var face = avatarHtml(req.fromAlias || '?', '', req.fromAvatar || avatarFor(req.fromAlias));
        var line = face + ' <b>' + esc(req.fromAlias || 'Guest') + '</b> ';
        if (req.type === 'bots') {
          line += 'asks for <b>' + (req.bots | 0) + '</b> Rival' +
            ((req.bots | 0) === 1 ? '' : 's');
        } else if (req.type === 'start') {
          line += 'wants to <b>start</b> (' + (myParty.bots | 0) + ' Rival' +
            ((myParty.bots | 0) === 1 ? '' : 's') + ')';
        } else {
          line += 'sent a table request';
        }
        if ($('hostRequestText')) $('hostRequestText').innerHTML = line;
        reqBox.setAttribute('data-req-id', req.id || '');
      } else if (reqBox) {
        reqBox.removeAttribute('data-req-id');
        if ($('hostRequestText')) {
          $('hostRequestText').textContent = 'Someone wants a change…';
        }
      }

      if (isHost) {
        var bc = $('botCount');
        fillBotSelect(bc, freeSeats, Math.min(myParty.bots, freeSeats), 0);
        // Host may start with 2+ humans, or 1 human + rivals
        if ($('btnStart')) {
          $('btnStart').disabled = myParty.members.length < 2 && myParty.bots < 1;
        }
      } else {
        var sum = $('guestTableSummary');
        if (sum) {
          var aNote = (myParty.assistPolicy === 'table')
            ? (' · assist for all: ' + (myParty.assistMode || 'solo'))
            : ' · each player picks their own assist';
          sum.textContent = 'Host sets the table · now ' + (myParty.bots | 0) +
            ' Rival' + ((myParty.bots | 0) === 1 ? '' : 's') +
            ' · ' + freeSeats + ' open seat' + (freeSeats === 1 ? '' : 's') +
            aNote +
            (req && String(req.fromId) === String(youId)
              ? ' · waiting on host…'
              : ' · ask below if you want a change');
        }
        var gba = $('guestBotAsk');
        if (gba) {
          fillBotSelect(gba, freeSeats, Math.min(myParty.bots, freeSeats), 0);
        }
        if ($('btnRequestBots')) {
          $('btnRequestBots').disabled = !!(req && String(req.fromId) === String(youId));
        }
        if ($('btnRequestStart')) {
          $('btnRequestStart').disabled =
            !!(req && String(req.fromId) === String(youId)) ||
            (myParty.members.length < 2 && myParty.bots < 1);
        }
      }
    }

    // Open parties list
    var pl = $('partyList');
    pl.innerHTML = '';
    var others = lobbyParties.filter(function (p) {
      return !myParty || p.id !== myParty.id;
    });
    if (!others.length) {
      pl.innerHTML = atTable
        ? ''
        : '<li class="ar-empty">No open tables. Create one and have siblings join.</li>';
    }
    others.forEach(function (p) {
      var hostName = '?';
      for (var j = 0; j < p.members.length; j++) {
        if (p.members[j].id === p.hostId) hostName = p.members[j].alias;
      }
      var li = document.createElement('li');
      var left = document.createElement('div');
      left.innerHTML =
        '<span class="ar-pname">' + esc(hostName) + '&rsquo;s table</span> ' +
        '<span class="ar-pstatus party">' + p.members.length + ' human' +
        (p.members.length === 1 ? '' : 's') + ' · ' + p.bots + ' rival' +
        (p.bots === 1 ? '' : 's') + '</span>';
      var btn = document.createElement('button');
      btn.className = 'btn-ar primary';
      btn.type = 'button';
      btn.textContent = 'Join';
      btn.disabled = !!(myParty) || p.members.length >= 5;
      btn.onclick = function () {
        setErr('');
        // Carry face onto the table so host sees the right avatar immediately
        send({
          t: 'joinParty',
          partyId: p.id,
          avatar: avatarFor(myAlias())
        });
      };
      li.appendChild(left);
      li.appendChild(btn);
      pl.appendChild(li);
    });

    // Online list (one row per name — reconnect zombies used to stack)
    var ul = $('playerList');
    ul.innerHTML = '';
    var people = unique.filter(function (p) { return p.id !== youId; });
    // Also hide any residual row with the same name as us (zombie of self)
    var meKey = me ? String(me.alias || '').trim().toLowerCase() : '';
    if (meKey) {
      people = people.filter(function (p) {
        return String(p.alias || '').trim().toLowerCase() !== meKey;
      });
    }
    if (!people.length) {
      ul.innerHTML = '<li class="ar-empty">Nobody else online yet. Open this page on another tablet.</li>';
      return;
    }
    people.forEach(function (p) {
      var li = document.createElement('li');
      var left = document.createElement('div');
      left.innerHTML =
        avatarHtml(p.alias, '', avatarForPlayer(p)) + ' ' +
        '<span class="ar-pname">' + esc(p.alias) + '</span> ' +
        (roleForName(p.alias) ? '<i class="ar-sib-chip">' + esc(roleForName(p.alias)) + '</i> ' : '') +
        '<span class="ar-pstatus ' + esc(p.status || 'idle') + '">' + esc(p.status || 'idle') + '</span>';
      li.appendChild(left);
      // Quick 1v1 = 2 humans; remaining seats (0–3) optional Rivals
      if (p.status === 'idle' && me && me.status === 'idle' && !myParty) {
        var btn = document.createElement('button');
        btn.className = 'btn-ar primary';
        btn.type = 'button';
        btn.textContent = 'Quick 1v1';
        btn.title = 'Head-to-head — open seats can be Rivals';
        btn.onclick = function () {
          setErr('');
          var qr = $('quickRivalCount');
          var n = qr ? (parseInt(qr.value, 10) || 0) : 0;
          n = Math.max(0, Math.min(3, n)); // 2 humans → 3 free seats
          var ap = ($('quickAssistPolicy') && $('quickAssistPolicy').value) || 'player';
          var am = ($('quickAssistMode') && $('quickAssistMode').value) || 'solo';
          send({
            t: 'invite',
            toId: p.id,
            bots: n,
            assistPolicy: ap,
            assistMode: am
          });
          var extra = n ? (' + ' + n + ' Rival' + (n === 1 ? '' : 's')) : ' (no Rivals)';
          var aExtra = ap === 'table' ? (', assist: ' + am) : ', each picks assist';
          setErr('1v1 challenge sent to ' + p.alias + extra + aExtra + '…');
          toast('1v1 sent to ' + p.alias + extra, 'ok');
        };
        li.appendChild(btn);
      }
      ul.appendChild(li);
    });
  }

  function showInvite(m) {
    $('inviteTitle').textContent = '1v1 from ' + m.fromAlias;
    var botTxt = (!m.bots || m.bots === 0)
      ? 'just you two — no Rivals'
      : (m.bots + ' Rival' + (m.bots > 1 ? 's' : '') + ' as well');
    var assistTxt = (m.assistPolicy === 'table')
      ? ('Shared assist: <b>' + esc(m.assistMode || 'solo') + '</b> for both.')
      : 'Each of you keeps your own assist (Solo / Coach / Guide).';
    $('inviteBody').innerHTML =
      '<b>' + esc(m.fromAlias) + '</b> wants a quick head-to-head &mdash; ' + botTxt + '.<br><br>' +
      assistTxt;
    $('inviteAccept').onclick = function () {
      send({ t: 'inviteResponse', fromId: m.fromId, accept: true });
      hideInvite();
    };
    $('inviteReject').onclick = function () {
      send({ t: 'inviteResponse', fromId: m.fromId, accept: false });
      hideInvite();
    };
    $('inviteOverlay').hidden = false;
  }
  function hideInvite() { $('inviteOverlay').hidden = true; }

  // ── Load screen (mask device lag on start / resume) ──
  var loadHideT = null;
  function showLoadScreen(title, sub) {
    var ov = $('loadOverlay');
    if (!ov) return;
    if ($('loadTitle')) $('loadTitle').textContent = title || 'Climbing the summit…';
    if ($('loadSub')) $('loadSub').textContent = sub || 'Syncing boards across devices';
    ov.hidden = false;
  }
  function hideLoadScreen() {
    var ov = $('loadOverlay');
    if (!ov) return;
    ov.hidden = true;
  }

  // ── Game ──
  function showGame(opts) {
    opts = opts || {};
    $('lobbyView').hidden = true;
    $('gameView').hidden = false;
    showLoadScreen(
      opts.resumed ? 'Resuming…' : 'Match starting…',
      opts.resumed
        ? ('Loading “' + (opts.saveLabel || 'paused game') + '”')
        : 'Syncing dice & towers — hang tight'
    );
    if (loadHideT) clearTimeout(loadHideT);
    // Brief hold so laggy tablets land on the same first frame more often
    loadHideT = setTimeout(function () {
      hideLoadScreen();
      setStatus(opts.resumed
        ? ('Resumed: <b>' + esc(opts.saveLabel || 'Paused game') + '</b>')
        : 'Game on!', 'mine');
      if (opts.resumed) toast('Welcome back — pick up where you left off.', 'ok');
      loadHideT = null;
    }, opts.resumed ? 1400 : 1600);
  }
  function setStatus(html, cls) {
    var el = $('status');
    el.className = 'ar-status ' + (cls || '');
    el.innerHTML = html;
  }
  function myTurn() {
    return curState && curState.current === mySeat &&
      curState.currentIsHuman && curState.winner == null;
  }

  function renderGame() {
    if (!curState) return;
    renderSeatBar();
    renderBoard();
    renderDice();
    renderControls();
  }

  // Rival pilots get distinct faces (not four identical robots)
  var RIVAL_FACE = {
    loom: '🧵', ember: '🔥', frost: '❄️', bolt: '⚡', drift: '🌊'
  };
  function rivalFace(p, seatMeta) {
    var pilot = (p && p.pilot) || (seatMeta && seatMeta.pilot) || '';
    if (pilot && pilot !== 'human' && RIVAL_FACE[pilot]) return RIVAL_FACE[pilot];
    var av = (p && p.avatar) || (seatMeta && seatMeta.avatar);
    if (av && av !== '🤖' && !isDefaultAv(av)) return av;
    // Fallback by pilot name label if server only sent name
    var nm = String((p && p.name) || '').toLowerCase();
    if (nm === 'loom') return '🧵';
    if (nm === 'ember') return '🔥';
    if (nm === 'frost') return '❄️';
    if (nm === 'bolt') return '⚡';
    if (nm === 'drift') return '🌊';
    return '🤖';
  }

  function renderSeatBar() {
    var bar = $('seatBar'); bar.innerHTML = '';
    curState.players.forEach(function (p, i) {
      var d = document.createElement('div');
      d.className = 'ar-seat' + (i === curState.current ? ' cur' : '') +
        (p.human ? ' ar-seat-human' : ' ar-seat-rival');
      var role = p.human ? roleForName(p.name) : null;
      var seatMeta = (gameSeats && gameSeats[i]) || null;
      var faceEm;
      var kindChip;
      if (!p.human) {
        faceEm = rivalFace(p, seatMeta);
        kindChip = '<i class="ar-kind-chip rival" title="CPU Rival">RIVAL</i>';
      } else {
        faceEm = avatarForPlayer(p);
        if (isDefaultAv(faceEm) && seatMeta) faceEm = avatarForPlayer(seatMeta);
        if (isDefaultAv(faceEm)) faceEm = avatarFor(p.name);
        kindChip = '<i class="ar-kind-chip human" title="Human">YOU</i>';
        // Only mark "YOU" on our seat; others get HUMAN
        if (i !== mySeat) kindChip = '<i class="ar-kind-chip human" title="Human">HUMAN</i>';
      }
      var face = '<span class="ar-avatar' + (p.human ? '' : ' ar-avatar-rival') +
        '" title="' + esc(p.human ? p.name : (p.name + ' · Rival')) + '">' + faceEm + '</span>';
      d.innerHTML =
        face +
        '<span class="ar-swatch" style="background:' + COL[i % COL.length] + '"></span>' +
        '<span class="ar-seat-meta">' +
          '<span class="ar-seat-name">' + esc(p.name) +
          (i === mySeat ? ' (you)' : '') + '</span> ' +
          kindChip +
          (role ? ' <i class="ar-sib-chip">' + esc(role) + '</i>' : '') +
        '</span>' +
        '<span class="ar-claims">' + p.claimed.length + '/3</span>';
      bar.appendChild(d);
    });
  }

  function effFloor(seat, s) {
    var base = curState.players[seat].floor[s] || 0;
    if (seat === curState.current) base = Math.max(base, curState.climbFloor[s] || 0);
    return base;
  }

  function renderBoard() {
    var board = $('board'); board.innerHTML = '';
    for (var s = 2; s <= 12; s++) {
      var col = document.createElement('div');
      col.className = 'ar-col' + ((s === 6 || s === 7 || s === 8) ? ' hot' : '');
      var claimedBy = curState.claimedGlobal[s];
      if (claimedBy === undefined) claimedBy = curState.claimedGlobal[String(s)];
      if (claimedBy !== undefined && claimedBy !== null) col.classList.add('tower-claimed');
      var stack = document.createElement('div'); stack.className = 'ar-stack';
      var h = H[s];
      for (var f = 1; f <= h; f++) {
        var fl = document.createElement('div'); fl.className = 'ar-floor';
        if (claimedBy !== undefined && claimedBy !== null) {
          var c = COL[claimedBy % COL.length];
          fl.style.background = c;
          fl.style.color = c;
          fl.classList.add('claimed-floor');
          if (f === h) fl.classList.add('top-claim');
        } else {
          var occ = [];
          for (var seat = 0; seat < curState.n; seat++) {
            if (effFloor(seat, s) >= f) occ.push(seat);
          }
          if (occ.length === 1) {
            fl.style.background = COL[occ[0] % COL.length];
            fl.style.color = COL[occ[0] % COL.length];
          } else if (occ.length > 1) {
            var pct = 100 / occ.length;
            occ.forEach(function (seat, k) {
              var st = document.createElement('div'); st.className = 'st';
              st.style.left = (k * pct) + '%'; st.style.width = pct + '%';
              st.style.background = COL[seat % COL.length];
              fl.appendChild(st);
            });
          }
          // Live climb (not banked yet) — ring the new floors
          var meFloor = (curState.players[curState.current] &&
            curState.players[curState.current].floor[s]) || 0;
          var climbTo = curState.climbFloor[s] || 0;
          if (curState.winner == null && climbTo >= f && meFloor < f &&
              curState.climbing && curState.climbing.indexOf(s) !== -1) {
            fl.classList.add('climb-ring');
          }
        }
        stack.appendChild(fl);
      }
      var lab = document.createElement('div'); lab.className = 'ar-collab';
      lab.textContent = s + (curState.climbing.indexOf(s) !== -1 ? '▲' : '');
      if (claimedBy !== undefined && claimedBy !== null) {
        lab.style.color = COL[claimedBy % COL.length];
        lab.style.fontWeight = '800';
      }
      col.appendChild(stack); col.appendChild(lab);
      board.appendChild(col);
    }
  }

  function renderDice() {
    var el = $('dice'); el.innerHTML = '';
    var vals = curState.dice || [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
      var d = document.createElement('div'); d.className = 'ar-die';
      d.textContent = vals[i] ? vals[i] : '·';
      el.appendChild(d);
    }
  }

  function renderControls() {
    var opts = $('opts'); opts.innerHTML = '';
    var roll = $('btnRoll'), bank = $('btnBank');
    var takeBtn = $('btnTakeHighlight');
    coachPickSig = null;
    if (takeBtn) { takeBtn.hidden = true; takeBtn.disabled = true; }
    var mine = myTurn();
    var curName = curState.players[curState.current]
      ? curState.players[curState.current].name : '';
    var assist = effectiveAssist();
    var mal = $('matchAssistLine');
    if (mal) {
      if (matchAssistPolicy === 'table') {
        mal.textContent = 'Table assist: ' + assist + ' — ' + (ASSIST_BLURB[assist] || '');
      } else {
        mal.textContent = 'Your assist: ' + assist + ' (each player chooses) — ' + (ASSIST_BLURB[assist] || '');
      }
    }

    if (curState.winner != null) {
      roll.disabled = true; bank.disabled = true; return;
    }
    if (!mine) {
      roll.disabled = true; bank.disabled = true;
      var waitOn = curState.currentIsHuman
        ? esc(curName)
        : (esc(curName) + ' (Rival)');
      setStatus('Waiting for <b>' + waitOn + '</b>…', '');
      return;
    }
    if (curState.phase === 'choose_pair' && curState.options) {
      var showCoach = assist === 'coach' || assist === 'guide';
      setStatus(
        showCoach
          ? 'Your climb — pick a pairing' + (assist === 'guide' ? ' (or Take highlight).' : ' (highlight = strong option).')
          : 'Your climb — pick a pairing.',
        'mine'
      );
      roll.disabled = true; bank.disabled = true;
      if (showCoach && curState.options.length) coachPickSig = curState.options[0].signature;
      curState.options.forEach(function (o, idx) {
        var b = document.createElement('button');
        b.className = 'ar-optbtn' + (showCoach && idx === 0 ? ' best' : '');
        b.type = 'button';
        b.innerHTML = esc(o.headline) +
          (showCoach && idx === 0
            ? '<span class="ar-opt-meta">coach highlight · strong legal climb</span>'
            : '<span class="ar-opt-meta">legal climb</span>');
        b.onclick = function () {
          send({ t: 'action', action: 'choose', signature: o.signature });
        };
        opts.appendChild(b);
      });
      if (takeBtn && assist === 'guide' && coachPickSig) {
        takeBtn.hidden = false;
        takeBtn.disabled = false;
      }
    } else if (curState.phase === 'need_roll') {
      setStatus('Your turn — <b>Roll</b> to climb.', 'mine');
      roll.disabled = false; bank.disabled = true;
    } else if (curState.phase === 'can_stop') {
      var live = curState.climbing.slice().sort(function (a, b) { return a - b; }).join(', ');
      setStatus('Climbing <b>' + live + '</b> — Roll again or Bank.', 'mine');
      roll.disabled = false; bank.disabled = false;
    } else if (curState.phase === 'busted') {
      roll.disabled = true; bank.disabled = true;
      setStatus('Bust — holding…', 'bust');
    } else {
      roll.disabled = true; bank.disabled = true;
    }
  }

  function showBust(m) {
    var dd = $('bustDice'); dd.innerHTML = '';
    (m.dice || []).forEach(function (v) {
      var d = document.createElement('div');
      d.className = 'ar-die'; d.textContent = v; dd.appendChild(d);
    });
    $('bustSmack').innerHTML =
      '<b>' + esc(m.byName || '') + '</b> busted &mdash; &ldquo;' +
      esc(m.smack || '') + '&rdquo;';
    $('bustOverlay').hidden = false;
    if (bustHideT) clearTimeout(bustHideT);
    bustHideT = setTimeout(function () {
      $('bustOverlay').hidden = true; bustHideT = null;
    }, 2400);
  }

  function hideWin() {
    var ov = $('winOverlay');
    if (ov) ov.hidden = true;
  }

  function onGameOver(m) {
    lastGameOver = m;
    hostId = m.hostId || hostId;
    var youWon = m.winnerSeat === mySeat;
    setStatus(
      youWon ? '🏆 You win!' : ('<b>' + esc(m.winnerName || 'Someone') + '</b> wins.'),
      youWon ? 'win' : ''
    );
    $('btnRoll').disabled = true;
    $('btnBank').disabled = true;
    inGame = true; // stay "in room" until rematch / leave
    recordArenaGame(m);
    showWinOverlay(m, youWon);
  }

  function showWinOverlay(m, youWon) {
    $('winTitle').textContent = youWon ? 'YOU WIN!' : 'GAME OVER';
    $('winHeadline').innerHTML = youWon
      ? 'Three summits. The table is yours.'
      : ('<b>' + esc(m.winnerName || 'Someone') + '</b> sealed three summits.');

    var pick = $('winTauntPick');
    var heard = $('winTauntHeard');
    var choices = $('winChoices');
    pick.hidden = true;
    heard.hidden = true;
    heard.innerHTML = '';
    choices.innerHTML = '';

    if (youWon) {
      pick.hidden = false;
      var lines = pickThreeWinLines();
      lines.forEach(function (line) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ar-taunt-btn';
        b.textContent = line;
        b.onclick = function () {
          send({ t: 'victoryTaunt', line: line });
          pick.hidden = true;
          heard.hidden = false;
          heard.innerHTML = 'You sent: &ldquo;' + esc(line) + '&rdquo;';
        };
        choices.appendChild(b);
      });
    } else {
      heard.hidden = false;
      heard.innerHTML = 'Waiting for the champion\'s victory line…';
    }

    var isHost = hostId && hostId === youId;
    $('btnPlayAgain').hidden = !isHost;
    $('btnPlayAgain').disabled = false;
    $('winOverlay').hidden = false;
  }

  function onVictoryTaunt(m) {
    var heard = $('winTauntHeard');
    var pick = $('winTauntPick');
    if (pick) pick.hidden = true;
    if (heard) {
      heard.hidden = false;
      heard.innerHTML =
        '<b>' + esc(m.fromName || 'Winner') + ':</b> &ldquo;' + esc(m.line || '') + '&rdquo;';
    }
    // If win overlay already closed, flash in status
    if ($('winOverlay').hidden) {
      setStatus(
        '<b>' + esc(m.fromName || 'Winner') + '</b>: &ldquo;' + esc(m.line || '') + '&rdquo;',
        'win'
      );
    }
  }

  // ── Wire UI ──
  function initAliasUI() {
    var input = $('aliasInput');
    input.value = myAlias();
    var dl = $('aliasList'); dl.innerHTML = '';
    getAliases().forEach(function (n) {
      var o = document.createElement('option'); o.value = n; dl.appendChild(o);
    });
    $('saveAlias').onclick = function () {
      var n = (input.value || '').trim().slice(0, 18);
      if (!n) return;
      var prev = myAlias();
      setAlias(n); rememberAlias(n); initAliasUI();
      // Keep avatar if renaming same person; if new name, keep last pick if any
      if (prev && prev.toLowerCase() !== n.toLowerCase()) {
        var prevAv = avatarFor(prev);
        if (prevAv && prevAv !== '🙂' && avatarFor(n) === '🙂') setAvatarFor(n, prevAv);
      }
      send({ t: 'setAlias', alias: n, avatar: avatarFor(n) });
      $('meLine').textContent = 'playing as ' + n;
      renderAvatarPicker();
      renderLobby();
    };
    wireAvatarPreview();
    renderAvatarPicker();
  }

  $('btnCreateTable').onclick = function () {
    setErr('');
    send({ t: 'createParty' });
  };
  if ($('btnSoloBot')) {
    $('btnSoloBot').onclick = function () {
      setErr('');
      var n = parseInt(($('soloBotCount') && $('soloBotCount').value) || '1', 10) || 1;
      n = Math.max(1, Math.min(4, n)); // 1 human + up to 4 rivals = 5 seats
      send({ t: 'soloBot', bots: n, assistMode: getPersonalAssist() });
      toast('Starting 1v' + n + ' vs Rival' + (n > 1 ? 's' : '') + '…', 'ok');
    };
  }
  function leaveTable() {
    setErr('');
    send({ t: 'leaveParty' });
    myParty = null;
    renderLobby();
  }
  $('btnLeaveTable').onclick = leaveTable;
  $('btnLeaveTable2').onclick = leaveTable;
  $('btnStart').onclick = function () {
    setErr('');
    send({ t: 'startParty' });
  };
  $('botCount').onchange = function () {
    // Host only — guests use Ask host
    if (myParty && String(myParty.hostId) === String(youId)) {
      send({ t: 'setPartyBots', bots: parseInt($('botCount').value, 10) || 0 });
    }
  };
  if ($('btnRequestBots')) {
    $('btnRequestBots').onclick = function () {
      if (!myParty || String(myParty.hostId) === String(youId)) return;
      setErr('');
      var n = parseInt(($('guestBotAsk') && $('guestBotAsk').value) || '0', 10) || 0;
      var free = myParty ? Math.max(0, MAX_SEATS_UI - myParty.members.length) : 4;
      n = Math.max(0, Math.min(free, n));
      send({ t: 'requestPartyBots', bots: n });
      toast('Asked host for ' + n + ' Rival' + (n === 1 ? '' : 's'), 'ok');
    };
  }
  if ($('btnRequestStart')) {
    $('btnRequestStart').onclick = function () {
      if (!myParty || String(myParty.hostId) === String(youId)) return;
      setErr('');
      send({ t: 'requestStart' });
      toast('Asked host to start', 'ok');
    };
  }
  function respondTableRequest(accept) {
    if (!myParty || String(myParty.hostId) !== String(youId) || !myParty.pendingRequest) return;
    setErr('');
    send({
      t: 'respondPartyRequest',
      requestId: myParty.pendingRequest.id,
      accept: !!accept
    });
  }
  if ($('btnAcceptRequest')) {
    $('btnAcceptRequest').onclick = function () { respondTableRequest(true); };
  }
  if ($('btnDeclineRequest')) {
    $('btnDeclineRequest').onclick = function () { respondTableRequest(false); };
  }

  $('btnRoll').onclick = function () {
    if (myTurn()) send({ t: 'action', action: 'roll' });
  };
  $('btnBank').onclick = function () {
    if (myTurn()) send({ t: 'action', action: 'stop' });
  };
  if ($('btnTakeHighlight')) {
    $('btnTakeHighlight').onclick = function () {
      if (!myTurn() || !coachPickSig) return;
      send({ t: 'action', action: 'choose', signature: coachPickSig });
    };
  }
  $('btnLeave').onclick = function () {
    if (inGame && !window.confirm(
      'Leave without saving?\n\n' +
      'If you are losing, this counts as a rage quit on the quitometer.\n' +
      'Use Save & pause if you need a break.'
    )) return;
    send({ t: 'leaveRoom' });
    inGame = false;
    hideWin();
    showLobby();
  };

  function openSaveOverlay() {
    if (!inGame) return;
    var inp = $('saveLabelInput');
    if (inp) inp.value = '';
    var more = document.querySelector('.ar-pause-more');
    if (more) more.open = false;
    $('saveOverlay').hidden = false;
  }
  function doSave(label) {
    // Empty / "Just pause" = no reason — still parks the match for everyone
    label = (label == null ? '' : String(label)).trim().slice(0, 40);
    if (!label) label = 'Paused';
    send({ t: 'saveGame', label: label });
    if ($('saveOverlay')) $('saveOverlay').hidden = true;
    toast(
      label === 'Paused'
        ? 'Paused — pick it up from Paused when you’re back.'
        : ('Paused · ' + label + ' — see you when you’re back.'),
      'ok'
    );
  }
  if ($('btnSaveGame')) {
    $('btnSaveGame').onclick = function () { openSaveOverlay(); };
  }
  if ($('btnSaveConfirm')) {
    $('btnSaveConfirm').onclick = function () {
      doSave($('saveLabelInput') ? $('saveLabelInput').value : '');
    };
  }
  if ($('btnSaveCancel')) {
    $('btnSaveCancel').onclick = function () {
      if ($('saveOverlay')) $('saveOverlay').hidden = true;
    };
  }
  // One-tap chips: reason optional, flex immediate
  document.querySelectorAll('#pauseChips [data-qsave], [data-qsave]').forEach(function (btn) {
    if (btn._pauseWired) return;
    btn._pauseWired = true;
    btn.onclick = function () {
      var v = btn.getAttribute('data-qsave');
      doSave(v == null ? '' : v);
    };
  });
  // Enter in custom note = pause
  if ($('saveLabelInput')) {
    $('saveLabelInput').onkeydown = function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        doSave($('saveLabelInput').value);
      }
    };
  }

  $('btnPlayAgain').onclick = function () {
    setErr('');
    $('btnPlayAgain').disabled = true;
    send({ t: 'rematch' });
  };
  $('btnWinDone').onclick = function () {
    hideWin();
    send({ t: 'leaveRoom' });
    inGame = false;
    lastGameOver = null;
    showLobby();
  };

  $('btnStatsInGame').onclick = function () {
    var panel = $('gameStatsPanel');
    if (!panel) return;
    var open = panel.hidden;
    panel.hidden = !open;
    if (open) {
      renderStatsInto($('statsBodyGame'));
      $('btnStatsInGame').textContent = 'Hide stats';
    } else {
      $('btnStatsInGame').textContent = 'Stats';
    }
  };

  if ($('btnSibFlag')) $('btnSibFlag').onclick = flagSiblingPair;

  // UI setup must never prevent the WebSocket from connecting
  try { initAliasUI(); } catch (e0) { try { console.warn('initAliasUI', e0); } catch (e) {} }
  try { populateSkinPicker(); } catch (e1) { try { console.warn('skin', e1); } catch (e) {} }
  try { wireAssistPickers(); } catch (eAssist) {}
  // Seat math: 5 total — rivals fill whatever humans leave open
  try {
    fillBotSelect($('botCount'), 4, 1, 0);
    fillBotSelect($('guestBotAsk'), 4, 1, 0);
    fillBotSelect($('soloBotCount'), 4, 1, 1);
    fillBotSelect($('quickRivalCount'), 3, 0, 0); // 1v1 → 3 free seats
  } catch (eBots) {}
  try { renderStats(); } catch (e2) {}
  try { renderRage(); } catch (e3) {}
  try { renderSaves(); } catch (e4) {}
  try { if (!myAlias() && $('aliasInput')) $('aliasInput').focus(); } catch (e5) {}
  try { connect(); } catch (e6) {
    try { setConn(false, 'connect failed — retrying…'); } catch (e7) {}
    try { scheduleReconnect(); } catch (e8) {}
  }
})();
