/* Summit Lab — behavioural showcase only. No strategy commentary in UI. */
(function () {
  'use strict';

  var H = {2:3,3:5,4:7,5:9,6:11,7:13,8:11,9:9,10:7,11:5,12:3};
  var W = {2:1,3:2,4:3,5:4,6:5,7:6,8:5,9:4,10:3,11:2,12:1};
  var COL = ['#3d9a6a','#c47a3a','#7a6bc4','#c45a7a','#4a9a9a'];
  var PIDX = [[0,1,2,3],[0,2,1,3],[0,3,1,2]];

  // Public labels only — internal ids stay opaque
  var PILOTS = {
    human: { label: 'Human', blurb: 'You decide.' },
    loom:  { label: 'Loom',  blurb: 'Patient lines, outer preference.' },
    ember: { label: 'Ember', blurb: 'Presses when the table pays.' },
    frost: { label: 'Frost', blurb: 'Holds the middle; banks early.' },
    bolt:  { label: 'Bolt',  blurb: 'Hunts short summits.' },
    drift: { label: 'Drift', blurb: 'No fixed habit.' }
  };
  var PILOT_ORDER = ['human','loom','ember','frost','bolt','drift'];

  // ── Themes: player palette (JS) + surface colours (CSS via [data-lab-theme]) ──
  var THEME_COLS = {
    slate:    ['#3d9a6a','#c47a3a','#7a6bc4','#c45a7a','#4a9a9a'],
    neon:     ['#00e5ff','#ff2bd6','#7dff3a','#ffb300','#b14bff'],
    candy:    ['#ff5d8f','#ffa53d','#3ec8ff','#7ed957','#c86bff'],
    mountain: ['#6aa06a','#b5732f','#7d94b8','#d9b64a','#9a7b4f'],
    // EZ — BOMBACLARTTTTT: pitch UI is B&W; climb pills = oztag jersey kits
    bombaclarttttt: ['#e31c23', '#1b4f9c', '#f5c400', '#00a651', '#ff5a00'],
    // AC — duckduckgoose: pastel climb pills (pink green purple orange cyan)
    duckduckgoose: ['#ffb6c8', '#b8e6b8', '#d4b8f0', '#ffd0a8', '#9eecf5']
  };
  var THEME_ORDER = ['slate','neon','candy','mountain','bombaclarttttt','duckduckgoose'];
  var THEME_LABEL = {
    slate: 'Slate (default)',
    neon: 'Neon Arcade',
    candy: 'Candy Pop',
    mountain: 'Summit',
    bombaclarttttt: 'BOMBACLARTTTTT — EZ',
    duckduckgoose: 'duckduckgoose — AC'
  };
  var LS_THEME = 'sl_theme_v1';

  // ── Bust alert: 90s CD-ROM host energy (YDKJ-adjacent), family-safe ──
  // Shuffle-bag so the same line never repeats until the bag is empty.
  var LS_BUSTALERT = 'sl_bustalert_v1';
  var bustAlertOn = true;
  var SMACK = [
    // Host energy — cheeky, not mean
    'Hey! You drooling on the keyboard, or was that the plan?',
    'BZZZT! Wrong answer — and also, no climb for you.',
    'Welcome to the bust club. Membership is free. Dignity costs extra.',
    'That was bold. That was brave. That was… a mistake.',
    'Somebody call the bank — oh wait, you didn\'t.',
    'The dice have spoken. Their accent is pure mockery.',
    'I\'d clap, but my hands are busy high-fiving the probability table.',
    'Pro tip from the 90s: bank before the fireworks.',
    'Insert coin… oh wait, this one\'s free. Still busted though.',
    'Nice try, champ. The towers send their regards.',
    // Greed / push-your-luck
    'Greed is good… until the fourth die says otherwise.',
    'You pushed your luck so hard it filed a complaint.',
    'Shoulda banked, hotshot. Shoulda banked.',
    'Live by the roll, die by the roll. Mostly the second one.',
    'That climb needed a seatbelt. And a plan. And a bank.',
    'You almost had it! Psych. You almost had it.',
    'The greedy goose got cooked. Classic fairy tale, really.',
    // Dice / game-show
    'Four dice, zero legal moves. That\'s performance art.',
    'The number gods are taking personal days. Yours included.',
    'Survey says… BUST. Ding ding ding!',
    'We\'ve got a live one! Unfortunately, not for long.',
    'And the crowd goes mild. Very mild.',
    'That roll went straight in the recycling bin.',
    'Plot twist: the towers were never on your side.',
    // Sibling / family table
    'Pass the tablet — your ego needs a cool-down lap.',
    'Sibling note: this one goes in the family history book.',
    'Don\'t cry into the dice. They\'re already salty enough.',
    'Next time, try the revolutionary strategy called "banking."',
    'You\'ve been reduced to a cautionary tale. Congrats?',
    // Dad-joke adjacent
    'Why did the climber fall? Because the dice said so. I\'ll see myself out.',
    'This bust was brought to you by the letter B and the number zero.',
    'I\'d say "better luck next time," but luck just left the chat.',
    'Error 404: legal climb not found.',
    'Your strategy called. It wants a refund.',
    'That was less "master plan" and more "jazz improvisation."',
    // Soft KO lines
    'K.O.! The dice are holding up the scorecard.',
    'Game over, rookie. Try again when the math loves you.',
    'Womp womp. Still friends though. Probably.',
    'Down you go — the view from the bottom is educational.',
    'Press CONTINUE to pretend that didn\'t sting.',
    'Insufficient skill detected. Download more bank buttons.',
    'The house always wins… and today the house is probability.',
    'You rolled like a legend. You finished like a legend\'s cousin.'
  ];
  var smackBag = [];
  function refillSmackBag() {
    smackBag = SMACK.slice();
    for (var i = smackBag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = smackBag[i]; smackBag[i] = smackBag[j]; smackBag[j] = t;
    }
  }
  function nextSmack() {
    if (!smackBag.length) refillSmackBag();
    return smackBag.pop();
  }

  // ── Local records: player aliases + a game ledger. Per-browser, no server. ──
  var LS_ALIASES = 'sl_aliases_v1';
  var LS_GAMES = 'sl_games_v1';

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return escHtml(s).replace(/"/g, '&quot;');
  }
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function getAliases() { var a = lsGet(LS_ALIASES, []); return (a instanceof Array) ? a : []; }
  function rememberAlias(name) {
    name = (name || '').trim();
    if (!name) return;
    var a = getAliases(), low = name.toLowerCase();
    a = a.filter(function (x) { return x.toLowerCase() !== low; });
    a.unshift(name);
    if (a.length > 24) a = a.slice(0, 24);
    lsSet(LS_ALIASES, a);
  }
  function getGames() { var g = lsGet(LS_GAMES, []); return (g instanceof Array) ? g : []; }
  function pushGame(rec) {
    var g = getGames();
    g.push(rec);
    if (g.length > 500) g = g.slice(g.length - 500);
    lsSet(LS_GAMES, g);
  }
  function refreshAliasDatalist() {
    var dl = $('aliasList');
    if (!dl) return;
    var a = getAliases();
    dl.innerHTML = '';
    for (var i = 0; i < a.length; i++) {
      var o = document.createElement('option');
      o.value = a[i];
      dl.appendChild(o);
    }
  }
  function readAliases() {
    var out = {};
    document.querySelectorAll('.seat-alias').forEach(function (inp) {
      out[parseInt(inp.getAttribute('data-seat'), 10)] = (inp.value || '').trim();
    });
    return out;
  }
  // Ledger/stats moved to Summit Arena (online family matches).

  // Apply a theme: swap the player palette + set the CSS surface variables.
  function applyTheme(t) {
    if (!THEME_COLS[t]) t = 'slate';
    COL = THEME_COLS[t].slice();
    var wrap = document.querySelector('.lab-wrap');
    if (wrap) {
      if (t === 'slate') wrap.removeAttribute('data-lab-theme');
      else wrap.setAttribute('data-lab-theme', t);
    }
    lsSet(LS_THEME, t);
    if ($('seatSetup')) renderSeatSetup();
    if (G) refresh();
  }
  function populateThemePicker() {
    var sel = $('themePick');
    if (!sel) return;
    var cur = lsGet(LS_THEME, 'slate');
    sel.innerHTML = '';
    for (var i = 0; i < THEME_ORDER.length; i++) {
      var id = THEME_ORDER[i];
      var o = document.createElement('option');
      o.value = id; o.textContent = THEME_LABEL[id] || id;
      if (id === cur) o.selected = true;
      sel.appendChild(o);
    }
    sel.onchange = function () { applyTheme(sel.value); };
  }
  // Taunter = next seat if bot, else a cheesy 90s host voice. Lines never
  // repeat until the whole bag has been heard once (then reshuffle).
  function smackLine(nextIdx) {
    var line = nextSmack();
    var who = (nextIdx != null && G && isBot(nextIdx)) ? PILOTS[G.players[nextIdx].pilot].label : 'HOST';
    return { who: who, line: line };
  }
  function showBustOverlay(dice, nextIdx, onContinue) {
    var ov = $('bustOverlay');
    if (!ov) { onContinue(); return; }
    var dd = $('bustDice');
    dd.innerHTML = '';
    for (var i = 0; i < dice.length; i++) {
      var d = document.createElement('div');
      d.className = 'die bust-die';
      d.textContent = dice[i];
      dd.appendChild(d);
    }
    var sm = smackLine(nextIdx);
    $('bustSmack').innerHTML = '<span class="smack-who">' + escHtml(sm.who) + ':</span> &ldquo;' +
                               escHtml(sm.line) + '&rdquo;';
    ov.hidden = false;
    function done() { ov.hidden = true; ov.onclick = null; onContinue(); }
    $('bustContinue').onclick = done;
    ov.onclick = function (e) { if (e.target === ov) done(); };
    setTimeout(function () { try { $('bustContinue').focus(); } catch (e) {} }, 30);
  }

  var G = null;
  var rng = Math.random;
  var seedState = 1;
  var coachPick = null;

  function $(id) { return document.getElementById(id); }

  function seedRng(s) {
    var h = 2166136261 >>> 0;
    s = String(s || Date.now());
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    seedState = h || 0xa5a5a5a5;
  }
  function rnd() {
    var t = (seedState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function die() { return 1 + Math.floor(rnd() * 6); }

  function outer(s) {
    if (s === 7) return 0;
    if (s === 6 || s === 8) return 8;
    if (s === 5 || s === 9) return 16;
    if (s === 4 || s === 10) return 24;
    if (s === 3 || s === 11) return 32;
    if (s === 2 || s === 12) return 40;
    return 0;
  }

  function pairings(dice) {
    var d = dice.slice().sort(function (a, b) { return a - b; });
    return PIDX.map(function (ix, id) {
      return {
        id: id,
        sums: [d[ix[0]] + d[ix[1]], d[ix[2]] + d[ix[3]]],
        label: '(' + d[ix[0]] + '+' + d[ix[1]] + ') (' + d[ix[2]] + '+' + d[ix[3]] + ')'
      };
    });
  }

  function claimed(g, s) { return g.claimedGlobal[s] !== undefined; }

  function canClimb(g, s) {
    if (s < 2 || s > 12 || claimed(g, s)) return false;
    if (g.climbing.has(s) && g.climbFloor[s] >= H[s]) return false;
    if (g.climbing.has(s)) return true;
    return g.climbing.size < 3;
  }

  function pairingLegal(g, sums) {
    return canClimb(g, sums[0]) || canClimb(g, sums[1]);
  }

  function dryRun(g, sums, pr) {
    var climbing = new Set(g.climbing);
    var floors = {};
    for (var t = 2; t <= 12; t++) floors[t] = g.climbFloor[t];
    var climbs = [];
    function can(s) {
      if (s < 2 || s > 12 || claimed(g, s)) return false;
      if (climbing.has(s) && floors[s] >= H[s]) return false;
      if (climbing.has(s)) return true;
      return climbing.size < 3;
    }
    function one(s, amt) {
      if (!can(s)) return;
      var isNew = !climbing.has(s);
      if (isNew) climbing.add(s);
      var room = H[s] - floors[s];
      var d = Math.min(amt, room);
      if (d <= 0) return;
      floors[s] += d;
      climbs.push({ sum: s, delta: d, isNew: isNew });
    }
    if (sums[0] === sums[1]) one(sums[0], 2);
    else {
      var order = pr === 1 ? [1, 0] : [0, 1];
      for (var i = 0; i < order.length; i++) one(sums[order[i]], 1);
    }
    var sig = climbs.map(function (c) {
      return c.sum + ':+' + c.delta + (c.isNew ? 'n' : '');
    }).sort().join('|') || 'NONE';
    var headline;
    if (!climbs.length) headline = 'No climb';
    else if (climbs.length === 1) {
      var c0 = climbs[0];
      headline = c0.delta === 2 ? ('Climb ' + c0.sum + ' ×2') : ((c0.isNew ? 'Open ' : 'Climb ') + c0.sum);
    } else {
      headline = climbs.map(function (c) {
        return (c.isNew ? 'open ' : 'climb ') + c.sum + (c.delta > 1 ? '×' + c.delta : '');
      }).join(' + ');
      headline = headline.charAt(0).toUpperCase() + headline.slice(1);
    }
    return { climbs: climbs, signature: sig, headline: headline };
  }

  function applyClimb(g, sums, pr) {
    var climbs = [];
    if (sums[0] === sums[1]) {
      var s = sums[0];
      if (!canClimb(g, s)) return [];
      if (!g.climbing.has(s)) g.climbing.add(s);
      var room = H[s] - g.climbFloor[s];
      var d = Math.min(2, room);
      if (d > 0) { g.climbFloor[s] += d; climbs.push({ sum: s, delta: d }); }
      return climbs;
    }
    var order = pr === 1 ? [1, 0] : [0, 1];
    for (var i = 0; i < order.length; i++) {
      var s2 = sums[order[i]];
      if (!canClimb(g, s2)) continue;
      var isNew = !g.climbing.has(s2);
      if (isNew && g.climbing.size >= 3) continue;
      if (isNew) g.climbing.add(s2);
      if (g.climbFloor[s2] >= H[s2]) continue;
      g.climbFloor[s2] += 1;
      climbs.push({ sum: s2, delta: 1 });
    }
    return climbs;
  }

  function anyAtTop(g) {
    var it = g.climbing.values();
    for (var n = it.next(); !n.done; n = it.next()) {
      if (g.climbFloor[n.value] >= H[n.value]) return true;
    }
    return false;
  }

  function heatOf(g) {
    var h = 0;
    g.climbing.forEach(function (s) { h += W[s] || 0; });
    return h;
  }

  function raceState(g) {
    var me = g.current;
    var myClaims = g.players[me].claimed.size;
    var oppClaims = 0, oppClosest = 99, oppHot = false;
    for (var i = 0; i < g.n; i++) {
      if (i === me) continue;
      oppClaims = Math.max(oppClaims, g.players[i].claimed.size);
      for (var s = 2; s <= 12; s++) {
        if (claimed(g, s)) continue;
        var fl = g.players[i].floor[s] || 0;
        if (fl <= 0) continue;
        var rem = H[s] - fl;
        if (rem < oppClosest) oppClosest = rem;
        if (rem <= 4 && W[s] >= 5) oppHot = true;
      }
    }
    if (oppClosest === 99) oppClosest = null;
    var protect = myClaims >= 2 && oppClaims <= 1 && (oppClosest === null || oppClosest > 4) && !oppHot;
    var mustRace = oppClaims >= 2 ||
      (myClaims >= 2 && oppClaims >= 1 && oppClosest !== null && oppClosest <= 3) ||
      (oppClosest !== null && oppClosest <= 2 && oppClaims >= 1) ||
      (oppHot && oppClaims >= 1);
    var both = myClaims >= 2 && oppClaims >= 2;
    var finishable = false, minR = 99;
    g.climbing.forEach(function (s) {
      var r = H[s] - g.climbFloor[s];
      if (r < minR) minR = r;
      if (r > 0 && r <= 3) finishable = true;
    });
    if (minR === 99) minR = null;
    return { myClaims: myClaims, oppClaims: oppClaims, oppClosest: oppClosest, protect: protect, mustRace: mustRace, bothAt2: both, finishable: finishable, minMyRemain: minR };
  }

  // --- opaque pilot scorers (no public docs) ---
  function pvLoom(g, s) {
    if (!canClimb(g, s)) return 0;
    var cont = g.climbing.has(s);
    var rem = H[s] - g.climbFloor[s];
    var prog = g.climbFloor[s] - g.turnStart[s];
    var rs = raceState(g);
    var race = rs.mustRace || rs.bothAt2 || (rs.myClaims >= 2 && !rs.protect);
    var v = 0;
    if (race) {
      v += Math.max(0, 16 - rem) * 10 + W[s] * 4;
      if (cont) v += 55 + Math.min(prog, 15) * 3 + Math.floor(outer(s) / 4);
      else {
        v += (heatOf(g) + W[s]) * 2;
        if (rs.myClaims >= 2 || rs.oppClaims >= 2) {
          if (s === 2 || s === 3 || s === 11 || s === 12) v -= 25;
          if (rem >= 9) v -= 35;
          if (rem <= 5 && W[s] >= 4) v += 20;
        }
      }
      if (rem === 1) v += 130; else if (rem === 2) v += 90; else if (rem === 3) v += 55;
      return v;
    }
    if (cont) v += 40 + outer(s) + Math.min(prog, 15) * 4 + Math.max(0, 16 - rem);
    else {
      var open = heatOf(g) + W[s] + W[s];
      if (g.climbing.size === 2 && (s === 2 || s === 3 || s === 11 || s === 12)) open = Math.max(0, open - 10);
      else if ((s === 6 || s === 8) || (s === 7 && g.climbing.size === 2)) open += 12;
      v += open;
    }
    if (rem === 1) v += 90; else if (rem === 2) v += 50; else if (rem === 3) v += 25;
    if (rs.protect && rem <= 3) v += 40;
    return v;
  }

  function pvEmber(g, s) {
    if (!canClimb(g, s)) return 0;
    var rem = H[s] - g.climbFloor[s];
    var v = W[s] * 6;
    if (rem === 1) v += 200; else if (rem === 2) v += 110; else if (rem === 3) v += 55;
    if (g.climbing.has(s)) v += 45 + Math.min(g.climbFloor[s] - g.turnStart[s], 12) * 3;
    else if (g.climbing.size === 2 && W[s] <= 2) v -= 35;
    return v;
  }

  function pvFrost(g, s) {
    if (!canClimb(g, s)) return 0;
    var rem = H[s] - g.climbFloor[s];
    var v = W[s] * 15;
    if (rem <= 2) v += 55;
    if (g.climbing.has(s)) v += 30 + (g.climbFloor[s] - g.turnStart[s]) * 3;
    else if (g.climbing.size === 2 && (s === 2 || s === 3 || s === 11 || s === 12)) v -= 55;
    return v;
  }

  function pvBolt(g, s) {
    if (!canClimb(g, s)) return 0;
    var rem = H[s] - g.climbFloor[s];
    var v = (14 - H[s]) * 9 + W[s] * 2;
    if (rem === 1) v += 260; else if (rem === 2) v += 150; else if (rem === 3) v += 85;
    if (g.climbing.has(s)) v += 55 + (g.climbFloor[s] - g.turnStart[s]) * 5;
    return v;
  }

  function scoreFn(id) {
    if (id === 'ember') return pvEmber;
    if (id === 'frost') return pvFrost;
    if (id === 'bolt') return pvBolt;
    if (id === 'drift') return function () { return rnd(); };
    return pvLoom;
  }

  // bust table (compact runtime enum — no comments)
  var ACH = (function () {
    var o = [];
    for (var a = 1; a <= 6; a++)
      for (var b = 1; b <= 6; b++)
        for (var c = 1; c <= 6; c++)
          for (var d = 1; d <= 6; d++)
            o.push([a + b, c + d, a + c, b + d, a + d, b + c]);
    return o;
  })();

  function bustP(g) {
    var E = {};
    var n = 0;
    if (g.climbing.size >= 3) {
      g.climbing.forEach(function (s) {
        if (g.climbFloor[s] < H[s] && !claimed(g, s)) { E[s] = 1; n++; }
      });
    } else {
      for (var s = 2; s <= 12; s++) {
        if (claimed(g, s)) continue;
        if (g.climbing.has(s) && g.climbFloor[s] >= H[s]) continue;
        E[s] = 1; n++;
      }
    }
    if (!n) return 1;
    var miss = 0;
    for (var i = 0; i < ACH.length; i++) {
      var hit = false;
      var row = ACH[i];
      for (var j = 0; j < row.length; j++) if (E[row[j]]) { hit = true; break; }
      if (!hit) miss++;
    }
    return miss / ACH.length;
  }

  function stopFn(id, g) {
    if (anyAtTop(g)) return true;
    if (!g.climbing.size) return false;
    var rs = raceState(g);
    var prog = 0;
    g.climbing.forEach(function (s) { prog += g.climbFloor[s] - g.turnStart[s]; });

    if (id === 'frost') {
      var pb = bustP(g);
      if (rs.protect && (pb > 0.12 || prog >= 4)) return true;
      if (pb > 0.26) return true;
      if (rs.finishable && pb < 0.4) return false;
      return g.rolls >= 8 || prog >= (g.climbing.size < 3 ? 5 : 4);
    }
    if (id === 'bolt') {
      var pb2 = bustP(g);
      if (rs.minMyRemain != null && rs.minMyRemain <= 2 && pb2 < 0.42) return false;
      if (g.climbing.size === 3 && heatOf(g) < 10 && !rs.finishable) return g.rolls >= 3;
      return g.rolls >= (rs.finishable ? 9 : 6);
    }
    if (id === 'drift') {
      if (g.rolls >= 8) return true;
      return rnd() < Math.min(0.85, 0.15 * g.climbing.size + 0.08 * g.rolls);
    }
    // loom + ember share EV-ish stop with race gain
    if (g.rolls >= 11) return true;
    var pb3 = bustP(g);
    var risk = prog;
    var gain = 1.25 + (rs.finishable ? 1.6 : 0);
    if (id === 'ember') gain = 1.5 + (rs.finishable ? 1.8 : 0);
    if (rs.protect) gain *= 0.6;
    if (rs.mustRace || rs.bothAt2) gain += 0.8;
    if (g.n >= 4) gain *= 0.9;
    if (id === 'loom') {
      // tuned press (24-scale family)
      gain = (24 / 16) + (rs.finishable ? 44 / 16 : 0);
      if (rs.protect) gain *= 0.625;
      if (rs.mustRace || rs.bothAt2) gain += 18 / 16;
      if (g.n >= 4) gain *= 0.875;
    }
    return (1 - pb3) * gain - pb3 * risk <= 0;
  }

  function uniqueOptions(g, ps) {
    var by = {};
    var scorer = scoreFn(g.players[g.current].pilot);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!pairingLegal(g, p.sums)) continue;
      var s0 = p.sums[0], s1 = p.sums[1];
      var open0 = canClimb(g, s0) && !g.climbing.has(s0);
      var open1 = canClimb(g, s1) && !g.climbing.has(s1);
      var slots = 3 - g.climbing.size;
      var prs = (s0 !== s1 && slots === 1 && open0 && open1) ? [0, 1] : (s0 !== s1 ? [0, 1] : [0]);
      for (var j = 0; j < prs.length; j++) {
        var dry = dryRun(g, p.sums, prs[j]);
        if (dry.signature === 'NONE') continue;
        var score = 0;
        for (var k = 0; k < dry.climbs.length; k++) score += scorer(g, dry.climbs[k].sum);
        if (dry.climbs.length === 1 && dry.climbs[0].delta === 2) score += 60;
        var prev = by[dry.signature];
        if (!prev || score > prev.score) {
          by[dry.signature] = { p: p, priority: prs[j], dry: dry, score: score };
        }
      }
    }
    var arr = Object.keys(by).map(function (k) { return by[k]; });
    var pid = g.players[g.current].pilot;
    if (pid === 'drift') {
      for (var a = arr.length - 1; a > 0; a--) {
        var b = Math.floor(rnd() * (a + 1));
        var tmp = arr[a]; arr[a] = arr[b]; arr[b] = tmp;
      }
      return arr;
    }
    arr.sort(function (x, y) { return y.score - x.score; });
    return arr;
  }

  function startTurn(g) {
    var p = g.players[g.current];
    g.climbing = new Set();
    g.climbFloor = {};
    g.turnStart = {};
    for (var s = 2; s <= 12; s++) {
      g.turnStart[s] = p.floor[s];
      g.climbFloor[s] = p.floor[s];
    }
    g.rolls = 0;
    g.dice = null;
    g.pending = null;
    g.phase = 'need_roll';
  }

  function bank(g) {
    var p = g.players[g.current];
    var newly = [];
    g.climbing.forEach(function (s) {
      p.floor[s] = g.climbFloor[s];
      if (p.floor[s] >= H[s] && g.claimedGlobal[s] === undefined) {
        g.claimedGlobal[s] = g.current;
        p.claimed.add(s);
        newly.push(s);
      }
    });
    if (p.claimed.size >= 3) {
      g.winner = g.current;
      g.phase = 'over';
      return { newly: newly, win: true };
    }
    g.current = (g.current + 1) % g.n;
    startTurn(g);
    return { newly: newly, win: false };
  }

  function bust(g) {
    g.current = (g.current + 1) % g.n;
    startTurn(g);
  }

  function seatName(i) {
    if (!G || !G.players[i]) return 'Seat ' + (i + 1);
    return G.players[i].name || ('Seat ' + (i + 1));
  }
  function isHuman(i) {
    return G && G.players[i].pilot === 'human';
  }

  function isBot(i) {
    return !isHuman(i);
  }

  function feed(msg) {
    var el = $('feed');
    var d = document.createElement('div');
    d.className = 'line';
    d.innerHTML = msg;
    el.insertBefore(d, el.firstChild);
    while (el.children.length > 40) el.removeChild(el.lastChild);
  }

  function seatSelectHtml(seat, selected) {
    var h = '<select data-seat="' + seat + '" class="seat-pilot">';
    for (var i = 0; i < PILOT_ORDER.length; i++) {
      var id = PILOT_ORDER[i];
      // seat 0 defaults human; others default loom/ember/etc
      h += '<option value="' + id + '"' + (id === selected ? ' selected' : '') + '>' +
        PILOTS[id].label + '</option>';
    }
    return h + '</select>';
  }

  function defaultPilot(seat) {
    if (seat === 0) return 'human';
    return ['loom', 'ember', 'frost', 'bolt'][(seat - 1) % 4];
  }

  function renderSeatSetup() {
    var n = parseInt($('numPlayers').value, 10);
    var el = $('seatSetup');
    var prev = {}, prevAlias = {};
    el.querySelectorAll('.seat-pilot').forEach(function (sel) {
      prev[sel.getAttribute('data-seat')] = sel.value;
    });
    el.querySelectorAll('.seat-alias').forEach(function (inp) {
      prevAlias[inp.getAttribute('data-seat')] = inp.value;
    });
    refreshAliasDatalist();
    el.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var row = document.createElement('div');
      row.className = 'seat';
      var pick = prev[i] || defaultPilot(i);
      var aliasVal = prevAlias[i] || '';
      row.innerHTML =
        '<div class="swatch" style="background:' + COL[i] + '"></div>' +
        '<div class="seat-main">' +
          '<div class="seat-head"><b>Seat ' + (i + 1) + '</b>' + seatSelectHtml(i, pick) + '</div>' +
          '<input class="seat-alias" data-seat="' + i + '" list="aliasList" maxlength="18" ' +
            'placeholder="name…" value="' + escAttr(aliasVal) + '"' +
            (pick === 'human' ? '' : ' style="display:none"') + '>' +
          '<small>' + (PILOTS[pick] ? PILOTS[pick].blurb : '') + '</small>' +
        '</div>';
      el.appendChild(row);
      (function (small, aliasInp) {
        var sel = row.querySelector('select');
        sel.onchange = function () {
          small.textContent = PILOTS[sel.value].blurb;
          aliasInp.style.display = (sel.value === 'human') ? '' : 'none';
        };
      })(row.querySelector('small'), row.querySelector('.seat-alias'));
    }
  }

  var ASSIST_BLURB = {
    solo: 'No hints — pure seat.',
    coach: 'Highlight a strong legal climb.',
    guide: 'Coach plus one-tap take highlight.'
  };

  function updateAssistBlurb() {
    var el = $('assistBlurb');
    if (!el) return;
    var v = $('humanSkill').value;
    el.textContent = ASSIST_BLURB[v] || '';
  }

  function readPilots() {
    var sels = document.querySelectorAll('.seat-pilot');
    var out = [];
    sels.forEach(function (sel) {
      out[parseInt(sel.getAttribute('data-seat'), 10)] = sel.value;
    });
    return out;
  }

  function effH(pi, s) {
    var locked = G.players[pi].floor[s] || 0;
    if (pi === G.current && G.phase !== 'over') return Math.max(locked, G.climbFloor[s] || 0);
    return locked;
  }

  function renderBoard() {
    var board = $('board');
    board.innerHTML = '';
    for (var s = 2; s <= 12; s++) {
      var col = document.createElement('div');
      col.className = 'col' + ((s === 6 || s === 7 || s === 8) ? ' hot' : '');
      var owner = claimed(G, s) ? G.claimedGlobal[s] : null;
      if (owner != null) col.classList.add('tower-claimed');
      var stack = document.createElement('div');
      stack.className = 'stack';
      var h = H[s];
      for (var f = 1; f <= h; f++) {
        var fl = document.createElement('div');
        fl.className = 'floor';
        if (owner != null) {
          // Whole tower lights up in the claimer's jersey colour
          var jc = COL[owner % COL.length];
          fl.style.background = jc;
          fl.style.color = jc;
          fl.classList.add('claimed-floor');
          if (f === h) fl.classList.add('top-claim');
        } else {
          var occ = [];
          for (var pi = 0; pi < G.n; pi++) if (effH(pi, s) >= f) occ.push(pi);
          if (occ.length === 1) {
            fl.style.background = COL[occ[0] % COL.length];
            fl.style.color = COL[occ[0] % COL.length];
          } else if (occ.length > 1) {
            var pct = 100 / occ.length;
            occ.forEach(function (pi, i) {
              var st = document.createElement('div');
              st.className = 'stripe';
              st.style.left = (i * pct) + '%';
              st.style.width = pct + '%';
              st.style.background = COL[pi % COL.length];
              fl.appendChild(st);
            });
            if (occ.indexOf(G.current) !== -1) fl.style.color = COL[G.current % COL.length];
          }
          var locked = G.players[G.current].floor[s] || 0;
          if (G.phase !== 'over' && (G.climbFloor[s] || 0) >= f && locked < f) {
            fl.classList.add('climb-ring');
            fl.style.color = COL[G.current % COL.length];
          }
        }
        stack.appendChild(fl);
      }
      var lab = document.createElement('div');
      lab.className = 'col-lab';
      lab.textContent = s + (G.climbing.has(s) ? '▲' : '');
      if (owner != null) {
        lab.style.color = COL[owner % COL.length];
        lab.style.fontWeight = '800';
      }
      col.appendChild(stack);
      col.appendChild(lab);
      board.appendChild(col);
    }
  }

  function renderPlayersBar() {
    // optional: seats already in setup; update current outline
    document.querySelectorAll('#seatSetup .seat').forEach(function (row, i) {
      row.classList.toggle('current', G && i === G.current && G.phase !== 'over');
    });
  }

  function renderDice() {
    var el = $('dice');
    el.innerHTML = '';
    var vals = G.dice || [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
      var d = document.createElement('div');
      d.className = 'die';
      d.textContent = vals[i] ? vals[i] : '·';
      el.appendChild(d);
    }
  }

  function renderPairings() {
    var el = $('pairings');
    el.innerHTML = '';
    coachPick = null;
    if (G.phase !== 'choose_pair' || !G.pending) return;
    var opts = uniqueOptions(G, G.pending);
    if (!opts.length) return;
    var skill = $('humanSkill').value;
    var showCoach = isHuman(G.current) && (skill === 'coach' || skill === 'guide');
    if (showCoach) coachPick = opts[0];
    opts.forEach(function (opt, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pair-btn' + (showCoach && idx === 0 ? ' best' : '');
      btn.innerHTML = '<div class="out">' + opt.dry.headline + '</div><div class="meta">' +
        (showCoach && idx === 0 ? 'highlight · ' : '') + 'legal climb</div>';
      btn.onclick = function () { choosePairing(opt.p, opt.priority); };
      el.appendChild(btn);
    });
    $('btnGuide').disabled = !(showCoach && skill === 'guide' && coachPick);
  }

  function setStatus(html, cls) {
    var el = $('status');
    el.className = 'status ' + (cls || '');
    el.innerHTML = html;
  }

  function refresh() {
    if (!G) return;
    renderBoard();
    renderPlayersBar();
    renderDice();
    renderPairings();
    var humanTurn = isHuman(G.current) && G.phase !== 'over';
    $('btnRoll').disabled = !(G.phase === 'need_roll' || G.phase === 'can_stop') || (isBot(G.current) && G.phase !== 'over');
    // bots auto; humans control
    if (isBot(G.current) && G.phase !== 'over') {
      $('btnRoll').disabled = true;
      $('btnStop').disabled = true;
    } else if (G.phase === 'need_roll') {
      $('btnRoll').disabled = false;
      $('btnStop').disabled = true;
    } else if (G.phase === 'can_stop') {
      $('btnRoll').disabled = false;
      $('btnStop').disabled = false;
    } else if (G.phase === 'choose_pair') {
      $('btnRoll').disabled = true;
      $('btnStop').disabled = true;
    } else {
      $('btnRoll').disabled = true;
      $('btnStop').disabled = true;
    }
    if (G.phase === 'over') {
      setStatus('Summit sealed — <b style="color:' + COL[G.winner] + '">' + escHtml(seatName(G.winner)) + '</b> wins.', 'win');
    }
  }

  function maybeBot() {
    if (!G || G.phase === 'over') return;
    if (!isBot(G.current)) return;
    setTimeout(function () {
      if (!G || !isBot(G.current)) return;
      if (G.phase === 'need_roll' || G.phase === 'can_stop') {
        if (G.phase === 'can_stop' && stopFn(G.players[G.current].pilot, G)) doStop();
        else doRoll();
      } else if (G.phase === 'choose_pair') {
        var opts = uniqueOptions(G, G.pending);
        var pick = opts[0];
        if (G.players[G.current].pilot === 'drift' && opts.length) pick = opts[Math.floor(rnd() * opts.length)];
        if (pick) choosePairing(pick.p, pick.priority);
      }
    }, 380);
  }

  function assistMode() {
    var el = $('humanSkill');
    return el ? el.value : 'solo';
  }
  function coachGuideActive() {
    if (!isHuman(G.current)) return false;
    var m = assistMode();
    return m === 'coach' || m === 'guide';
  }
  /** Warn before risky coach/guide moves. Returns true if the action may proceed. */
  function confirmAssistRisk(kind) {
    if (!G || !coachGuideActive()) return true;
    if (kind === 'roll' && anyAtTop(G)) {
      return window.confirm(
        'Coach note: you already have a tower at the summit this turn.\n\n' +
        'Roll again and you risk a bust that wipes the claim. Bank to lock it in.\n\n' +
        'Roll anyway?'
      );
    }
    if (kind === 'bank' && G.climbing && G.climbing.size > 0 && G.climbing.size < 3 && !anyAtTop(G)) {
      return window.confirm(
        'Coach note: you still have open climber slots (' + G.climbing.size + ' of 3 in play).\n\n' +
        'Banking keeps progress, but you could open another column first.\n\n' +
        'Bank anyway?'
      );
    }
    return true;
  }

  function doRoll() {
    if (G.phase !== 'need_roll' && G.phase !== 'can_stop') return;
    if (!confirmAssistRisk('roll')) return;
    var who = escHtml(seatName(G.current));
    G.dice = [die(), die(), die(), die()];
    G.rolls += 1;
    G.pending = pairings(G.dice);
    var any = G.pending.some(function (p) { return pairingLegal(G, p.sums); });
    if (!any) {
      feed('<b style="color:' + COL[G.current] + '">' + who + '</b> rolled [' + G.dice.join(',') + '] → <b>bust</b>');
      var bustDice = G.dice.slice();
      var nextIdx = (G.current + 1) % G.n;
      if (isHuman(G.current) && bustAlertOn) {
        // Show the busting roll and pause — bust() nulls the dice, so freeze it here.
        setStatus('BUST! ' + who + ' rolled [' + bustDice.join(',') + '] with no legal move — turn lost.', 'bust');
        refresh();
        showBustOverlay(bustDice, nextIdx, function () { bust(G); refresh(); maybeBot(); });
      } else {
        setStatus('Bust — turn progress wiped.', 'bust');
        bust(G);
        refresh();
        maybeBot();
      }
      return;
    }
    G.phase = 'choose_pair';
    setStatus(who + ' — choose a climb.');
    feed('<b style="color:' + COL[G.current] + '">' + who + '</b> rolled [' + G.dice.join(',') + ']');
    refresh();
    if (isBot(G.current)) maybeBot();
  }

  function choosePairing(p, pr) {
    if (G.phase !== 'choose_pair') return;
    var who = escHtml(seatName(G.current));
    var dry = dryRun(G, p.sums, pr);
    applyClimb(G, p.sums, pr);
    G.phase = 'can_stop';
    G.pending = null;
    feed('<b style="color:' + COL[G.current] + '">' + who + '</b> ' + dry.headline);
    setStatus(dry.headline + '. Live: ' + Array.from(G.climbing).sort(function (a, b) { return a - b; }).join(', '));
    refresh();
    if (isBot(G.current)) {
      setTimeout(function () {
        if (stopFn(G.players[G.current].pilot, G)) doStop();
        else doRoll();
      }, 420);
    }
  }

  function doStop() {
    if (G.phase !== 'can_stop' && G.phase !== 'need_roll') return;
    if (!G.climbing.size && G.phase === 'need_roll') return;
    if (!confirmAssistRisk('bank')) return;
    var pi = G.current;
    var who = escHtml(seatName(pi));
    var r = bank(G);
    if (r.newly.length) feed('<b style="color:' + COL[pi] + '">' + who + '</b> banks & claims ' + r.newly.join(', '));
    else feed('<b style="color:' + COL[pi] + '">' + who + '</b> banks');
    if (r.win) {
      setStatus(who + ' wins!', 'win');
      feed('🏆 <b style="color:' + COL[pi] + '">' + who + '</b> seals three summits.');
      refresh();
      return;
    }
    setStatus(escHtml(seatName(G.current)) + ' — roll.');
    refresh();
    maybeBot();
  }

  function newGame() {
    var n = parseInt($('numPlayers').value, 10);
    var pilots = readPilots();
    var aliases = readAliases();
    while (pilots.length < n) pilots.push(defaultPilot(pilots.length));
    seedRng(Date.now());
    G = {
      n: n,
      players: [],
      current: 0,
      claimedGlobal: {},
      climbing: new Set(),
      climbFloor: {},
      turnStart: {},
      rolls: 0,
      dice: null,
      pending: null,
      phase: 'need_roll',
      winner: null
    };
    var roster = [];
    for (var i = 0; i < n; i++) {
      var fl = {};
      for (var s = 2; s <= 12; s++) fl[s] = 0;
      var pid = pilots[i] || defaultPilot(i);
      var nm;
      if (pid === 'human') { nm = aliases[i] || ('Player ' + (i + 1)); rememberAlias(aliases[i]); }
      else { nm = PILOTS[pid].label; }
      G.players.push({ floor: fl, claimed: new Set(), pilot: pid, name: nm, human: pid === 'human' });
      roster.push(escHtml(nm));
    }
    refreshAliasDatalist();
    startTurn(G);
    $('feed').innerHTML = '';
    feed('New game · ' + roster.join(' · '));
    setStatus(escHtml(seatName(0)) + ' — roll.');
    refresh();
    maybeBot();
  }

  $('numPlayers').onchange = function () { renderSeatSetup(); };
  $('humanSkill').onchange = function () { updateAssistBlurb(); refresh(); };
  $('btnNew').onclick = newGame;
  $('btnRoll').onclick = function () { doRoll(); };
  $('btnStop').onclick = function () { doStop(); };
  $('btnGuide').onclick = function () {
    if (coachPick) choosePairing(coachPick.p, coachPick.priority);
  };

  populateThemePicker();
  applyTheme(lsGet(LS_THEME, 'slate'));
  bustAlertOn = lsGet(LS_BUSTALERT, true);
  (function () {
    var bt = $('bustAlertToggle');
    if (bt) {
      bt.checked = !!bustAlertOn;
      bt.onchange = function () { bustAlertOn = bt.checked; lsSet(LS_BUSTALERT, bustAlertOn); };
    }
  })();
  renderSeatSetup();
  updateAssistBlurb();
  newGame();
})();
