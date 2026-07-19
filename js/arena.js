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
  function recordArenaGame(m) {
    if (!m || !m.seats || m.winnerSeat == null) return;
    var seats = m.seats.map(function (s) {
      return { h: !!s.human, pilot: s.pilot || 'human', n: s.name || 'Player', c: s.claims || 0 };
    });
    pushGame({ t: Date.now(), seats: seats, win: m.winnerSeat, src: 'arena' });
    renderStats();
  }
  function renderStats() {
    var body = $('statsBody');
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
        var key = s.n.toLowerCase();
        if (!lb[key]) lb[key] = { disp: s.n, played: 0, won: 0 };
        lb[key].disp = s.n;
        lb[key].played++;
        if (si === rec.win) lb[key].won++;
        humans.push({ i: si, key: key, n: s.n, c: s.c || 0 });
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
        html += '<tr><td class="stats-name">' + esc(row.disp) + '</td><td>' + row.played +
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
        html += '<li><span>' + esc(v.a) + '</span><b>' + v.aw + '&ndash;' + v.bw +
                '</b><span>' + esc(v.b) + '</span></li>';
      }
      html += '</ul>';
    }
    html += '<div class="stats-danger"><div class="stats-danger-label">⚠ Danger zone</div>' +
            '<button type="button" class="stats-reset" id="statsReset">Erase all scores</button></div>';
    body.innerHTML = html;
    var rb = $('statsReset');
    if (rb) rb.onclick = function () {
      if (window.confirm('Erase ALL Arena scores on this device? This cannot be undone.')) {
        lsSet(LS_GAMES, []);
        renderStats();
      }
    };
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
      everConnected = true;
      reconnectAttempt = 0;
      setConn(true, 'online · ' + host);
      setErr('');
      send({ t: 'hello', alias: myAlias() || 'Player' });
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
      if (inGame) {
        try { setStatus('Connection lost — reconnecting… (game may need a restart)', ''); } catch (e) {}
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
        break;
      case 'lobby':
        lobbyPlayers = m.players || [];
        lobbyParties = m.parties || [];
        // Keep myParty in sync if we're listed
        if (myParty) {
          var found = null;
          for (var i = 0; i < lobbyParties.length; i++) {
            if (lobbyParties[i].id === myParty.id) { found = lobbyParties[i]; break; }
          }
          myParty = found;
        }
        renderLobby();
        break;
      case 'party':
        myParty = m.party;
        renderLobby();
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
        inGame = true;
        myParty = null;
        lastGameOver = null;
        showGame();
        break;
      case 'state':
        curState = m.state;
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
        inGame = false;
        setTimeout(showLobby, 1600);
        break;
      case 'error':
        setErr(m.msg || 'Something went wrong');
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  // ── Lobby ──
  function showLobby() {
    inGame = false;
    $('gameView').hidden = true;
    $('lobbyView').hidden = false;
    renderLobby();
  }

  function renderLobby() {
    var me = null;
    for (var i = 0; i < lobbyPlayers.length; i++) {
      if (lobbyPlayers[i].id === youId) { me = lobbyPlayers[i]; break; }
    }
    if (me) {
      $('meLine').textContent = 'playing as ' + me.alias +
        (me.status && me.status !== 'idle' ? ' · ' + me.status : '') +
        ' · ' + lobbyPlayers.length + ' online';
    }

    // My table panel
    var atTable = !!(myParty && myParty.members && myParty.members.length);
    $('myTableCard').hidden = !atTable;
    $('openActions').hidden = atTable;
    if (atTable) {
      var isHost = myParty.hostId === youId;
      var names = myParty.members.map(function (m) {
        var tag = m.id === myParty.hostId ? ' (host)' : '';
        var you = m.id === youId ? ' ★' : '';
        return esc(m.alias) + tag + you;
      }).join(' · ');
      $('myTableTitle').textContent =
        'Table · ' + myParty.members.length + ' human' +
        (myParty.members.length === 1 ? '' : 's') +
        ' + ' + myParty.bots + ' Rival' + (myParty.bots === 1 ? '' : 's') +
        ' = ' + myParty.seats + ' seats';
      $('myTableMembers').innerHTML = names || '…';
      $('hostControls').hidden = !isHost;
      $('guestControls').hidden = isHost;
      if (isHost) {
        var bc = $('botCount');
        var maxBots = Math.max(0, 5 - myParty.members.length);
        // rebuild options if needed
        var want = String(Math.min(myParty.bots, maxBots));
        if (bc.value !== want) bc.value = want;
        $('btnStart').disabled = myParty.members.length < 2;
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
        send({ t: 'joinParty', partyId: p.id });
      };
      li.appendChild(left);
      li.appendChild(btn);
      pl.appendChild(li);
    });

    // Online list
    var ul = $('playerList');
    ul.innerHTML = '';
    var people = lobbyPlayers.filter(function (p) { return p.id !== youId; });
    if (!people.length) {
      ul.innerHTML = '<li class="ar-empty">Nobody else online yet. Open this page on another tablet.</li>';
      return;
    }
    people.forEach(function (p) {
      var li = document.createElement('li');
      var left = document.createElement('div');
      left.innerHTML =
        '<span class="ar-pname">' + esc(p.alias) + '</span> ' +
        '<span class="ar-pstatus ' + esc(p.status || 'idle') + '">' + esc(p.status || 'idle') + '</span>';
      li.appendChild(left);
      // Quick invite only if both idle (legacy 1v1 path)
      if (p.status === 'idle' && me && me.status === 'idle' && !myParty) {
        var btn = document.createElement('button');
        btn.className = 'btn-ar';
        btn.type = 'button';
        btn.textContent = 'Quick 1v1';
        btn.onclick = function () {
          setErr('');
          send({ t: 'invite', toId: p.id, bots: parseInt($('botCount').value, 10) || 1 });
          setErr('Challenge sent to ' + p.alias + '…');
        };
        li.appendChild(btn);
      }
      ul.appendChild(li);
    });
  }

  function showInvite(m) {
    $('inviteTitle').textContent = 'Challenge from ' + m.fromAlias;
    var botTxt = m.bots === 0 ? 'no Rivals' : (m.bots + ' Rival' + (m.bots > 1 ? 's' : ''));
    $('inviteBody').innerHTML =
      '<b>' + esc(m.fromAlias) + '</b> wants a quick 1v1 + ' + botTxt + '.';
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

  // ── Game ──
  function showGame() {
    $('lobbyView').hidden = true;
    $('gameView').hidden = false;
    setStatus('Game on!', 'mine');
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

  function renderSeatBar() {
    var bar = $('seatBar'); bar.innerHTML = '';
    curState.players.forEach(function (p, i) {
      var d = document.createElement('div');
      d.className = 'ar-seat' + (i === curState.current ? ' cur' : '');
      d.innerHTML =
        '<span class="ar-swatch" style="background:' + COL[i % COL.length] + '"></span>' +
        '<span>' + esc(p.name) + (i === mySeat ? ' (you)' : '') + '</span>' +
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
      var stack = document.createElement('div'); stack.className = 'ar-stack';
      var h = H[s];
      for (var f = 1; f <= h; f++) {
        var fl = document.createElement('div'); fl.className = 'ar-floor';
        if (claimedBy !== undefined && claimedBy !== null) {
          var c = COL[claimedBy % COL.length];
          fl.style.background = c;
          if (f === h) { fl.classList.add('top-claim'); fl.style.color = c; }
        } else {
          var occ = [];
          for (var seat = 0; seat < curState.n; seat++) {
            if (effFloor(seat, s) >= f) occ.push(seat);
          }
          if (occ.length === 1) fl.style.background = COL[occ[0] % COL.length];
          else if (occ.length > 1) {
            var pct = 100 / occ.length;
            occ.forEach(function (seat, k) {
              var st = document.createElement('div'); st.className = 'st';
              st.style.left = (k * pct) + '%'; st.style.width = pct + '%';
              st.style.background = COL[seat % COL.length];
              fl.appendChild(st);
            });
          }
        }
        stack.appendChild(fl);
      }
      var lab = document.createElement('div'); lab.className = 'ar-collab';
      lab.textContent = s + (curState.climbing.indexOf(s) !== -1 ? '▲' : '');
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
    var mine = myTurn();
    var curName = curState.players[curState.current]
      ? curState.players[curState.current].name : '';

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
      setStatus('Your climb — pick a pairing.', 'mine');
      roll.disabled = true; bank.disabled = true;
      curState.options.forEach(function (o) {
        var b = document.createElement('button');
        b.className = 'ar-optbtn'; b.type = 'button'; b.textContent = o.headline;
        b.onclick = function () {
          send({ t: 'action', action: 'choose', signature: o.signature });
        };
        opts.appendChild(b);
      });
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
      setAlias(n); rememberAlias(n); initAliasUI();
      send({ t: 'setAlias', alias: n });
      $('meLine').textContent = 'playing as ' + n;
    };
  }

  $('btnCreateTable').onclick = function () {
    setErr('');
    send({ t: 'createParty' });
  };
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
    if (myParty && myParty.hostId === youId) {
      send({ t: 'setPartyBots', bots: parseInt($('botCount').value, 10) || 0 });
    }
  };

  $('btnRoll').onclick = function () {
    if (myTurn()) send({ t: 'action', action: 'roll' });
  };
  $('btnBank').onclick = function () {
    if (myTurn()) send({ t: 'action', action: 'stop' });
  };
  $('btnLeave').onclick = function () {
    send({ t: 'leaveRoom' });
    inGame = false;
    hideWin();
    showLobby();
  };

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

  initAliasUI();
  renderStats();
  if (!myAlias()) $('aliasInput').focus();
  connect();
})();
