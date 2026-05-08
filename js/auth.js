// js/auth.js
const Auth = (() => {
  let _user = null;

  async function hashPassword(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function usersRef() { return firebase.database().ref('tp_users'); }

  async function register(username, password) {
    username = username.trim().toLowerCase();
    if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');
    if (!/^[a-z0-9_]+$/.test(username))  throw new Error('Only letters, numbers, underscores allowed');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
    const snap = await usersRef().child(username).get();
    if (snap.exists()) throw new Error('Username already taken — please choose another');
    const pwHash = await hashPassword(password);
    const cred = await firebase.auth().signInAnonymously();
    const uid  = cred.user.uid;
    const userData = {
      uid, username, pwHash,
      createdAt: Date.now(),
      stats: { wins:0, losses:0, totalPointsWon:0, biggestWin:0, gamesPlayed:0 },
      rankScore: 0,
    };
    await usersRef().child(username).set(userData);
    _user = userData;
    sessionStorage.setItem('tp_username', username);
    return userData;
  }

  async function login(username, password) {
    username = username.trim().toLowerCase();
    const snap = await usersRef().child(username).get();
    if (!snap.exists()) throw new Error('Username not found');
    const data   = snap.val();
    const pwHash = await hashPassword(password);
    if (pwHash !== data.pwHash) throw new Error('Wrong password');
    await firebase.auth().signInAnonymously();
    _user = data;
    sessionStorage.setItem('tp_username', username);
    return data;
  }

  async function logout() {
    await firebase.auth().signOut();
    sessionStorage.removeItem('tp_username');
    _user = null;
    window.location.hash = '#login';
    location.reload();
  }

  async function restoreSession() {
    const username = sessionStorage.getItem('tp_username');
    if (!username) return null;
    try {
      const snap = await usersRef().child(username).get();
      if (!snap.exists()) return null;
      _user = snap.val();
      return _user;
    } catch(e) { return null; }
  }

  function currentUser() { return _user; }

  async function refreshUser() {
    if (!_user) return;
    const snap = await usersRef().child(_user.username).get();
    if (snap.exists()) _user = snap.val();
    return _user;
  }

  async function updateStats(username, won, pointsDelta, pot) {
    const ref  = usersRef().child(username);
    const snap = await ref.get();
    if (!snap.exists()) return;
    const d = snap.val();
    const s = d.stats || {};
    const wins          = (s.wins  ||0) + (won ? 1 : 0);
    const losses        = (s.losses||0) + (won ? 0 : 1);
    const totalPointsWon= (s.totalPointsWon||0) + Math.max(0, pointsDelta);
    const biggestWin    = Math.max(s.biggestWin||0, won ? pot : 0);
    const gamesPlayed   = (s.gamesPlayed||0) + 1;
    const newStats = { wins, losses, totalPointsWon, biggestWin, gamesPlayed };
    const rankScore = TP.calcRankScore(newStats);
    await ref.update({ stats: newStats, rankScore });
    if (_user && _user.username === username) { _user.stats = newStats; _user.rankScore = rankScore; }
  }

  return { register, login, logout, restoreSession, currentUser, refreshUser, updateStats };
})();
window.Auth = Auth;
