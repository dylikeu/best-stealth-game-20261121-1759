// NIGHTSHIFT: The Vault Job — level data and tuning constants.
// All art, names and level layouts are original, written for this entry.
// Map legend:
//   '#' wall   '.' floor   ',' shadow floor (dark, safe)   '*' lamp pool (bright, risky)
//   'C' crate  'P' plant  'D' display case — cover: blocks movement and sight
//   'A' artifact   'E' exit   '@' player start
// Guards are defined separately so patrol routes stay readable.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 20;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 48;

// Player tuning (tiles per second).
export const WALK_SPEED = 4.4;
export const SNEAK_SPEED = 2.3;
export const SPRINT_SPEED = 5.6;

// Guard vision tuning.
export const CONE_RANGE_TILES = 6;
export const CONE_HALF_ANGLE = Math.PI / 4; // 45 degrees each side = 90 degree cone
export const DETECT_RATE_LIT = 62; // meter points per second, standing in light
export const DETECT_RATE_SHADOW = 26; // meter points per second, standing in shadow
export const DETECT_DRAIN = 34; // meter points per second while unseen
export const ALARM_CHASE_SPEED = 3.0;
export const TOUCH_GRACE = 0.4; // seconds a guard must stay touching before the catch lands
export const NOISE_RADIUS_TILES = 3.5;
export const NEAR_MISS_TILES = 1.3;

