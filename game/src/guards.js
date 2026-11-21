// NIGHTSHIFT — guards.js: patrol AI, vision cones, the detection meter and
// alert states. Guards walk fixed waypoint loops with pauses at lookouts, so
// their routes are learnable and identical every run (seeded, deterministic).
// States: patrol -> suspicious ("?": investigate last seen) -> alarm ("!":
// chase). Getting spotted is a chance to recover, not an instant loss:
// breaking line of sight drains the alarm back down.

import {
  TILE,
  CONE_RANGE_TILES,
  CONE_HALF_ANGLE,
  DETECT_RATE_LIT,
  DETECT_RATE_SHADOW,
  DETECT_DRAIN,
  ALARM_CHASE_SPEED,
} from './config.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALARM: 'alarm',
};

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

// Can this guard see the player right now? Inside the cone, line of sight
// clear, and not hidden behind cover. Returns 'lit' | 'shadow' | null.
export function guardSeesPlayer(guard, player, world) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE_TILES * TILE) return null;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, guard.angle)) > CONE_HALF_ANGLE) return null;
  if (!world.hasLineOfSight(guard.x, guard.y, player.x, player.y)) return null;
  if (player.hidden) return null;
  const light = world.lightAt(player.x, player.y);
  if (world.searchlightAt(player.x, player.y)) return 'lit';
  return light === 'shadow' ? 'shadow' : 'lit';
}

export class Guard {
  constructor(def, world) {
    this.type = def.type; // walker | lookout | runner
    this.speed = def.speed * TILE; // px per second on patrol
    this.waypoints = def.waypoints.map(([tx, ty]) => ({
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
    }));
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.wpIndex = 1 % this.waypoints.length;
    this.angle = 0;
    if (this.type === 'lookout') {
      this.angle = Math.PI / 2;
      this.sweep = def.sweep || Math.PI;
      this.sweepSpeed = def.sweepSpeed || 0.5;
      this.sweepPhase = 0;
      this.sweepBase = Math.PI / 2;
    }
    this.state = GUARD_STATES.PATROL;
    this.meter = 0; // 0..100 detection
    this.pauseTimer = 0;
    this.lastSeen = null; // {x, y}
    this.investigateTarget = null;
    this.loseSightTimer = 0;
    this.chaseSpeed = ALARM_CHASE_SPEED * TILE * (this.type === 'runner' ? 1.15 : 1);
    this.nearMissCooldown = 0;
    this.justSpotted = false; // set the frame the meter first fills
    this.justLost = false; // set the frame an alarm fully drains
    this.world = world;
  }

  get alertColor() {
    if (this.state === GUARD_STATES.ALARM) return '#ff3b30';
    if (this.state === GUARD_STATES.SUSPICIOUS) return '#ff9500';
    return '#ffd60a';
  }

  get mark() {
    if (this.state === GUARD_STATES.ALARM) return '!';
    if (this.state === GUARD_STATES.SUSPICIOUS) return '?';
    return '';
  }

  resetToSpawn() {
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.wpIndex = 1 % this.waypoints.length;
    this.state = GUARD_STATES.PATROL;
    this.meter = 0;
    this.lastSeen = null;
    this.investigateTarget = null;
    this.loseSightTimer = 0;
    this.pauseTimer = 0;
  }

  update(dt, player, world, events) {
    this.justSpotted = false;
    this.justLost = false;
    if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;

    // ---- Detection: the meter fills while seen, drains while hidden. ----
    const seen = guardSeesPlayer(this, player, world);
    if (seen) {
      const rate = seen === 'shadow' ? DETECT_RATE_SHADOW : DETECT_RATE_LIT;
      this.meter = Math.min(100, this.meter + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      if (this.meter >= 100 && this.state !== GUARD_STATES.ALARM) {
        this.state = GUARD_STATES.ALARM;
        this.justSpotted = true;
        events.push({ type: 'alarm', guard: this });
      } else if (this.meter >= 45 && this.state === GUARD_STATES.PATROL) {
        this.state = GUARD_STATES.SUSPICIOUS;
        this.investigateTarget = { x: player.x, y: player.y };
        events.push({ type: 'suspicious', guard: this });
      }
    } else {
      this.meter = Math.max(0, this.meter - DETECT_DRAIN * dt);
      if (this.state === GUARD_STATES.ALARM) {
        this.loseSightTimer += dt;
        if (this.loseSightTimer > 2.5 || this.meter <= 0) {
          this.state = GUARD_STATES.SUSPICIOUS;
          this.investigateTarget = this.lastSeen ? { ...this.lastSeen } : null;
          this.justLost = true;
          events.push({ type: 'lost', guard: this });
        }
      } else if (this.state === GUARD_STATES.SUSPICIOUS && this.meter <= 0) {
        this.state = GUARD_STATES.PATROL;
        this.investigateTarget = null;
      }
    }

    // ---- Near miss: a guard brushes past while the player hides. ----
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (
      distToPlayer < 1.3 * TILE &&
      !seen &&
      player.hidden &&
      this.nearMissCooldown <= 0 &&
      this.state !== GUARD_STATES.ALARM
    ) {
      this.nearMissCooldown = 2.5;
      this.meter = Math.min(100, this.meter + 25);
      events.push({ type: 'nearmiss', guard: this });
    }

    // ---- Movement by state. ----
    if (this.type === 'lookout' && this.state === GUARD_STATES.PATROL) {
      this.sweepPhase += dt * this.sweepSpeed;
      this.angle = this.sweepBase + Math.sin(this.sweepPhase) * (this.sweep / 2);
      return;
    }

    if (this.state === GUARD_STATES.ALARM) {
      // Chase the player's live position.
      const tx = player.x;
      const ty = player.y;
      this._moveToward(tx, ty, this.chaseSpeed, dt, world);
      return;
    }

    if (this.state === GUARD_STATES.SUSPICIOUS && this.investigateTarget) {
      const reached = this._moveToward(
        this.investigateTarget.x,
        this.investigateTarget.y,
        this.speed * 1.5,
        dt,
        world,
      );
      if (reached) {
        // Look around, then give up and go back on patrol.
        this.pauseTimer += dt;
        this.angle += dt * 1.6;
        if (this.pauseTimer > 1.6) {
          this.pauseTimer = 0;
          this.state = GUARD_STATES.PATROL;
          this.investigateTarget = null;
        }
      }
      return;
    }

    // Patrol: walk the waypoint loop, pausing at each lookout point to scan.
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.angle += dt * 0.9; // scan while paused
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const reached = this._moveToward(target.x, target.y, this.speed, dt, world);
    if (reached) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = 1.1; // stop and look around at each waypoint
    }
  }

  // Move toward (tx, ty) at speed; returns true when arrived (within 4 px).
  _moveToward(tx, ty, speed, dt, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const targetAngle = Math.atan2(dy, dx);
    this.angle = turnToward(this.angle, targetAngle, dt * 6);
    // Guards slide around walls the same way the player does.
    const r = 11;
    if (!world.circleHitsSolid(nx, this.y, r)) this.x = nx;
    if (!world.circleHitsSolid(this.x, ny, r)) this.y = ny;
    return false;
  }
}

// A guard touches the player while the alarm is live: caught.
export function guardTouchesPlayer(guard, player) {
  if (guard.state !== GUARD_STATES.ALARM) return false;
  return Math.hypot(guard.x - player.x, guard.y - player.y) < 20;
}
