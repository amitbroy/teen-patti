// js/effects.js — confetti, rank-up flash, motivational messages

const Effects = (() => {
  const WIN_MSGS  = ['🎉 Ek dum mast!', '🔥 Champion!', '💰 Paisa hi paisa!',
                     '👑 Raja babu!', '🃏 Ustaaad!', '🌟 Incredible!'];
  const LOSE_MSGS = ['😤 Agle baar pakka!', '🙏 Hari Om…', '😅 Luck wasn\'t today',
                     '💪 Practice more!', '🎯 So close!'];
  const RANKUP_MSGS = ['🏆 RANK UP! You\'re on fire!', '⬆️ Moving up the ladder!',
                       '💎 New tier unlocked!', '👑 The crown awaits!'];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function confetti(count = 80) {
    const colors = ['#ff6b35','#ffd700','#ff3d9a','#00e5ff','#76ff03','#ff6b6b','#fff'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        left:${Math.random()*100}vw; top:-10px;
        width:${6+Math.random()*8}px; height:${10+Math.random()*8}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>0.5?'50%':'2px'};
        animation: confettiFall ${1.5+Math.random()*2}s ease-in forwards;
        animation-delay:${Math.random()*0.8}s;
        transform: rotate(${Math.random()*360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }
  }

  function toast(msg, type = 'win', duration = 3000) {
    const el = document.createElement('div');
    el.className = `tp-toast tp-toast--${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('tp-toast--show'));
    setTimeout(() => {
      el.classList.remove('tp-toast--show');
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  function winCelebration(pot) {
    confetti(120);
    SFX.win();
    toast(`${rand(WIN_MSGS)} +${pot} pts`, 'win', 3500);
  }

  function loseCelebration() {
    SFX.lose();
    toast(rand(LOSE_MSGS), 'lose', 2500);
  }

  function rankUpCelebration(tierName) {
    confetti(60);
    SFX.rankUp();
    toast(`${rand(RANKUP_MSGS)} → ${tierName}`, 'rankup', 4000);
  }

  function dealAnimation(cardEl, delay = 0) {
    cardEl.style.animation = 'none';
    cardEl.style.opacity   = '0';
    cardEl.style.transform = 'translateY(-40px) rotate(-8deg) scale(0.8)';
    setTimeout(() => {
      cardEl.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cardEl.style.opacity    = '1';
      cardEl.style.transform  = 'translateY(0) rotate(0) scale(1)';
    }, delay);
  }

  function chipAnimation(el) {
    el.classList.add('chip-bounce');
    setTimeout(() => el.classList.remove('chip-bounce'), 600);
  }

  return { confetti, toast, winCelebration, loseCelebration, rankUpCelebration, dealAnimation, chipAnimation, rand, WIN_MSGS };
})();
window.Effects = Effects;
