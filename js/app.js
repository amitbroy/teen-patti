// js/app.js — SPA controller
let currentRoomId = null;
let roomListener  = null;
let chatListener  = null;
let localState    = null; // full round state (with hands) only in host's memory

// ── Router ──────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${id}`);
  if (el) el.classList.add('active');
  document.getElementById('app-nav').style.display =
    (id === 'auth') ? 'none' : 'flex';
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  firebase.initializeApp(window.FIREBASE_CONFIG);
  updateMuteBtn();

  const user = await Auth.restoreSession();
  if (user) {
    renderNav(user);
    showPage('lobby');
    loadLobby();
  } else {
    showPage('auth');
  }
});

// ── Auth forms ───────────────────────────────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`form-${tab}`).classList.remove('hidden');
}

async function doRegister() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const err      = document.getElementById('reg-err');
  err.classList.remove('show');
  if (password !== confirm) { err.textContent = 'Passwords do not match'; err.classList.add('show'); return; }
  try {
    const user = await Auth.register(username, password);
    renderNav(user); showPage('lobby'); loadLobby();
  } catch(e) { err.textContent = e.message; err.classList.add('show'); }
}

async function doLogin() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-err');
  err.classList.remove('show');
  try {
    const user = await Auth.login(username, password);
    renderNav(user); showPage('lobby'); loadLobby();
  } catch(e) { err.textContent = e.message; err.classList.add('show'); }
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function renderNav(user) {
  document.getElementById('nav-username').textContent = user.username;
  const tier = TP.getRankTier(user.rankScore || 0);
  document.getElementById('nav-tier').textContent = `${tier.emoji} ${tier.name}`;
}

function updateMuteBtn() {
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = SFX.muted ? '🔇' : '🔊';
}

function toggleMute() { SFX.toggleMute(); updateMuteBtn(); }

async function doLogout() { await Auth.logout(); }

// ── Lobby ────────────────────────────────────────────────────────────────────
async function loadLobby() {
  const user = Auth.currentUser();
  if (!user) return;

  const stats = user.stats || {};
  document.getElementById('stat-wins').textContent  = stats.wins || 0;
  document.getElementById('stat-losses').textContent= stats.losses || 0;
  document.getElementById('stat-pts').textContent   = stats.totalPointsWon || 0;
  document.getElementById('stat-best').textContent  = stats.biggestWin || 0;

  const tier = TP.getRankTier(user.rankScore || 0);
  const badge = document.getElementById('rank-badge');
  badge.textContent = `${tier.emoji} ${tier.name} · ${user.rankScore || 0} pts`;
  badge.style.color = tier.color;
  badge.style.borderColor = tier.color;

  // Load open rooms
  try {
    const rooms = await Rooms.getLobbyRooms();
    const list = document.getElementById('open-rooms-list');
    list.innerHTML = '';
    if (!rooms.length) {
      list.innerHTML = '<div style="color:var(--text-dim);font-size:.85rem;text-align:center;padding:.5rem">No open rooms — create one!</div>';
    } else {
      rooms.forEach(r => {
        const humans = Object.values(r.players||{}).filter(p=>!p.isBot).length;
        const bots   = Object.values(r.players||{}).filter(p=>p.isBot).length;
        const div = document.createElement('div');
        div.className = 'room-item';
        div.innerHTML = `<div><div class="room-item-id">${r.id}</div><div class="room-item-meta">Host: ${r.host} · ${humans} players${bots?` · ${bots} bots`:''} · Boot: ${r.boot}</div></div>
          <button class="btn-secondary" style="font-size:.8rem;padding:.35rem .8rem" onclick="quickJoin('${r.id}')">Join</button>`;
        list.appendChild(div);
      });
    }
  } catch(e) { console.log('rooms load err', e); }
}

async function quickJoin(roomId) {
  document.getElementById('join-input').value = roomId;
  await doJoinRoom();
}

// ── Create room ───────────────────────────────────────────────────────────────
function showCreateRoom() {
  showPage('create');
  updateSliders();
}

function updateSliders() {
  document.getElementById('boot-val').textContent  = document.getElementById('boot-slider').value;
  document.getElementById('pts-val').textContent   = document.getElementById('pts-slider').value;
  document.getElementById('bots-val').textContent  = document.getElementById('bots-slider').value;
}

