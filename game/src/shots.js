// NIGHTSHIFT — shots.js: deterministic staged scenes for screenshots.
// Each ?shot= name builds one fixed game state and renders a single frame,
// so every screenshot is a real render of the game's own code, repeatable
// byte for byte. No hand-played randomness, no animation loop needed.

import { TILE, HUD_H } from './config.js';
import { GUARD_STATES } from './guards.js';

function placePlayer(game, tx, ty, opts = {}) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
  game.player.hidden = !!opts.hidden;
  game.player.sneaking = !!opts.sneaking;
  game.player.artifacts = opts.artifacts || 0;
}

function setGuard(game, index, tx, ty, angle, state, meter) {
  const g = game.guards[index];
  if (!g) return;
  g.x = (tx + 0.5) * TILE;
  g.y = (ty + 0.5) * TILE;
  g.angle = angle;
  g.state = state;
  g.meter = meter;
  g.pauseTimer = 0;
}

// The cover: mid-level tension. Rook crouched in shadow at the edge of a
// guard's yellow cone sweeping toward them, an artifact glinting ahead,
// one guard already suspicious, HUD and minimap visible.
export function shotCover(game) {
  game.loadLevel(0);
  placePlayer(game, 6, 9, { hidden: true, sneaking: true, artifacts: 1 });
  game.world.artifacts[0].taken = true;
  setGuard(game, 0, 10, 6, Math.PI * 0.72, GUARD_STATES.PATROL, 20);
  setGuard(game, 1, 30, 3, Math.PI * 0.5, GUARD_STATES.SUSPICIOUS, 68);
  game.guards[1].lastSeen = { x: 12 * TILE, y: 9 * TILE };
  setGuard(game, 2, 8, 15, -Math.PI * 0.4, GUARD_STATES.PATROL, 0);
  setGuard(game, 3, 30, 11, Math.PI * 0.9, GUARD_STATES.PATROL, 0);
  game.elapsed = 87;
  game.timesSpotted = 0;
}

// Wide view of the Gallery: three guards on patrol with cones, crates and
// plants as cover, lit pools against dark shadow floor, objective list.
export function shotPatrol(game) {
  game.loadLevel(0);
  placePlayer(game, 3, 9, { sneaking: true, artifacts: 0 });
  setGuard(game, 0, 8, 3, Math.PI * 0.5, GUARD_STATES.PATROL, 0);
  setGuard(game, 1, 27, 4, Math.PI * 0.75, GUARD_STATES.PATROL, 12);
  setGuard(game, 2, 12, 15, -Math.PI * 0.3, GUARD_STATES.PATROL, 0);
  setGuard(game, 3, 30, 11, Math.PI * 0.6, GUARD_STATES.PATROL, 0);
  game.elapsed = 34;
}

// The alarm moment: red cones, a guard chasing with "!" overhead, the
// screen-edge pulse, Rook sprinting for cover.
export function shotAlarm(game) {
  game.loadLevel(1);
  placePlayer(game, 14, 8, { artifacts: 2 });
  game.world.artifacts[0].taken = true;
  game.world.artifacts[1].taken = true;
  setGuard(game, 2, 11, 8, 0, GUARD_STATES.ALARM, 100);
  game.guards[2].lastSeen = { x: 14 * TILE, y: 8 * TILE };
  setGuard(game, 3, 20, 9, Math.PI, GUARD_STATES.ALARM, 100);
  setGuard(game, 0, 8, 3, Math.PI * 0.5, GUARD_STATES.SUSPICIOUS, 80);
  setGuard(game, 4, 10, 14, -Math.PI * 0.2, GUARD_STATES.PATROL, 30);
  game.pulse = 0.5;
  game.elapsed = 214;
  game.timesSpotted = 1;
}

// The win screen: all three floors cleared, 9/9 artifacts, rank S.
export function shotWin(game) {
  game.loadLevel(2);
  game.levelIndex = 2;
  game.player.artifacts = 3;
  for (const a of game.world.artifacts) a.taken = true;
  placePlayer(game, 33, 16, { artifacts: 3 });
  game.state = 'win';
  game.elapsed = 486;
  game.timesSpotted = 0;
  game.totalArtifacts = 9;
  game.rank = 'S';
}

export const SHOTS = {
  cover: shotCover,
  patrol: shotPatrol,
  alarm: shotAlarm,
  win: shotWin,
};
