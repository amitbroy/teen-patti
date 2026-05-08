// js/rooms.js
const Rooms = (() => {
  function ref(id) { return firebase.database().ref(`tp_rooms/${id}`); }
  function allRef()  { return firebase.database().ref('tp_rooms'); }

  function genId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length: 6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  }

  async function create(host, opts = {}) {
    const id   = genId();
    const boot = Math.max(1, Math.min(50, opts.boot || 5));
    const pts  = Math.max(50, Math.min(100, opts.points || 100));
    const bots = Math.max(0, Math.min(7, opts.bots || 0));

    const players = {};
    players[host] = { points: pts, isBot: false, acceptedRules: false, online: true };
    for (let i = 1; i <= bots; i++) {
      players[`Bot_${i}`] = { points: pts, isBot: true, acceptedRules: true, online: true };
    }

    const room = {
      id, host, boot, pts,
      status: 'waiting',
      players,
      createdAt: Date.now(),
      gameState: null,
      chat: null,
    };
    await ref(id).set(room);
    return room;
  }

  async function join(roomId, username, pts) {
    const snap = await ref(roomId).get();
    if (!snap.exists()) throw new Error('Room not found');
    const room = snap.val();
    if (room.status === 'playing') throw new Error('Game already in progress');
    const players = room.players || {};
    const humanCount = Object.values(players).filter(p => !p.isBot).length;
    if (humanCount >= 8) throw new Error('Room is full');
    if (players[username]) {
      // Rejoin
      await ref(roomId).child(`players/${username}/online`).set(true);
      return room;
    }
    await ref(roomId).child(`players/${username}`).set({
      points: room.pts || pts, isBot: false, acceptedRules: false, online: true
    });
    return { ...room, players: { ...players, [username]: { points: room.pts || pts, isBot: false, acceptedRules: false } } };
  }

  async function acceptRules(roomId, username) {
    await ref(roomId).child(`players/${username}/acceptedRules`).set(true);
  }

  async function get(roomId) {
    const snap = await ref(roomId).get();
    return snap.exists() ? snap.val() : null;
  }

  function listen(roomId, cb) {
    const r = ref(roomId);
    r.on('value', snap => cb(snap.exists() ? snap.val() : null));
    return () => r.off('value');
  }

  function listenChat(roomId, cb) {
    const r = firebase.database().ref(`tp_rooms/${roomId}/chat`);
    r.limitToLast(50).on('child_added', snap => cb(snap.val()));
    return () => r.off('child_added');
  }

  async function sendChat(roomId, username, message) {
    await firebase.database().ref(`tp_rooms/${roomId}/chat`).push({
      username, message: message.slice(0, 200), ts: Date.now()
    });
  }

  async function saveGameState(roomId, state) {
    // Don't store hands in DB (cheat prevention) — store only pot/points/folded/seen/turn
    const safe = {
      phase: state.phase,
      pot:   state.pot,
      stake: state.stake,
      points: state.points,
      folded: state.folded,
      seen:   state.seen,
      order:  state.order,
      turnIdx: state.turnIdx,
      boot:   state.boot,
      log:    state.log.slice(-10),
      winner: state.winner || null,
      winnerReason: state.winnerReason || null,
    };
    await ref(roomId).child('gameState').set(safe);
  }

  async function setStatus(roomId, status) {
    await ref(roomId).update({ status });
  }

  async function updatePoints(roomId, points) {
    await ref(roomId).child('gameState/points').set(points);
  }

  async function deleteRoom(roomId) {
    await ref(roomId).remove();
  }

  async function removePlayer(roomId, username) {
    await ref(roomId).child(`players/${username}`).remove();
    const snap = await ref(roomId).get();
    if (!snap.exists()) return;
    const room = snap.val();
    const humans = Object.entries(room.players || {}).filter(([,p]) => !p.isBot);
    if (humans.length === 0) { await deleteRoom(roomId); return; }
    if (room.host === username) {
      const newHost = humans[0][0];
      await ref(roomId).update({ host: newHost });
    }
  }

  async function getLobbyRooms() {
    const snap = await allRef().orderByChild('status').equalTo('waiting').limitToFirst(20).get();
    if (!snap.exists()) return [];
    return Object.values(snap.val()).filter(r => {
      const humans = Object.values(r.players||{}).filter(p=>!p.isBot).length;
      return humans < 8;
    }).sort((a,b) => b.createdAt - a.createdAt);
  }

  return { create, join, get, listen, listenChat, sendChat, saveGameState,
           setStatus, updatePoints, deleteRoom, removePlayer, getLobbyRooms, acceptRules };
})();
window.Rooms = Rooms;
