// NIGHTSHIFT — world.js: level loading, collision, line of sight, light & shadow.
// The World parses one level map into grids the other systems query:
//   solid — blocks movement (walls and cover)
//   blocksSight — blocks a guard's vision (walls and cover)
//   light — 'lit' under a lamp, 'shadow' on dark floor, 'normal' elsewhere

import { TILE, COLS, ROWS } from './config.js';

// A wall or cover tile blocks sight; a display case's glass glints but still hides.
function isCoverChar(ch) {
  return ch === 'C' || ch === 'P' || ch === 'D';
}

export class World {
  constructor(levelDef) {
    this.def = levelDef;
    this.solid = [];
    this.blocksSight = [];
    this.light = [];
    this.artifacts = []; // {tx, ty, taken}
    this.exit = null; // {tx, ty}
    this.playerStart = { x: 1.5 * TILE, y: 1.5 * TILE };
    this.coverTiles = []; // {tx, ty, kind} for drawing crates / plants / cases
    this.lampTiles = []; // {tx, ty} lamp pools for drawing
    this.shadowRects = [];
    for (let y = 0; y < ROWS; y++) {
      this.solid.push(new Array(COLS).fill(false));
      this.blocksSight.push(new Array(COLS).fill(false));
      this.light.push(new Array(COLS).fill('normal'));
      for (let x = 0; x < COLS; x++) {
        const ch = levelDef.map[y][x];
        if (ch === '#') {
          this.solid[y][x] = true;
          this.blocksSight[y][x] = true;
        } else if (isCoverChar(ch)) {
          this.solid[y][x] = true;
          this.blocksSight[y][x] = true;
          this.coverTiles.push({ tx: x, ty: y, kind: ch });
        } else if (ch === ',') {
          this.light[y][x] = 'shadow';
        } else if (ch === '*') {
          this.light[y][x] = 'lit';
          this.lampTiles.push({ tx: x, ty: y });
        } else if (ch === 'A') {
          this.artifacts.push({ tx: x, ty: y, taken: false });
        } else if (ch === 'E') {
          this.exit = { tx: x, ty: y };
        } else if (ch === '@') {
          this.playerStart = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
        }
      }
    }
    // Lamp pools glow onto their neighbours so the lit / shadow read is obvious.
    for (const lamp of this.lampTiles) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = lamp.tx + dx;
          const ny = lamp.ty + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.light[ny][nx] === 'normal') {
            this.light[ny][nx] = 'lit';
          }
        }
      }
    }
    // Lasers and searchlights are live state, not map tiles.
    this.lasers = (levelDef.lasers || []).map((lz) => ({ ...lz, on: true }));
    this.searchlights = (levelDef.searchlights || []).map((sl) => ({
      ...sl,
      angle: sl.baseAngle,
    }));
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    for (const lz of this.lasers) {
      const phase = (this.time + lz.phase) % lz.period;
      lz.on = phase < lz.period / 2;
    }
    for (const sl of this.searchlights) {
      sl.angle =
        sl.baseAngle +
        Math.sin(this.time * sl.speed + sl.phase) * (sl.arc / 2);
    }
  }

  tileAt(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return { tx, ty, outside: true };
    return { tx, ty, outside: false };
  }

  isSolidTile(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
    return this.solid[ty][tx];
  }

  blocksSightTile(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
    return this.blocksSight[ty][tx];
  }

  lightAt(px, py) {
    const { tx, ty, outside } = this.tileAt(px, py);
    if (outside) return 'normal';
    return this.light[ty][tx];
  }

  // Circle vs solid tiles: slide along walls instead of sticking.
  moveCircle(pos, dx, dy, radius) {
    const nx = pos.x + dx;
    if (!this.circleHitsSolid(nx, pos.y, radius)) pos.x = nx;
    const ny = pos.y + dy;
    if (!this.circleHitsSolid(pos.x, ny, radius)) pos.y = ny;
  }

  circleHitsSolid(px, py, radius) {
    const minTx = Math.floor((px - radius) / TILE);
    const maxTx = Math.floor((px + radius) / TILE);
    const minTy = Math.floor((py - radius) / TILE);
    const maxTy = Math.floor((py + radius) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.isSolidTile(tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(px, (tx + 1) * TILE));
        const cy = Math.max(ty * TILE, Math.min(py, (ty + 1) * TILE));
        const ddx = px - cx;
        const ddy = py - cy;
        if (ddx * ddx + ddy * ddy < radius * radius) return true;
      }
    }
    return false;
  }

  // Line of sight between two pixel points, sampled every 6 px. Cover and
  // walls block it; floor, shadow and lamps do not.
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor((x0 + dx * t) / TILE);
      const ty = Math.floor((y0 + dy * t) / TILE);
      if (this.blocksSightTile(tx, ty)) return false;
    }
    return true;
  }

  // Is the point inside an active laser beam?
  laserAt(px, py) {
    const { tx, ty } = this.tileAt(px, py);
    for (const lz of this.lasers) {
      if (!lz.on) continue;
      if (tx >= lz.x && tx < lz.x + lz.w && ty >= lz.y && ty < lz.y + lz.h) return lz;
    }
    return null;
  }

  // Is the point inside a sweeping searchlight cone?
  searchlightAt(px, py) {
    for (const sl of this.searchlights) {
      const ox = sl.x * TILE + TILE / 2;
      const oy = sl.y * TILE + TILE / 2;
      const dx = px - ox;
      const dy = py - oy;
      const dist = Math.hypot(dx, dy);
      if (dist > sl.rangeTiles * TILE) continue;
      let ang = Math.atan2(dy, dx) - sl.angle;
      while (ang > Math.PI) ang -= Math.PI * 2;
      while (ang < -Math.PI) ang += Math.PI * 2;
      if (Math.abs(ang) < Math.PI / 6 && this.hasLineOfSight(ox, oy, px, py)) return sl;
    }
    return null;
  }

  artifactsLeft() {
    return this.artifacts.filter((a) => !a.taken).length;
  }

  artifactAt(px, py) {
    const { tx, ty } = this.tileAt(px, py);
    return this.artifacts.find((a) => !a.taken && a.tx === tx && a.ty === ty) || null;
  }

  atExit(px, py) {
    if (!this.exit) return false;
    const { tx, ty } = this.tileAt(px, py);
    return tx === this.exit.tx && ty === this.exit.ty;
  }
}
