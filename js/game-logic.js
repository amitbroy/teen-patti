// js/game-logic.js — Pure JS Teen Patti logic (no backend needed)

const RANKS  = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS  = ['♠','♥','♦','♣'];
const RANK_V = Object.fromEntries(RANKS.map((r, i) => [r, i]));

const HAND = { HIGH:1, PAIR:2, COLOR:3, SEQ:4, PURE_SEQ:5, TRAIL:6 };
const HAND_NAME = {
  1:'High Card', 2:'Pair', 3:'Color (Flush)',
  4:'Sequence', 5:'Pure Sequence', 6:'Trail 🔥'
};

function makeDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
  return d;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardStr(c) { return c.r + c.s; }
function isRed(c)   { return c.s === '♥' || c.s === '♦'; }

function evalHand(cards) {
  const vals  = cards.map(c => RANK_V[c.r]).sort((a, b) => b - a);
  const suits = cards.map(c => c.s);
  const flush = new Set(suits).size === 1;

  const isSeq = (() => {
    const [a, b, c] = vals;
    if (a - c === 2 && a - b === 1) return true;
    if (JSON.stringify([...vals].sort((x,y)=>x-y)) === JSON.stringify([0,1,12])) return true;
    return false;
  })();

  const trail = vals[0] === vals[1] && vals[1] === vals[2];
  const pair  = vals[0] === vals[1] || vals[1] === vals[2];

  if (trail)        return { rank: HAND.TRAIL,    tb: vals };
  if (flush && isSeq) return { rank: HAND.PURE_SEQ, tb: vals };
  if (isSeq)        return { rank: HAND.SEQ,      tb: vals };
  if (flush)        return { rank: HAND.COLOR,    tb: vals };
  if (pair) {
    const pv = vals[0] === vals[1] ? vals[0] : vals[1];
    const kk = vals.find(v => v !== pv);
    return { rank: HAND.PAIR, tb: [pv, kk] };
  }
  return { rank: HAND.HIGH, tb: vals };
}

function compareHands(a, b) {
  const ha = evalHand(a), hb = evalHand(b);
  if (ha.rank !== hb.rank) return ha.rank > hb.rank ? 1 : -1;
  for (let i = 0; i < ha.tb.length; i++) {
    if (ha.tb[i] !== hb.tb[i]) return ha.tb[i] > hb.tb[i] ? 1 : -1;
  }
  return 0;
}

// ── Bot decision ────────────────────────────────────────────────────────────
function botDecide(hand, isBlind, points, stake) {
  if (isBlind) return Math.random() < 0.22 ? 'fold' : 'chaal';
  const { rank } = evalHand(hand);
  const r = Math.random();
  if (rank >= HAND.SEQ)   return r < 0.04 ? 'fold' : 'chaal';
  if (rank >= HAND.COLOR) return r < 0.28 ? 'fold' : 'chaal';
  if (rank >= HAND.PAIR)  return r < 0.42 ? 'fold' : 'chaal';
  return r < 0.58 ? 'fold' : 'chaal';
}

// ── Ranking system ──────────────────────────────────────────────────────────
const RANK_TIERS = [
  { name: 'Rookie',   min: 0,    color: '#b0b0b0', emoji: '🥉' },
  { name: 'Bronze',   min: 100,  color: '#cd7f32', emoji: '🥉' },
  { name: 'Silver',   min: 300,  color: '#c0c0c0', emoji: '🥈' },
  { name: 'Gold',     min: 600,  color: '#ffd700', emoji: '🥇' },
  { name: 'Diamond',  min: 1000, color: '#b9f2ff', emoji: '💎' },
  { name: 'Legend',   min: 2000, color: '#ff6b35', emoji: '👑' },
];

function getRankTier(score) {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) { if (score >= t.min) tier = t; }
  return tier;
}

function calcRankScore(stats) {
  const { wins = 0, losses = 0, totalPointsWon = 0, biggestWin = 0 } = stats;
  const wl = (wins / Math.max(wins + losses, 1)) * 1000;
  return Math.round(wl * 0.5 + Math.min(totalPointsWon, 10000) * 0.03 + Math.min(biggestWin, 500) * 0.2);
}

// ── New round builder ───────────────────────────────────────────────────────
function buildRound(players, boot) {
  const deck  = shuffle(makeDeck());
  const ids   = Object.keys(players);
  const hands = {};
  ids.forEach((id, i) => { hands[id] = deck.slice(i * 3, i * 3 + 3); });

  const points = {};
  ids.forEach(id => { points[id] = (players[id].points || 100) - boot; });

  return {
    phase:        'playing',
    hands,
    seen:         Object.fromEntries(ids.map(id => [id, false])),
    folded:       Object.fromEntries(ids.map(id => [id, false])),
    order:        ids,
    turnIdx:      0,
    stake:        boot,
    pot:          boot * ids.length,
    points,
    boot,
    log:          [],
  };
}

window.TP = {
  HAND, HAND_NAME, RANK_TIERS,
  cardStr, isRed, evalHand, compareHands, botDecide,
  getRankTier, calcRankScore, buildRound, makeDeck, shuffle,
};