async function doCreateRoom() {
  const user = Auth.currentUser();
  if (!user) return;
  const boot = parseInt(document.getElementById('boot-slider').value);
  const pts  = parseInt(document.getElementById('pts-slider').value);
  const bots = parseInt(document.getElementById('bots-slider').value);
  try {
    const room = await Rooms.create(user.username, { boot, points: pts, bots });
    currentRoomId = room.id;
    showRulesPage(room);
  } catch(e) { alert(e.message); }
}

// ── Join room ────────────────────────────────────────────────────────────────
async function doJoinRoom() {
  const user   = Auth.currentUser();
  const roomId = document.getElementById('join-input').value.trim().toUpperCase();
  if (!roomId) return;
  try {
    const room = await Rooms.join(roomId, user.username, 100);
    currentRoomId = roomId;
    showRulesPage(room);
  } catch(e) { Effects.toast(e.message, 'info', 2500); }
}

// ── Rules page ───────────────────────────────────────────────────────────────
function showRulesPage(room) {
  showPage('rules');
  document.getElementById('rules-room-id').textContent = room.id;
  document.getElementById('rules-boot').textContent    = room.boot;
  document.getElementById('rules-seen').textContent    = room.boot * 2;
  document.getElementById('rules-pts').textContent     = room.pts;
  document.getElementById('share-room-id').textContent = room.id;
  document.getElementById('accept-btn').disabled = true;
  document.getElementById('accept-check').checked = false;
}

function toggleAccept() {
  document.getElementById('accept-btn').disabled = !document.getElementById('accept-check').checked;
}

async function doAcceptRules() {
  const user = Auth.currentUser();
  await Rooms.acceptRules(currentRoomId, user.username);
  enterGameRoom();
}

function copyRoomId() {
  navigator.clipboard.writeText(currentRoomId);
  Effects.toast('Room ID copied! 📋', 'info', 1800);
}

// ── Game room ────────────────────────────────────────────────────────────────
function enterGameRoom() {
  showPage('game');
  document.getElementById('game-room-id').textContent = currentRoomId;
  localState = null;

  // Cleanup old listeners
  if (roomListener) { roomListener(); roomListener = null; }
  if (chatListener) { chatListener(); chatListener = null; }

  roomListener = Rooms.listen(currentRoomId, onRoomUpdate);

  const user = Auth.currentUser();
  const room = null; // will come from listener

  // chat listener set after we know if humans only
}

let _lastRoomData = null;
function onRoomUpdate(room) {
  if (!room) return;
  _lastRoomData = room;

  const user     = Auth.currentUser();
  const isHost   = room.host === user.username;
  const players  = room.players || {};
  const humans   = Object.values(players).filter(p => !p.isBot);
  const onlyBots = humans.length <= 1;

  // Setup chat listener once
  if (!chatListener && !onlyBots) {
    chatListener = Rooms.listenChat(currentRoomId, onChatMessage);
    document.getElementById('chat-section').classList.remove('hidden');
  } else if (onlyBots) {
    document.getElementById('chat-section').classList.add('hidden');
  }

  renderSidebarPlayers(players, room.gameState);
  document.getElementById('start-btn-wrap').classList.toggle('hidden', !isHost || room.status === 'playing');
  document.getElementById('game-pot').textContent = room.gameState ? `🏺 Pot: ${room.gameState.pot}` : '🏺 Waiting...';

  if (room.status === 'playing' && room.gameState) {
    renderGameState(room.gameState, players);
  } else if (room.status === 'waiting') {
    showWaitingOverlay(true, Object.keys(players).length);
  }

  // If host and it's a bot's turn, run bot logic locally
  if (isHost && room.status === 'playing' && localState) {
    const gs = room.gameState;
    if (gs && gs.phase === 'playing') {
      const cp = currentTurnPlayer(gs);
      if (cp && players[cp] && players[cp].isBot) {
        scheduleBotTurn(cp, gs);
      }
    }
  }
}

