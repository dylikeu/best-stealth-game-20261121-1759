// NIGHTSHIFT — audio.js: WebAudio synth, every sound generated in code.
// No audio files, no network. The context is created lazily on the first
// user gesture so headless / autoplay-blocked browsers never throw.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this._riserOsc = null;
    this._riserGain = null;
  }

  // Call from a user gesture (key / click). Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (err) {
      // Audio is decoration; a failure must never break the game.
    }
  }

  // Soft tick. `near` 0..1 raises the volume when a guard is close, so the
  // footsteps themselves tell the player where a guard is.
  footstep(near) {
    this._tone(140 + near * 60, 0.07, 'triangle', 0.05 + near * 0.12);
  }

  // Rising tension while any guard's suspicion climbs.
  riser(level) {
    if (!this.ctx || this.muted) return;
    try {
      if (!this._riserOsc) {
        this._riserOsc = this.ctx.createOscillator();
        this._riserGain = this.ctx.createGain();
        this._riserOsc.type = 'sawtooth';
        this._riserOsc.frequency.value = 110;
        this._riserGain.gain.value = 0;
        this._riserOsc.connect(this._riserGain);
        this._riserGain.connect(this.master);
        this._riserOsc.start();
      }
      const target = level * 0.05;
      this._riserGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      this._riserOsc.frequency.setTargetAtTime(110 + level * 160, this.ctx.currentTime, 0.1);
    } catch (err) {
      // ignore
    }
  }

  stopRiser() {
    if (this._riserGain && this.ctx) {
      this._riserGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  // Two-note alarm sting.
  alarm() {
    this._tone(660, 0.18, 'square', 0.12);
    this._tone(440, 0.3, 'square', 0.12, 0.16);
  }

  // A guard just noticed something: a short "huh" blip.
  suspicious() {
    this._tone(520, 0.1, 'sine', 0.1, 0, 700);
  }

  // Heartbeat thump for a near miss.
  heartbeat() {
    this._tone(70, 0.12, 'sine', 0.22);
    this._tone(60, 0.14, 'sine', 0.18, 0.16);
  }

  pickup() {
    this._tone(880, 0.12, 'sine', 0.14);
    this._tone(1318, 0.22, 'sine', 0.14, 0.09);
  }

  caught() {
    this._tone(220, 0.5, 'sawtooth', 0.14, 0, 110);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.25, 'triangle', 0.14, i * 0.12));
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => this._tone(f, 0.3, 'triangle', 0.12, i * 0.14));
  }

  laserZap() {
    this._tone(1200, 0.08, 'square', 0.08, 0, 300);
  }
}
