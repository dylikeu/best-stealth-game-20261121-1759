// NIGHTSHIFT: The Vault Job — main.js: game loop and state machine.
// States: menu -> intro -> playing -> (paused | caught | levelclear) ->
// next level -> win / gameover. A ?shot= query renders one deterministic
// staged scene instead of starting the loop, for screenshots.

import { TILE, VIEW_W, VIEW_H, HUD_H, LEVELS, TOUCH_GRACE, mulberry32 } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Guard, guardTouchesPlayer, GUARD_STATES } from './guards.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import {
  drawWorld,
  drawHUD,
  drawMenu,
  drawIntro,
  drawPaused,
  drawCaught,
  drawLevelClear,
  drawGameOver,
  drawWin,
} from './render.js';
import { SHOTS } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export class Game {
  constructor() {
    this.input = new Input();
    this.input.attach(canvas);
    this.audio = new AudioSys();
    this.state = 'menu';
    this.levelIndex = 0;
    this.levelDef = LEVELS[0];
    this.world = new World(LEVELS[0]);
    this.player = new Player(this.world);
    this.guards = LEVELS[0].guards.map((g) => new Guard(g, this.world));
    this.time = 0; // wall-clock time inside the game (drives pulses, glints)
    this.elapsed = 0; // run timer, only while playing
    this.levelTime = 0;
    this.timesSpotted = 0;
    this.totalArtifacts = 0; // artifacts stolen across the whole run (9 max)
    this.lives = 3;
    this.rank = 'C';
    this.pulse = 0; // near-miss screen-edge pulse, 0..1
    this.touchTimer = 0; // how long a guard has held contact during alarm
    this.events = [];
    this.rainSeed = [];
    const rng = mulberry32(4242);
    for (let i = 0; i < 180; i++) this.rainSeed.push(rng());
    this._last = 0;
    this._shotDone = false;
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.levelDef = LEVELS[index];
    this.world = new World(this.levelDef);
    this.player.reset(this.world);
    this.player.lives = this.lives;
    this.guards = this.levelDef.guards.map((g) => new Guard(g, this.world));
    this.levelTime = 0;
    this.pulse = 0;
    this.events = [];
  }

  startRun() {
    this.lives = 3;
    this.elapsed = 0;
    this.timesSpotted = 0;
    this.totalArtifacts = 0;
    this.rank = 'C';
    this.loadLevel(0);
    this.state = 'intro';
  }

  nextLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      this.loadLevel(this.levelIndex + 1);
      this.state = 'intro';
    } else {
      this.finishRun();
    }
  }

  finishRun() {
    this.totalArtifacts = this.levelIndex * 3 + this.player.artifacts;
    this.rank = this.timesSpotted === 0 ? 'S' : this.timesSpotted <= 2 ? 'A' : this.timesSpotted <= 5 ? 'B' : 'C';
    this.state = 'win';
    this.audio.win();
  }

  loseLife() {
    this.lives -= 1;
    this.player.lives = this.lives;
    this.audio.caught();
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.audio.lose();
    } else {
      this.state = 'caught';
    }
  }

  update(dt) {
    this.time += dt;
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 1.4);

    if (this.state === 'menu') {
      if (this.input.consumePressed('Enter') || this.input.consumeClick()) {
        this.audio.ensure();
        this.startRun();
      }
      return;
    }
    if (this.state === 'intro') {
      if (this.input.consumePressed('Enter') || this.input.consumeClick()) {
        this.audio.ensure();
        this.state = 'playing';
      }
      return;
    }
    if (this.state === 'paused') {
      if (this.input.consumePressed('KeyP') || this.input.consumePressed('Escape')) {
        this.state = 'playing';
      }
      if (this.input.consumePressed('KeyR')) {
        this.loadLevel(this.levelIndex);
        this.state = 'playing';
      }
      return;
    }
    if (this.state === 'caught') {
      if (this.input.consumePressed('Enter') || this.input.consumeClick()) {
        this.loadLevel(this.levelIndex);
        this.state = 'intro';
      }
      return;
    }
    if (this.state === 'levelclear') {
      if (this.input.consumePressed('Enter') || this.input.consumeClick()) {
        this.nextLevel();
      }
      return;
    }
    if (this.state === 'gameover' || this.state === 'win') {
      if (this.input.consumePressed('Enter') || this.input.consumeClick()) {
        this.startRun();
      }
      return;
    }
    if (this.state !== 'playing') return;

    // ---- playing ----
    this.elapsed += dt;
    this.levelTime += dt;
    this.world.update(dt);
    this.player.update(dt, this.input, this.world, this.guards, this.audio);
    this.player.tryPickup(this.world, this.audio);

    this.events.length = 0;
    for (const g of this.guards) g.update(dt, this.player, this.world, this.events);
    for (const ev of this.events) {
      if (ev.type === 'alarm') {
        this.timesSpotted += 1;
        this.audio.alarm();
      } else if (ev.type === 'suspicious') {
        this.audio.suspicious();
      } else if (ev.type === 'nearmiss') {
        this.pulse = 1;
        this.audio.heartbeat();
      } else if (ev.type === 'lost') {
        this.audio.stopRiser();
      }
    }
    // The riser follows the highest suspicion in the room.
    const top = Math.max(0, ...this.guards.map((g) => g.meter));
    if (top > 20) this.audio.riser(top / 100);
    else this.audio.stopRiser();

    // Caught: a guard touches the player while the alarm is live. The
    // touch must hold for a short grace so a near miss can still slip away.
    let touching = false;
    for (const g of this.guards) {
      if (guardTouchesPlayer(g, this.player)) {
        touching = true;
        break;
      }
    }
    if (touching) {
      this.touchTimer += dt;
      if (this.touchTimer >= TOUCH_GRACE) {
        this.touchTimer = 0;
        this.loseLife();
        // Reset the room so the retry is fair: guards home, player at the
        // door, and the floor's artifacts back on their pedestals.
        for (const gg of this.guards) gg.resetToSpawn();
        for (const a of this.world.artifacts) a.taken = false;
        this.player.reset(this.world);
      }
    } else {
      this.touchTimer = 0;
    }

    // Level complete: all artifacts, then stand on the exit.
    if (this.world.artifactsLeft() === 0 && this.world.atExit(this.player.x, this.player.y)) {
      this.state = 'levelclear';
      this.audio.win();
    }

    if (this.input.consumePressed('KeyP') || this.input.consumePressed('Escape')) {
      this.state = 'paused';
    }
    if (this.input.consumePressed('KeyR')) {
      this.loadLevel(this.levelIndex);
      this.state = 'playing';
    }
    if (this.input.consumePressed('KeyM')) {
      this.audio.toggleMute();
    }
  }

  render() {
    if (this.state === 'menu') {
      drawMenu(ctx, this);
      return;
    }
    drawWorld(ctx, this);
    drawHUD(ctx, this);
    if (this.state === 'intro') drawIntro(ctx, this);
    else if (this.state === 'paused') drawPaused(ctx);
    else if (this.state === 'caught') drawCaught(ctx, this);
    else if (this.state === 'levelclear') drawLevelClear(ctx, this);
    else if (this.state === 'gameover') drawGameOver(ctx, this);
    else if (this.state === 'win') drawWin(ctx, this);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this._last) / 1000 || 0.016);
    this._last = now;
    this.update(dt);
    this.render();
    this.input.endFrame();
  }
}

function boot() {
  const game = new Game();
  window.__game = game; // play-tests drive the game through this handle
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && SHOTS[shot]) {
    // Screenshot mode: stage one fixed scene, render one frame, stop.
    game.state = 'playing';
    SHOTS[shot](game);
    game.render();
    window.__shotReady = true;
    document.title = `NIGHTSHIFT shot ${shot}`;
    return;
  }
  const loop = (now) => {
    game.frame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