function showWaitingOverlay(show, playerCount) {
  let ov = document.getElementById('waiting-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'waiting-overlay';
    ov.className = 'waiting-overlay';
    document.querySelector('.game-felt').appendChild(ov);
  }
  if (show) {
    ov.innerHTML = `<div class="spinner"></div>
      <h2>Waiting for players…</h2>
      <p>${playerCount}/2 minimum — share Room ID <strong style="color:var(--turmeric)">${currentRoomId}</strong></p>`;
    ov.style.display = 'flex';
  } else {
    ov.style.display = 'none';
  }
}

function currentTurnPlayer(gs) {
  const active = gs.order.filter(p => !gs.folded[p]);
  if (!active.length) return null;
  return active[gs.turnIdx % active.length];
}

function renderGameState(gs, players) {
  showWaitingOverlay(false);
  const user = Auth.currentUser();
  document.getElementById('game-pot').textContent = `🏺 Pot: ${gs.pot}`;

  // Points
  const myPts = gs.points[user.username];
  document.getElementById('my-pts').textContent = `${myPts ?? '—'} pts`;

  // Seen badge
  if (gs.seen && gs.seen[user.username]) {
    document.getElementById('seen-pill').style.display = 'inline';
    if (localState) renderMyCards(localState.hands[user.username], true);
  }

  // Opponents
  renderOpponents(gs, players);

  // Turn
  const cp = currentTurnPlayer(gs);
  const isMyTurn = cp === user.username;
  const turnEl = document.getElementById('turn-indicator');
  turnEl.textContent = cp ? (isMyTurn ? '⭐ Your turn!' : `${cp}'s turn`) : '';
  turnEl.className   = 'turn-indicator' + (isMyTurn ? ' my-go' : '');

  // Actions
  document.getElementById('action-bar').style.display = isMyTurn && gs.phase === 'playing' ? 'flex' : 'none';
  if (isMyTurn) {
    const hasSeen = gs.seen && gs.seen[user.username];
    document.getElementById('btn-see').style.display  = hasSeen ? 'none' : 'inline-flex';
    document.getElementById('btn-show').style.display = hasSeen ? 'inline-flex' : 'none';
  }

  // Log
  const logEl = document.getElementById('round-log');
  logEl.innerHTML = '';
  (gs.log || []).slice(-8).forEach(l => {
    const li = document.createElement('li'); li.textContent = l; logEl.appendChild(li);
  });
  logEl.scrollTop = logEl.scrollHeight;

  // Check if round ended
  if (gs.phase === 'ended' || gs.winner) {
    showEndModal(gs, players);
  }
}

function renderOpponents(gs, players) {
  const user = Auth.currentUser();
  const area = document.getElementById('opponents-row');
  area.innerHTML = '';
  for (const [pid, pdata] of Object.entries(players)) {
    if (pid === user.username) continue;
    const folded = gs.folded && gs.folded[pid];
    const seen   = gs.seen   && gs.seen[pid];
    const isBot  = pdata.isBot;
    const cp     = currentTurnPlayer(gs);
    const pts    = gs.points ? gs.points[pid] : pdata.points;
    const div    = document.createElement('div');
    div.className = `opp-slot${folded ? ' folded' : ''}${cp===pid ? ' active-turn' : ''}`;
    div.innerHTML = `
      <div class="opp-cards">
        <div class="card-back sm">🂠</div>
        <div class="card-back sm">🂠</div>
        <div class="card-back sm">🂠</div>
      </div>
      <div class="opp-name">${pid}${isBot?' 🤖':''}</div>
      <div class="opp-pts">${pts??'—'} pts</div>
      ${seen?'<div style="position:absolute;top:-7px;right:-7px;background:var(--peacock);border-radius:50%;width:16px;height:16px;font-size:.6rem;display:flex;align-items:center;justify-content:center">👁</div>':''}
    `;
    area.appendChild(div);
  }
}

function renderSidebarPlayers(players, gs) {
  const user = Auth.currentUser();
  const ul   = document.getElementById('sidebar-players');
  ul.innerHTML = '';
  const cp = gs ? currentTurnPlayer(gs) : null;
  for (const [pid, pdata] of Object.entries(players)) {
    const folded = gs && gs.folded && gs.folded[pid];
    const pts    = gs && gs.points ? gs.points[pid] : pdata.points;
    const li = document.createElement('li');
    li.className = (cp===pid?' active-turn':'') + (folded?' folded-player':'');
    li.innerHTML = `<span>${pid === user.username ? '⭐ You' : pid}${pdata.isBot?' 🤖':''}</span><span class="pts-pill">${pts??'—'}</span>`;
    ul.appendChild(li);
  }
}

