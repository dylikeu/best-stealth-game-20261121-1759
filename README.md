[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/dylikeu/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/dylikeu/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# NIGHTSHIFT: The Vault Job

A top-down stealth game in plain Canvas 2D — no libraries, no network, no build step. You are Rook, a thief breaking into the Marrowgate Museum at night. Steal the 3 artifacts on each floor and reach the green EXIT unseen.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080).

- **WASD / arrows** — move
- **Hold SHIFT** — sneak (slower, silent, smaller noise)
- **E** — hide behind cover (crates, plants, display cases)
- **R** — restart level · **M** — mute · **P / Esc** — pause · **Mouse** — menus

## The stealth systems

- **Vision cones** — every guard sweeps a yellow cone. It turns orange as suspicion rises and red on alarm. The meter above each guard (and the big eye in the HUD) shows how close you are to being spotted.
- **Light & shadow** — warm lamp pools are risky: detection fills fast in the light and half as fast in the dark-blue shadow. The lighting shows what is safe.
- **Patrols you can learn** — guards walk fixed waypoint loops with pauses at lookouts. Same routes every run; time your moves.
- **A chance to recover** — getting spotted raises the alarm, but breaking line of sight lets it drain back down. A guard touching you during the alarm costs a life (3 per run).
- **Noise** — walking sends out rings guards can hear; sneaking is silent. Footsteps get louder near guards.
- **Near miss** — a guard brushing past while you hide spikes suspicion, thumps a heartbeat and pulses the screen red.
- **Level 2** adds a blinking laser grid (cross only while the beams are off) and a lookout on the vault door. **Level 3** adds sweeping searchlights, rain and a faster runner guard.

Clear all 3 floors for the final tally and a rank (S / A / B / C).

## Structure

| File | Job |
| --- | --- |
| `game/src/config.js` | Level data: maps, guards, lasers, searchlights, tuning |
| `game/src/world.js` | Level loading, collision, line of sight, light & shadow |
| `game/src/guards.js` | Patrol AI, vision cones, detection meter, alert states |
| `game/src/player.js` | Movement, sneak, hide, noise, lives |
| `game/src/input.js` | Keyboard + mouse input |
| `game/src/audio.js` | WebAudio synth: footsteps, alarm, pickup, win/lose |
| `game/src/render.js` | Canvas drawing: floor, cones, HUD, minimap |
| `game/src/shots.js` | Deterministic staged scenes for screenshots |
| `game/src/main.js` | Game loop + state machine |
| `main.ts` | Entry program: copies game/ + screenshots/, writes dossier.json |
| `serve.ts` | Tiny static server for local play-testing |

## Screenshots

Deterministic staged renders of the game's own code (`?shot=cover|patrol|alarm|win`): the cover shows Rook crouched in shadow at the edge of a guard's cone, a patrol wide shot, the alarm moment, and the win screen.

## Entry

Built for the make.fun bounty [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759).

Optional: earn referral rewards, a second way to make money — join with [my referral link](https://make.fun/r/ec115nvc).

## License

MIT — see [LICENSE](LICENSE).
