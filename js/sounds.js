// js/sounds.js  — Web Audio API synthesised sounds, no files needed
class SoundEngine {
  constructor() {
    this.muted = localStorage.getItem('tp_muted') === 'true';
    this._ctx = null;
  }

  _ctx_get() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  }

  _tone(freq, type, dur, vol = 0.3, delay = 0) {
    if (this.muted) return;
    const ctx = this._ctx_get();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  }

  card() {
    this._tone(800, 'triangle', 0.08, 0.2);
    this._tone(600, 'triangle', 0.08, 0.15, 0.06);
  }

  chip() {
    [0, 0.05, 0.1].forEach((d, i) =>
      this._tone(1200 - i * 100, 'sine', 0.07, 0.15, d));
  }

  fold() {
    this._tone(300, 'sawtooth', 0.2, 0.15);
    this._tone(200, 'sawtooth', 0.25, 0.1, 0.15);
  }

  win() {
    const melody = [523, 659, 784, 1047];
    melody.forEach((f, i) => this._tone(f, 'sine', 0.3, 0.4, i * 0.12));
    this._tone(1047, 'triangle', 0.5, 0.3, melody.length * 0.12);
  }

  lose() {
    this._tone(400, 'sawtooth', 0.15, 0.2);
    this._tone(300, 'sawtooth', 0.2, 0.2, 0.18);
    this._tone(220, 'sawtooth', 0.3, 0.15, 0.38);
  }

  tick() { this._tone(880, 'square', 0.04, 0.08); }

  rankUp() {
    [523, 659, 784, 880, 1047, 1319].forEach((f, i) =>
      this._tone(f, 'sine', 0.25, 0.35, i * 0.09));
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('tp_muted', this.muted);
    return this.muted;
  }
}

window.SFX = new SoundEngine();