function renderMyCards(cards, revealed) {
  const el = document.getElementById('my-cards');
  if (!cards || !cards.length) return;
  el.innerHTML = '';
  cards.forEach((c, i) => {
    const div = document.createElement('div');
    if (revealed) {
      const red = TP.isRed(c);
      div.className = `card ${red ? 'red' : 'black'} deal-anim`;
      div.style.animationDelay = `${i*0.08}s`;
      div.innerHTML = `<span>${c.r}</span><span class="suit">${c.s}</span>`;
    } else {
      div.className = 'card-back deal-anim';
      div.style.animationDelay = `${i*0.08}s`;
      div.textContent = '🂠';
    }
    el.appendChild(div);
    SFX.card();
  });
}

// ── Start game (host only) ───────────────────────────────────────────────────
async function startGame() {
  const room = _lastRoomData;
  if (!room) return;
  const players = room.players || {};
  if (Object.keys(players).length < 2) {
    Effects.toast('Need at least 2 players or bots!', 'info', 2000); return;
  }
  const allAccepted = Object.entries(players).every(([,p]) => p.isBot || p.acceptedRules);
  if (!allAccepted) {
    Effects.toast('Some players haven\'t accepted rules yet!', 'info', 2500); return;
  }

  const round = TP.buildRound(players, room.boot);
  localState  = round; // host keeps full state including hands

  await Rooms.setStatus(currentRoomId, 'playing');
  await Rooms.saveGameState(currentRoomId, round);

  const user = Auth.currentUser();
  renderMyCards(round.hands[user.username], false);
  SFX.chip();

  // Trigger bot if first turn is bot
  const cp = currentTurnPlayer(round);
  if (cp && players[cp] && players[cp].isBot) {
    scheduleBotTurn(cp, round);
  }
}

// ── Player actions ───────────────────────────────────────────────────────────
async function doAction(action) {
  const user = Auth.currentUser();
  if (!localState || localState.phase !== 'playing') return;

  if (action === 'see') {
    localState.seen[user.username] = true;
    renderMyCards(localState.hands[user.username], true);
    document.getElementById('seen-pill').style.display = 'inline';
    document.getElementById('btn-see').style.display  = 'none';
    document.getElementById('btn-show').style.display = 'inline-flex';
    localState.log.push(`${user.username} looked at their cards 👁`);
    await Rooms.saveGameState(currentRoomId, localState);
    SFX.tick();
    return;
  }

  if (action === 'chaal') {
    const seen   = localState.seen[user.username];
    const stake  = seen ? localState.stake * 2 : localState.stake;
    localState.player_points = localState.points; // alias fix
    localState.points[user.username] = (localState.points[user.username] || 0) - stake;
    localState.pot   += stake;
    if (seen) localState.stake = stake;
    localState.log.push(`${user.username} chaal'd ${stake} pts`);
    SFX.chip();
    advanceTurn(localState);
  } else if (action === 'fold') {
    localState.folded[user.username] = true;
    localState.log.push(`${user.username} folded 🙁`);
    SFX.fold();
  }

  await Rooms.saveGameState(currentRoomId, localState);
  checkRoundEnd(localState);
}

function advanceTurn(state) {
  const active = state.order.filter(p => !state.folded[p]);
  if (!active.length) return;
  state.turnIdx = (state.turnIdx + 1) % active.length;
}

async function doShow(target) {
  const user   = Auth.currentUser();
  closeShowModal();
  if (!localState) return;
  const res = TP.compareHands(localState.hands[user.username], localState.hands[target]);
  const winner = res >= 0 ? user.username : target;
  localState.phase       = 'ended';
  localState.winner      = winner;
  localState.winnerReason = 'show';
  localState.showCards   = { [user.username]: localState.hands[user.username], [target]: localState.hands[target] };
  localState.log.push(`Show: ${user.username} vs ${target} → ${winner} wins!`);
  await Rooms.saveGameState(currentRoomId, localState);
  await finishRound(localState);
}

