// NIGHTSHIFT: The Vault Job — main.ts: the entry program.
// It copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Node 22 standard library only, no network, and
// deterministic: two runs write identical bytes.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function copyTree(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    const stat = lstatSync(src);
    if (stat.isSymbolicLink()) {
      throw new Error(`refusing to copy symlink: ${src}`);
    }
    if (stat.isDirectory()) {
      copyTree(src, dest);
    } else if (stat.isFile()) {
      cpSync(src, dest);
    }
  }
}

function main() {
  const gameDir = join(root, 'game');
  const shotsDir = join(root, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('game/ is missing');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  copyTree(gameDir, join(outputDir, 'game'));
  copyTree(shotsDir, join(outputDir, 'screenshots'));

  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`wrote ${outputDir}/dossier.json (${dossier.length} bytes)`);
}

main();
