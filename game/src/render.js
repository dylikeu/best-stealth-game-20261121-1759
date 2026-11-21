// NIGHTSHIFT — render.js: all canvas drawing. Dark museum at night: deep
// blue-black floors, warm amber lamp pools, cream walls, a red carpet runner.
// Guards in dark uniforms with YELLOW cones read against the floor; the
// player is a hooded figure with a white outline. Lit floor = risky,
// shadow floor = safe — the lighting shows what is safe at a glance.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, HUD_H, CONE_RANGE_TILES, CONE_HALF_ANGLE } from './config.js';
import { GUARD_STATES } from './guards.js';

const FLOOR = '#1b2338';
const FLOOR_SHADOW = '#0e1424';
const FLOOR_LIT = '#3a2f1c';
const WALL = '#e8dcc3';
const WALL_TOP = '#f5ecd7';
const CARPET = '#7a1f2b';

function conePath(ctx, x, y, angle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - CONE_HALF_ANGLE, angle + CONE_HALF_ANGLE);
  ctx.closePath();
}

export function drawWorld(ctx, game) {
  const { world, guards, player } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // ---- Floor: lit pools warm, shadow tiles dark blue, the rest deep blue. ----
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE;
      const py = HUD_H + y * TILE;
      const light = world.light[y][x];
      ctx.fillStyle = light === 'lit' ? FLOOR_LIT : light === 'shadow' ? FLOOR_SHADOW : FLOOR;
      ctx.fillRect(px, py, TILE, TILE);
      // faint tile seam so the grid reads
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    }
  }

  // Red carpet runner down the middle band (rows 7-8) — a museum touch.
  ctx.fillStyle = CARPET;
  ctx.fillRect(0, HUD_H + 7 * TILE, VIEW_W, 2 * TILE);
  ctx.fillStyle = 'rgba(232,220,195,0.25)';
  ctx.fillRect(0, HUD_H + 7 * TILE, VIEW_W, 2);
  ctx.fillRect(0, HUD_H + 9 * TILE - 2, VIEW_W, 2);

  // Lamp pools: warm glow over the lit tiles.
  for (const lamp of world.lampTiles) {
    const cx = lamp.tx * TILE + TILE / 2;
    const cy = HUD_H + lamp.ty * TILE + TILE / 2;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
    grad.addColorStop(0, 'rgba(255,190,80,0.30)');
    grad.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 90, cy - 90, 180, 180);
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Searchlights (rooftop): sweeping bright cones from the roof edge.
  for (const sl of world.searchlights) {
    const ox = sl.x * TILE + TILE / 2;
    const oy = HUD_H + sl.y * TILE + TILE / 2;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff3c4';
    conePath(ctx, ox, oy, sl.angle, sl.rangeTiles * TILE);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lasers: red beams across the corridor, blinking on a timer.
  for (const lz of world.lasers) {
    const y = HUD_H + (lz.y + 0.5) * TILE;
    const x0 = lz.x * TILE;
    const x1 = (lz.x + lz.w) * TILE;
    ctx.save();
    if (lz.on) {
      ctx.strokeStyle = '#ff2d55';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff2d55';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.fillStyle = '#ff5c7a';
      for (let x = x0 + 8; x < x1; x += 18) {
        ctx.fillRect(x, y - 3, 3, 6);
      }
    } else {
      ctx.strokeStyle = 'rgba(255,45,85,0.25)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // Exit: glowing green skylight / door.
  if (world.exit) {
    const ex = world.exit.tx * TILE + TILE / 2;
    const ey = HUD_H + world.exit.ty * TILE + TILE / 2;
    const pulse = 0.55 + 0.25 * Math.sin(game.time * 3);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 24;
    ctx.fillRect(ex - 13, ey - 13, 26, 26);
    ctx.restore();
    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', ex, ey);
  }

  // Artifacts: golden relics glinting in their spots.
  for (const art of world.artifacts) {
    if (art.taken) continue;
    const ax = art.tx * TILE + TILE / 2;
    const ay = HUD_H + art.ty * TILE + TILE / 2;
    const glint = 0.7 + 0.3 * Math.sin(game.time * 4 + art.tx);
    ctx.save();
    ctx.globalAlpha = glint;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 10);
    ctx.lineTo(ax + 7, ay);
    ctx.lineTo(ax, ay + 10);
    ctx.lineTo(ax - 7, ay);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff7cc';
    ctx.beginPath();
    ctx.arc(ax - 2, ay - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cover: crates (wood), plants (green), display cases (glass with glint).
  for (const c of world.coverTiles) {
    const px = c.tx * TILE;
    const py = HUD_H + c.ty * TILE;
    if (c.kind === 'C') {
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = '#4a2f18';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3);
      ctx.lineTo(px + TILE - 3, py + TILE - 3);
      ctx.moveTo(px + TILE - 3, py + 3);
      ctx.lineTo(px + 3, py + TILE - 3);
      ctx.stroke();
    } else if (c.kind === 'P') {
      ctx.fillStyle = '#2d5a2d';
      ctx.beginPath();
      ctx.arc(px + 16, py + 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(px + 12, py + 10, 7, 0, Math.PI * 2);
      ctx.arc(px + 20, py + 11, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d5a2b';
      ctx.fillRect(px + 12, py + 22, 8, 7);
    } else {
      // Display case: glass box with a glinting relic silhouette.
      ctx.fillStyle = 'rgba(180,220,255,0.25)';
      ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
      ctx.strokeStyle = '#cfe8ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 24);
      ctx.lineTo(px + 20, py + 8);
      ctx.stroke();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(px + 16, py + 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Walls: cream blocks with a bright top edge so they read as walls.
  // (Cover tiles were drawn above; walls are the other solid tiles.)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!world.solid[y][x]) continue;
      if (world.coverTiles.some((c) => c.tx === x && c.ty === y)) continue;
      const px = x * TILE;
      const py = HUD_H + y * TILE;
      ctx.fillStyle = WALL;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(px, py, TILE, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    }
  }

  // ---- Vision cones (drawn over the floor, under the guards). ----
  for (const g of guards) {
    const gx = g.x;
    const gy = HUD_H + g.y;
    ctx.save();
    const base = g.state === GUARD_STATES.ALARM ? '255,59,48' : g.state === GUARD_STATES.SUSPICIOUS ? '255,149,0' : '255,214,10';
    const alpha = g.state === GUARD_STATES.PATROL ? 0.22 : 0.35;
    ctx.fillStyle = `rgba(${base},${alpha})`;
    conePath(ctx, gx, gy, g.angle, CONE_RANGE_TILES * TILE);
    ctx.fill();
    ctx.restore();
  }

  // Noise rings: expanding circles while the player walks.
  for (const ring of player.noiseRings) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ring.alpha);
    ctx.strokeStyle = '#9db4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, HUD_H + ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---- Guards: dark uniforms, yellow torch dot, "?" / "!" overhead. ----
  for (const g of guards) {
    const gx = g.x;
    const gy = HUD_H + g.y;
    ctx.save();
    ctx.translate(gx, gy);
    // body
    ctx.fillStyle = '#232838';
    ctx.strokeStyle = '#0b0e18';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // cap + visor facing the look direction
    ctx.fillStyle = g.type === 'runner' ? '#ff5c5c' : '#3d4a6b';
    ctx.beginPath();
    ctx.arc(Math.cos(g.angle) * 4, Math.sin(g.angle) * 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(Math.cos(g.angle) * 10, Math.sin(g.angle) * 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Detection meter above the guard (only while it is filling).
    if (g.meter > 2) {
      const w = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(gx - w / 2, gy - 24, w, 5);
      ctx.fillStyle = g.alertColor;
      ctx.fillRect(gx - w / 2, gy - 24, (w * g.meter) / 100, 5);
    }
    if (g.mark) {
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = g.alertColor;
      ctx.fillText(g.mark, gx, gy - 24);
    }
  }

  // ---- Player: hooded figure, white outline, crouched when hiding. ----
  {
    const px = player.x;
    const py = HUD_H + player.y;
    const crouch = player.hidden || player.sneaking ? 0.75 : 1;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, crouch);
    ctx.fillStyle = '#5b2d8e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // hood point
    ctx.fillStyle = '#7b3fb8';
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(player.facing * 10, -2);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    // eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.facing * 4 - 2, -2, 1.8, 0, Math.PI * 2);
    ctx.arc(player.facing * 4 + 3, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (player.hidden) {
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9db4ff';
      ctx.fillText('HIDDEN', px, py - 18);
    }
  }

  // Rain on the rooftop (level 3): thin streaks, purely visual.
  if (game.levelDef.id === 3) {
    ctx.save();
    ctx.strokeStyle = 'rgba(160,190,255,0.35)';
    ctx.lineWidth = 1;
    const rng = game.rainSeed;
    for (let i = 0; i < 90; i++) {
      const rx = ((rng[i * 2] * VIEW_W + game.time * 60) % VIEW_W);
      const ry = ((rng[i * 2 + 1] * VIEW_H + game.time * 420) % VIEW_H);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Near-miss pulse: red screen edges when a guard brushes past.
  if (game.pulse > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, game.pulse);
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, HUD_H + 7, VIEW_W - 14, VIEW_H - HUD_H - 14);
    ctx.restore();
  }
}

export function drawHUD(ctx, game) {
  const { world, player, levelDef } = game;
  // Top bar.
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 19px monospace';
  ctx.fillText(`NIGHTSHIFT — ${levelDef.name}`, 14, HUD_H / 2);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '15px monospace';
  const artText = `ARTIFACTS ${player.artifacts}/3`;
  ctx.fillText(artText, 380, HUD_H / 2);
  // Lives as hearts.
  ctx.fillStyle = '#ff3b30';
  ctx.font = '17px monospace';
  let hearts = '';
  for (let i = 0; i < 3; i++) hearts += i < player.lives ? '♥ ' : '♡ ';
  ctx.fillText(hearts, 540, HUD_H / 2);
  // Timer.
  ctx.fillStyle = '#e8e8e8';
  ctx.fillText(`TIME ${formatTime(game.elapsed)}`, 680, HUD_H / 2);
  // Spotted count.
  ctx.fillStyle = game.timesSpotted > 0 ? '#ff9500' : '#9db4ff';
  ctx.fillText(`SPOTTED ${game.timesSpotted}x`, 820, HUD_H / 2);
  // Mute state.
  ctx.fillStyle = '#9db4ff';
  ctx.fillText(game.audio.muted ? 'MUTED (M)' : 'SOUND ON (M)', 990, HUD_H / 2);
  // Objective line, on a dark strip so it reads over the top wall row.
  ctx.fillStyle = 'rgba(5,8,18,0.72)';
  ctx.fillRect(0, HUD_H, VIEW_W, 22);
  ctx.fillStyle = '#ffd60a';
  ctx.font = '13px monospace';
  ctx.fillText(
    player.artifacts < 3
      ? `Steal the artifacts — ${world.artifactsLeft()} left, then reach the green EXIT.`
      : 'All artifacts stolen! Reach the green EXIT.',
    14,
    HUD_H + 16,
  );

  // The big eye: overall detection pressure (highest guard meter).
  const top = Math.max(0, ...game.guards.map((g) => g.meter));
  const ex = VIEW_W - 46;
  const ey = HUD_H / 2;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.fillStyle = top >= 100 ? '#ff3b30' : top >= 45 ? '#ff9500' : '#e8e8e8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0e1a';
  ctx.beginPath();
  ctx.arc(0, 0, 6 + (top / 100) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawMinimap(ctx, game);
}

export function drawMinimap(ctx, game) {
  const { world, guards, player } = game;
  const scale = 3;
  const w = COLS * scale;
  const h = ROWS * scale;
  const ox = 14;
  const oy = VIEW_H - h - 12;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(ox - 5, oy - 5, w + 10, h + 22);
  ctx.strokeStyle = '#2a3350';
  ctx.strokeRect(ox - 5, oy - 5, w + 10, h + 22);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (world.solid[y][x]) {
        ctx.fillStyle = '#5a6480';
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
  }
  for (const art of world.artifacts) {
    if (art.taken) continue;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ox + art.tx * scale - 1, oy + art.ty * scale - 1, 5, 5);
  }
  if (world.exit) {
    ctx.fillStyle = '#34d399';
    ctx.fillRect(ox + world.exit.tx * scale - 1, oy + world.exit.ty * scale - 1, 5, 5);
  }
  for (const g of guards) {
    ctx.fillStyle = g.state === GUARD_STATES.ALARM ? '#ff3b30' : '#ffd60a';
    ctx.beginPath();
    ctx.arc(ox + (g.x / TILE) * scale, oy + (g.y / TILE) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + (player.x / TILE) * scale, oy + (player.y / TILE) * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9db4ff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', ox, oy + h + 11);
  ctx.restore();
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,18,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#101830';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px monospace';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '16px monospace';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 96 + i * 30);
  });
  ctx.restore();
}

export function drawMenu(ctx, game) {
  drawWorld(ctx, game);
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,18,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 54px monospace';
  ctx.fillText('NIGHTSHIFT', VIEW_W / 2, 190);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('The Vault Job', VIEW_W / 2, 232);
  ctx.font = '16px monospace';
  ctx.fillStyle = '#9db4ff';
  const lines = [
    'You are Rook, a thief in the Marrowgate Museum at night.',
    'Steal all 3 artifacts on each floor, then slip out the green EXIT — unseen.',
    '',
    'WASD / arrows — move      SHIFT — sneak (slow, silent)',
    'E — hide behind cover     R — restart level     M — mute     P — pause',
    'Yellow cones are guard vision. Dark blue floor is safe shadow.',
    'Lit floor fills the detection meter fast. A full meter means ALARM.',
    '',
    'Click anywhere or press ENTER to begin.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 280 + i * 28));
  ctx.restore();
}

export function drawIntro(ctx, game) {
  drawWorld(ctx, game);
  const lines = [game.levelDef.sub, '', ...game.levelDef.hints, '', 'Press ENTER or click to start.'];
  overlayPanel(ctx, game.levelDef.name, lines, '#ffd60a');
}

export function drawPaused(ctx) {
  overlayPanel(ctx, 'PAUSED', ['Press P or Esc to resume.', 'R — restart level.   M — mute.'], '#9db4ff');
}

export function drawCaught(ctx, game) {
  overlayPanel(
    ctx,
    'CAUGHT!',
    [
      `A guard grabbed you during the alarm. Lives left: ${game.player.lives}`,
      game.player.lives > 0 ? 'Press ENTER to try this floor again.' : 'Press ENTER for the game over screen.',
    ],
    '#ff3b30',
  );
}

export function drawLevelClear(ctx, game) {
  const lines = [
    `Floor cleared in ${formatTime(game.levelTime)} — ${game.player.artifacts}/3 artifacts.`,
    game.levelIndex < 2 ? 'Press ENTER for the next floor.' : 'Press ENTER for the final tally.',
  ];
  overlayPanel(ctx, 'FLOOR CLEARED', lines, '#34d399');
}

export function drawGameOver(ctx, game) {
  overlayPanel(
    ctx,
    'GAME OVER',
    [
      `The museum keeps its secrets. You were caught ${game.timesSpotted} times.`,
      'Press ENTER to start the whole job again.',
    ],
    '#ff3b30',
  );
}

export function drawWin(ctx, game) {
  const rank = game.rank;
  const lines = [
    `All 3 floors cleared — ${game.totalArtifacts}/9 artifacts stolen.`,
    `Total time ${formatTime(game.elapsed)}   Times spotted: ${game.timesSpotted}`,
    '',
    `RANK ${rank}`,
    rank === 'S' ? 'A ghost. Nobody ever knew you were there.' : rank === 'A' ? 'Clean work, Rook.' : rank === 'B' ? 'A few close calls, but the loot is yours.' : 'Loud, messy — but rich.',
    '',
    'Press ENTER to play again.',
  ];
  overlayPanel(ctx, 'VAULT CLEARED', lines, '#ffd700');
}