// ── Bot turns ────────────────────────────────────────────────────────────────
function scheduleBotTurn(botId, gs) {
  if (!localState) return;
  const delay = 1200 + Math.random() * 800;
  setTimeout(async () => {
    if (!localState || localState.phase !== 'playing') return;
    const cp = currentTurnPlayer(localState);
    if (cp !== botId) return; // state changed

    const hand    = localState.hands[botId] || [];
    const isBlind = !localState.seen[botId];
    const pts     = localState.points[botId] || 0;
    const action  = TP.botDecide(hand, isBlind, pts, localState.stake);

    if (action === 'fold') {
      localState.folded[botId] = true;
      localState.log.push(`${botId} folded`);
      SFX.fold();
    } else {
      const stake = isBlind ? localState.stake : localState.stake * 2;
      localState.points[botId] = (localState.points[botId] || 0) - stake;
      localState.pot += stake;
      localState.log.push(`${botId} chaal'd ${stake} pts`);
      SFX.chip();
      advanceTurn(localState);
    }

    await Rooms.saveGameState(currentRoomId, localState);
    const ended = checkRoundEnd(localState);
    if (!ended) {
      const nextCp = currentTurnPlayer(localState);
      const room   = _lastRoomData;
      if (nextCp && room && room.players[nextCp] && room.players[nextCp].isBot) {
        scheduleBotTurn(nextCp, localState);
      }
    }
  }, delay);
}

function checkRoundEnd(state) {
  const active = state.order.filter(p => !state.folded[p]);
  if (active.length <= 1) {
    state.phase  = 'ended';
    state.winner = active[0] || state.order[0];
    state.winnerReason = 'last standing';
    finishRound(state);
    return true;
  }
  return false;
}

async function finishRound(state) {
  const winner = state.winner;
  state.points[winner] = (state.points[winner] || 0) + state.pot;
  state.phase = 'ended';
  await Rooms.saveGameState(currentRoomId, state);

  // Update stats for human players
  const room = _lastRoomData;
  if (room) {
    const user = Auth.currentUser();
    const humanPlayers = Object.entries(room.players || {}).filter(([,p]) => !p.isBot);
    for (const [pid] of humanPlayers) {
      const prevPts  = room.players[pid].points || 100;
      const newPts   = state.points[pid] || 0;
      const delta    = newPts - prevPts;
      const won      = pid === winner;
      await Auth.updateStats(pid, won, delta, state.pot);
    }
    // Update room player points
    const updatedPlayers = { ...room.players };
    for (const pid of Object.keys(updatedPlayers)) {
      updatedPlayers[pid] = { ...updatedPlayers[pid], points: state.points[pid] || 0 };
    }
    await firebase.database().ref(`tp_rooms/${currentRoomId}/players`).set(updatedPlayers);
    await Rooms.setStatus(currentRoomId, 'waiting');
    await Auth.refreshUser();
    renderNav(Auth.currentUser());
  }
}

// ── End modal ────────────────────────────────────────────────────────────────
function showEndModal(gs, players) {
  if (!gs.winner) return;
  const user  = Auth.currentUser();
  const won   = gs.winner === user.username;
  const modal = document.getElementById('end-modal');
  if (modal.classList.contains('open')) return; // already shown

  document.getElementById('end-winner-text').textContent = won ? '🎉 You Win!' : `${gs.winner} wins!`;
  document.getElementById('end-pot-text').textContent    = `Pot of ${gs.pot} points collected`;

  // Show reveal hands
  const handsEl = document.getElementById('end-hands');
  handsEl.innerHTML = '';
  if (localState) {
    for (const [pid, cards] of Object.entries(localState.hands)) {
      const { rank } = TP.evalHand(cards);
      const div = document.createElement('div');
      div.className = 'end-hand';
      div.textContent = `${pid}: ${cards.map(TP.cardStr).join(' ')} — ${TP.HAND_NAME[rank]}`;
      handsEl.appendChild(div);
    }
  }

  modal.classList.add('open');

  if (won) {
    Effects.winCelebration(gs.pot);
    // Check rank change
    const prev  = Auth.currentUser();
    const score = prev.rankScore || 0;
    const tier  = TP.getRankTier(score);
    setTimeout(async () => {
      await Auth.refreshUser();
      const newScore = Auth.currentUser().rankScore || 0;
      const newTier  = TP.getRankTier(newScore);
      if (newTier.name !== tier.name) Effects.rankUpCelebration(newTier.name);
      renderNav(Auth.currentUser());
    }, 1500);
  } else {
    Effects.loseCelebration();
  }
}

