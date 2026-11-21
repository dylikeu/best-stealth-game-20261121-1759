// NIGHTSHIFT — player.js: Rook the thief. Movement, sneaking, hiding,
// noise rings, lives, artifact pickup. The player is a small hooded figure
// with a white outline so they read at a glance against the dark floor.

import { TILE, WALK_SPEED, SNEAK_SPEED, NOISE_RADIUS_TILES } from './config.js';

export class Player {
  constructor(world) {
    this.reset(world);
    this.lives = 3;
    this.artifacts = 0;
    this.radius = 11;
    this.hidden = false; // crouched behind cover / in shadow, out of sight
    this.noiseRings = []; // {x, y, r, maxR, alpha} expanding rings
    this.stepTimer = 0;
    this.facing = 1; // 1 right, -1 left (for the hood drawing)
    this.moving = false;
    this.sneaking = false;
    this.laserGrace = 0; // seconds of immunity right after a laser hit
  }

  reset(world) {
    this.x = world.playerStart.x;
    this.y = world.playerStart.y;
    this.hidden = false;
    this.artifacts = 0; // per-level count; the run total lives on the Game
    this.noiseRings = [];
    this.stepTimer = 0;
    this.laserGrace = 0;
  }

  update(dt, input, world, guards, audio) {
    const mv = input.moveVector();
    this.moving = mv.x !== 0 || mv.y !== 0;
    this.sneaking = input.sneaking;
    const speed = (this.sneaking ? SNEAK_SPEED : WALK_SPEED) * TILE;

    if (this.moving) {
      this.facing = mv.x !== 0 ? Math.sign(mv.x) : this.facing;
      world.moveCircle(this, mv.x * speed * dt, mv.y * speed * dt, this.radius);
      // Footsteps: walking is loud, sneaking is silent.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0 && !this.sneaking) {
        this.stepTimer = 0.42;
        this.noiseRings.push({
          x: this.x,
          y: this.y,
          r: 6,
          maxR: NOISE_RADIUS_TILES * TILE,
          alpha: 0.7,
        });
        const nearest = nearestGuardDistance(this, guards);
        audio.footstep(nearest < 5 * TILE ? 1 - nearest / (5 * TILE) : 0);
      }
    }

    for (const ring of this.noiseRings) {
      ring.r += 260 * dt;
      ring.alpha -= 0.9 * dt;
    }
    this.noiseRings = this.noiseRings.filter((r) => r.alpha > 0 && r.r < r.maxR);

    // Noise draws guards: any guard inside a fresh ring investigates it.
    for (const ring of this.noiseRings) {
      if (ring.r < 20) continue;
      for (const g of guards) {
        if (g.state !== 'alarm' && Math.hypot(g.x - ring.x, g.y - ring.y) < ring.r + 12) {
          if (!g.investigateTarget) {
            g.state = 'suspicious';
            g.investigateTarget = { x: ring.x, y: ring.y };
          }
        }
      }
    }

    // Hiding: crouching behind cover (E toggles) or standing in shadow.
    const tile = world.tileAt(this.x, this.y);
    const nearCover = this._nearCover(world);
    if (input.consumePressed('KeyE')) {
      this.hidden = !this.hidden && nearCover;
      if (this.hidden) audio.suspicious();
    }
    if (!nearCover && this.hidden) this.hidden = false;
    this.inShadow = world.lightAt(this.x, this.y) === 'shadow';

    // Lasers: crossing a live beam spikes every guard's meter.
    if (this.laserGrace > 0) this.laserGrace -= dt;
    const laser = world.laserAt(this.x, this.y);
    if (laser && this.laserGrace <= 0) {
      this.laserGrace = 1.2;
      audio.laserZap();
      for (const g of guards) {
        g.meter = Math.min(100, g.meter + 60);
        g.lastSeen = { x: this.x, y: this.y };
      }
    }
  }

  // Is there a cover tile adjacent to the player (crate, plant, case)?
  _nearCover(world) {
    const { tx, ty } = world.tileAt(this.x, this.y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const t = world.blocksSightTile(tx + dx, ty + dy);
        // Cover blocks sight; walls also count as something to crouch behind.
        if (t) return true;
      }
    }
    return false;
  }

  // Try to pick up an artifact on the player's tile (E, or automatic when
  // standing on one — the game is friendlier with automatic pickup).
  tryPickup(world, audio) {
    const art = world.artifactAt(this.x, this.y);
    if (art) {
      art.taken = true;
      this.artifacts += 1;
      audio.pickup();
      return true;
    }
    return false;
  }
}

function nearestGuardDistance(player, guards) {
  let best = Infinity;
  for (const g of guards) {
    best = Math.min(best, Math.hypot(g.x - player.x, g.y - player.y));
  }
  return best;
}