// Deterministic RNG (mulberry32) — same patrols and flicker every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LEVELS = [
  {
    id: 1,
    name: 'THE GALLERY',
    sub: 'Steal 3 artifacts, then reach the exit unseen.',
    seed: 101,
    hints: [
      'WASD / arrows — move',
      'Hold SHIFT — sneak (slow, silent)',
      'E — pick up artifact / hide',
      'Stay in the dark blue shadows',
    ],
    map: [
      '########################################',
      '#@...,,.......*......#......A....,,....#',
      '#....,,..............#...........,,....#',
      '#..CC,,.....DD........#....CC.....,,...#',
      '#..CC,,...............#....CC.....,,...#',
      '#....,,...............#................#',
      '#.....................#.....P..........#',
      '#....P...........A.....................#',
      '#......................................#',
      '#..,,,,,,............#....,,,,,,.......#',
      '#..,,,,,,............#....,,,,,,...A...#',
      '#..,,,,,,............#....,,,,,,.......#',
      '#....................#.................#',
      '#......D.............#......P..........#',
      '#...................#..................#',
      '#..*.....CC...........#.....,,.........#',
      '#........CC..........#.....,,....E.....#',
      '#.........P..........#.....,,..........#',
      '#......................................#',
      '########################################',
    ],
    guards: [
      { type: 'walker', speed: 2.0, waypoints: [[5, 2], [14, 2], [14, 5], [5, 5]] },
      { type: 'walker', speed: 2.0, waypoints: [[25, 2], [35, 2], [35, 5], [25, 5]] },
      { type: 'walker', speed: 1.8, waypoints: [[4, 14], [15, 14], [15, 17], [4, 17]] },
      { type: 'lookout', speed: 0, waypoints: [[30, 11]], sweep: Math.PI, sweepSpeed: 0.5 },
    ],
    lasers: [],
    searchlights: [],
  },
  {
    id: 2,
    name: 'THE VAULT',
    sub: 'Tighter corridors. Cross the laser grid only while the beams blink off.',
    seed: 202,
    hints: [
      'Lasers blink — watch the rhythm',
      'The lookout never leaves the vault door',
      'Sneak past, do not sprint',
    ],
    map: [
      '########################################',
      '#@.....,,,..........##..........A......#',
      '#......,,,..........##.................#',
      '#..CC..,,,....DD....##....CC....,,.....#',
      '#..CC..,,,..........##....CC....,,.....#',
      '#......,,,..........##.................#',
      '####.##########.######.##########.######',
      '#......................................#',
      '#....P............A.............P......#',
      '#......................................#',
      '####.##########.######.##########.######',
      '#......,,,..........##..........A......#',
      '#..,,,,,,,..........##.....,,,,,,......#',
      '#..,,,,,,,....CC....##.....,,,,,,......#',
      '#......,,,....CC....##.................#',
      '#..*...,,,..........##.....P...........#',
      '#......,,,..........##................E#',
      '#......,,,....D.....##.................#',
      '#......................................#',
      '########################################',
    ],
    guards: [
      { type: 'walker', speed: 2.2, waypoints: [[4, 2], [15, 2], [15, 4], [6, 4]] },
      { type: 'walker', speed: 2.2, waypoints: [[25, 2], [36, 2], [36, 4], [25, 4]] },
      { type: 'walker', speed: 2.0, waypoints: [[3, 8], [18, 8], [18, 9], [3, 9]] },
      { type: 'walker', speed: 2.0, waypoints: [[22, 8], [37, 8], [37, 9], [22, 9]] },
      { type: 'walker', speed: 2.4, waypoints: [[4, 17], [16, 17], [16, 12], [4, 12]] },
      { type: 'lookout', speed: 0, waypoints: [[35, 15]], sweep: Math.PI * 0.9, sweepSpeed: 0.7 },
    ],
    // Laser grid: horizontal beam bands across the middle corridor (rows 7-9 area
    // is open floor; the grid sits in the corridor at row 7, columns 8-31).
    // Each entry: tile rect [x, y, w, h], blink period (s), phase (s).
    lasers: [
      { x: 8, y: 7, w: 12, h: 1, period: 3.2, phase: 0.0 },
      { x: 21, y: 9, w: 11, h: 1, period: 3.2, phase: 1.6 },
    ],
    searchlights: [],
  },
  {
    id: 3,
    name: 'THE ROOFTOP',
    sub: 'Rain, sweeping searchlights and a runner. Grab the last artifact and sprint to the skylight.',
    seed: 303,
    hints: [
      'Searchlights sweep — time your dashes',
      'The runner is fast. Break line of sight!',
      'The skylight exit is at the far end',
    ],
    map: [
      '########################################',
      '#@......,,,,,,,,..........*......A.....#',
      '#.......,,,,,,,,.......................#',
      '#..CC...,,,,,,,,...DD.....CC.....,,....#',
      '#..CC...,,,,,,,,..........CC.....,,....#',
      '#.......,,,,,,,,.......................#',
      '#......................................#',
      '#....P............A.............P......#',
      '#......................................#',
      '#..,,,,,,......CC.........,,,,,,,......#',
      '#..,,,,,,......CC.........,,,,,,,...A..#',
      '#..,,,,,,................,,,,,,,.......#',
      '#......................................#',
      '#......D...........P...................#',
      '#......................................#',
      '#..*.....CC.............,,.............#',
      '#........CC.............,,.........E...#',
      '#.........P.............,,.............#',
      '#......................................#',
      '########################################',
    ],
    guards: [
      { type: 'walker', speed: 2.4, waypoints: [[5, 2], [16, 2], [16, 5], [5, 5]] },
      { type: 'walker', speed: 2.4, waypoints: [[24, 2], [36, 2], [36, 5], [24, 5]] },
      { type: 'walker', speed: 2.2, waypoints: [[3, 8], [19, 8], [19, 9], [3, 9]] },
      { type: 'walker', speed: 2.2, waypoints: [[21, 8], [37, 8], [37, 9], [21, 9]] },
      { type: 'walker', speed: 2.6, waypoints: [[4, 15], [17, 15], [17, 17], [4, 17]] },
      { type: 'lookout', speed: 0, waypoints: [[30, 12]], sweep: Math.PI, sweepSpeed: 0.9 },
      { type: 'runner', speed: 3.0, waypoints: [[12, 12], [30, 12], [30, 16], [12, 16]] },
    ],
    lasers: [],
    // Searchlights mounted on the roof edge, sweeping cones of bright light.
    searchlights: [
      { x: 12, y: 0, rangeTiles: 9, baseAngle: Math.PI / 2, arc: Math.PI * 0.7, speed: 0.45, phase: 0 },
      { x: 28, y: 0, rangeTiles: 9, baseAngle: Math.PI / 2, arc: Math.PI * 0.7, speed: 0.45, phase: 2.1 },
    ],
  },
];