function closeEndModal() {
  document.getElementById('end-modal').classList.remove('open');
  localState = null;
  document.getElementById('my-cards').innerHTML = `
    <div class="card-back">🂠</div>
    <div class="card-back">🂠</div>
    <div class="card-back">🂠</div>`;
  document.getElementById('action-bar').style.display = 'none';
  document.getElementById('seen-pill').style.display  = 'none';
}

function openShowModal() {
  const user  = Auth.currentUser();
  const gs    = _lastRoomData && _lastRoomData.gameState;
  const room  = _lastRoomData;
  if (!gs || !room) return;
  const ul = document.getElementById('show-target-list');
  ul.innerHTML = '';
  const active = gs.order.filter(p => !gs.folded[p] && p !== user.username);
  active.forEach(pid => {
    const li = document.createElement('li');
    li.innerHTML = `<button class="btn-secondary" onclick="doShow('${pid}')">${pid} (${gs.points[pid]??'—'} pts)</button>`;
    ul.appendChild(li);
  });
  document.getElementById('show-modal').classList.add('open');
}
function closeShowModal() { document.getElementById('show-modal').classList.remove('open'); }

// ── Chat ─────────────────────────────────────────────────────────────────────
function onChatMessage(msg) {
  const ul  = document.getElementById('chat-messages');
  const li  = document.createElement('div');
  li.className = 'chat-msg';
  li.innerHTML = `<span class="chat-user">${msg.username}:</span> ${escHtml(msg.message)}`;
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
}

async function sendChat() {
  const user  = Auth.currentUser();
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg || !currentRoomId) return;
  await Rooms.sendChat(currentRoomId, user.username, msg);
  input.value = '';
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function showLeaderboard() {
  showPage('leaderboard');
  const snap = await firebase.database().ref('tp_users').get();
  if (!snap.exists()) return;
  const users = Object.values(snap.val());
  users.sort((a, b) => (b.rankScore||0) - (a.rankScore||0));
  const tbody = document.getElementById('lb-tbody');
  tbody.innerHTML = '';
  const me = Auth.currentUser();
  users.slice(0, 30).forEach((u, i) => {
    const s    = u.stats || {};
    const tier = TP.getRankTier(u.rankScore||0);
    const tr   = document.createElement('tr');
    if (u.username === me.username) tr.classList.add('self-row');
    const medals = ['🥇','🥈','🥉'];
    tr.innerHTML = `
      <td class="lb-rank">${medals[i]||i+1}</td>
      <td><span style="color:${tier.color}">${tier.emoji}</span> ${u.username}</td>
      <td class="lb-score">${u.rankScore||0}</td>
      <td>${s.wins||0}/${s.losses||0}</td>
      <td>${s.totalPointsWon||0}</td>
      <td>${s.biggestWin||0}</td>
      <td>${s.gamesPlayed||0}</td>`;
    tbody.appendChild(tr);
  });
}

// ── Leave ────────────────────────────────────────────────────────────────────
async function leaveRoom() {
  if (!currentRoomId) { showPage('lobby'); loadLobby(); return; }
  const user = Auth.currentUser();
  if (roomListener) { roomListener(); roomListener = null; }
  if (chatListener) { chatListener(); chatListener = null; }
  await Rooms.removePlayer(currentRoomId, user.username);
  currentRoomId = null; localState = null;
  showPage('lobby'); loadLobby();
}

// ── Utils ────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Enter key handlers
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.page.active');
    if (!active) return;
    if (active.id === 'page-auth') {
      const loginForm = document.getElementById('form-login');
      if (!loginForm.classList.contains('hidden')) doLogin();
      else doRegister();
    }
    if (active.id === 'page-game') {
      const ci = document.getElementById('chat-input');
      if (document.activeElement === ci) sendChat();
    }
  }
});
