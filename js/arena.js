/* Summit Arena client — lobby + head-to-head play against server-authoritative state.
   The server owns the rules; this file only renders state and sends intents. */
(function () {
  'use strict';

  // ── Config ──
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

  // ── Identity (ephemeral; name persists locally, no login) ──
  function getAliases() { try { return JSON.parse(localStorage.getItem('sa_aliases') || '[]') || []; } catch (e) { return []; } }
  function rememberAlias(n) {
    n = (n || '').trim(); if (!n) return;
    var a = getAliases().filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); });
    a.unshift(n); if (a.length > 12) a = a.slice(0, 12);
    try { localStorage.setItem('sa_aliases', JSON.stringify(a)); } catch (e) {}
  }
  function myAlias() { try { return localStorage.getItem('sa_alias') || ''; } catch (e) { return ''; } }
  function setAlias(n) { try { localStorage.setItem('sa_alias', n); } catch (e) {} }

  // ── State ──
  var ws = null, youId = null, mySeat = null, curState = null, seats = null;
  var lobby = [], reconnectT = null, bustHideT = null, everConnected = false;

  function setConn(on, text) {
    $('connDot').className = 'ar-dot' + (on ? ' on' : '');
    $('connText').textContent = text;
  }
  function send(o) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch (e) {} }

  // ── Connect / reconnect ──
  function connect() {
    setConn(false, everConnected ? 'reconnecting…' : 'connecting…');
    try { ws = new WebSocket(WS_URL); } catch (e) { scheduleReconnect(); return; }
    ws.onopen = function () {
      everConnected = true;
      setConn(true, 'online · ' + WS_URL.replace(/^wss?:\/\//, ''));
      send({ t: 'hello', alias: myAlias() });
    };
    ws.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      handle(m);
    };
    ws.onclose = function () { setConn(false, 'disconnected'); showLobby(); scheduleReconnect(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  function scheduleReconnect() {
    if (reconnectT) return;
    reconnectT = setTimeout(function () { reconnectT = null; connect(); }, 1800);
  }

  // ── Message handling ──
  function handle(m) {
    switch (m.t) {
      case 'welcome':
        youId = m.youId;
        $('meLine').textContent = m.alias ? ('playing as ' + m.alias) : '';
        break;
      case 'lobby': lobby = m.players || []; renderLobby(); break;
      case 'invited': showInvite(m); break;
      case 'inviteDeclined': flashStatusLobby((m.byAlias || 'Player') + ' declined.'); break;
      case 'inviteCancelled': hideInvite(); break;
      case 'gameStart':
        mySeat = m.seatIndex; seats = m.seats; hideInvite();
        showGame();
        break;
      case 'state':
        curState = m.state;
        if (bustHideT) { clearTimeout(bustHideT); bustHideT = null; $('bustOverlay').hidden = true; }
        renderGame();
        break;
      case 'bust': showBust(m); break;
      case 'gameOver': onGameOver(m); break;
      case 'opponentLeft':
        setStatus('Opponent left the game.', '');
        setTimeout(showLobby, 1400);
        break;
      case 'error': /* soft */ break;
      default: break;
    }
  }

  // ── Lobby view ──
  function showLobby() { $('gameView').hidden = true; $('lobbyView').hidden = false; }
  function flashStatusLobby(msg) { $('meLine').textContent = msg; }
  function renderLobby() {
    var ul = $('playerList'); ul.innerHTML = '';
    var others = lobby.filter(function (p) { return p.id !== youId; });
    var me = lobby.filter(function (p) { return p.id === youId; })[0];
    if (me) $('meLine').textContent = 'playing as ' + me.alias + (me.status !== 'idle' ? ' · ' + me.status : '');
    if (!others.length) {
      ul.innerHTML = '<li class="ar-empty">Nobody else online yet. Open this page on another device (or tablet) with a different name, then challenge them here.</li>';
      return;
    }
    others.forEach(function (p) {
      var li = document.createElement('li');
      var left = document.createElement('div');
      left.innerHTML = '<span class="ar-pname">' + esc(p.alias) + '</span> <span class="ar-pstatus ' + p.status + '">' + p.status + '</span>';
      var btn = document.createElement('button');
      btn.className = 'btn-ar primary'; btn.type = 'button'; btn.textContent = 'Challenge';
      btn.disabled = !(p.status === 'idle' && (!me || me.status === 'idle'));
      btn.onclick = function () {
        var bots = parseInt($('botCount').value, 10) || 0;
        send({ t: 'invite', toId: p.id, bots: bots });
        $('meLine').textContent = 'challenge sent to ' + p.alias + '…';
      };
      li.appendChild(left); li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  // ── Invite overlay ──
  function showInvite(m) {
    $('inviteTitle').textContent = 'Challenge from ' + m.fromAlias;
    var botTxt = m.bots === 0 ? 'no Rivals' : (m.bots + ' Rival' + (m.bots > 1 ? 's' : ''));
    $('inviteBody').innerHTML = '<b>' + esc(m.fromAlias) + '</b> wants to play &mdash; you two + ' + botTxt + '.';
    $('inviteAccept').onclick = function () { send({ t: 'inviteResponse', fromId: m.fromId, accept: true }); hideInvite(); };
    $('inviteReject').onclick = function () { send({ t: 'inviteResponse', fromId: m.fromId, accept: false }); hideInvite(); };
    $('inviteOverlay').hidden = false;
  }
  function hideInvite() { $('inviteOverlay').hidden = true; }

  // ── Game view ──
  function showGame() { $('lobbyView').hidden = true; $('gameView').hidden = false; setStatus('Game on!', 'mine'); }
  function setStatus(html, cls) { var el = $('status'); el.className = 'ar-status ' + (cls || ''); el.innerHTML = html; }

  function myTurn() { return curState && curState.current === mySeat && curState.currentIsHuman && curState.winner == null; }

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
      var claims = p.claimed.length;
      var who = esc(p.name);
      d.innerHTML = '<span class="ar-swatch" style="background:' + COL[i % COL.length] + '"></span>' +
        '<span>' + who + (i === mySeat ? ' (you)' : '') + '</span>' +
        '<span class="ar-claims">' + claims + '/3</span>';
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
          for (var seat = 0; seat < curState.n; seat++) if (effFloor(seat, s) >= f) occ.push(seat);
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
    var curName = curState.players[curState.current] ? curState.players[curState.current].name : '';

    if (curState.winner != null) { roll.disabled = true; bank.disabled = true; return; }
    if (!mine) {
      roll.disabled = true; bank.disabled = true;
      var waitOn = curState.currentIsHuman ? esc(curName) : (esc(curName) + ' (Rival)');
      setStatus('Waiting for <b>' + waitOn + '</b>…', '');
      return;
    }
    if (curState.phase === 'choose_pair' && curState.options) {
      setStatus('Your climb — pick a pairing.', 'mine');
      roll.disabled = true; bank.disabled = true;
      curState.options.forEach(function (o) {
        var b = document.createElement('button');
        b.className = 'ar-optbtn'; b.type = 'button'; b.textContent = o.headline;
        b.onclick = function () { send({ t: 'action', action: 'choose', signature: o.signature }); };
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
      var d = document.createElement('div'); d.className = 'ar-die'; d.textContent = v; dd.appendChild(d);
    });
    $('bustSmack').innerHTML = '<b>' + esc(m.byName || '') + '</b> busted &mdash; &ldquo;' + esc(m.smack || '') + '&rdquo;';
    $('bustOverlay').hidden = false;
    if (bustHideT) clearTimeout(bustHideT);
    bustHideT = setTimeout(function () { $('bustOverlay').hidden = true; bustHideT = null; }, 2400);
  }

  function onGameOver(m) {
    var youWon = m.winnerSeat === mySeat;
    setStatus(youWon ? '🏆 You win!' : ('<b>' + esc(m.winnerName || 'Someone') + '</b> wins.'), youWon ? 'win' : '');
    $('btnRoll').disabled = true; $('btnBank').disabled = true;
    setTimeout(showLobby, 3200);
  }

  // ── Wiring ──
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function initAliasUI() {
    var input = $('aliasInput');
    input.value = myAlias();
    var dl = $('aliasList'); dl.innerHTML = '';
    getAliases().forEach(function (n) { var o = document.createElement('option'); o.value = n; dl.appendChild(o); });
    $('saveAlias').onclick = function () {
      var n = (input.value || '').trim().slice(0, 18);
      if (!n) return;
      setAlias(n); rememberAlias(n); initAliasUI();
      send({ t: 'setAlias', alias: n });
      $('meLine').textContent = 'playing as ' + n;
    };
  }

  $('btnRoll').onclick = function () { if (myTurn()) send({ t: 'action', action: 'roll' }); };
  $('btnBank').onclick = function () { if (myTurn()) send({ t: 'action', action: 'stop' }); };
  $('btnLeave').onclick = function () { send({ t: 'leaveRoom' }); showLobby(); };

  initAliasUI();
  if (!myAlias()) $('aliasInput').focus();
  connect();
})();
