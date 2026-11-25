// news-image-20261124 entry: writes a deterministic news-infographic PNG to /output/entry.png.
//
// The image summarises the world's news of Tuesday 24 November 2026: Iran's Strait of
// Hormuz tanker mines and US naval blockade, Israel-Gaza airstrikes, Russia's attack on
// Zaporizhzhia and threat against Estonia, Jensen Huang's reinstatement as Nvidia CEO,
// and Thanksgiving travel projections. It names the day and shows specific events, so a
// picture editor can tell which day's news it sums up.
//
// Runs with no network. Reads entry.png from the repository and copies it to /output.
// Same bytes every run (deterministic).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { existsSync, copyFileSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_NAME = 'entry.png';
const OUTPUT_NAME = 'entry.png';
const MAX_BYTES = 1_048_576; // 1 MiB

function resolveOutputDir(): string {
  const envDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (envDir && envDir.trim().length > 0) {
    return envDir.trim();
  }
  return '/output';
}

function sourcePath(): string {
  return new URL(`./${SOURCE_NAME}`, import.meta.url).pathname;
}

function main(): void {
  const outDir = resolveOutputDir();
  mkdirSync(outDir, { recursive: true });

  const src = sourcePath();
  if (!existsSync(src)) {
    throw new Error(`source image not found: ${src}`);
  }

  const dst = join(outDir, OUTPUT_NAME);
  copyFileSync(src, dst);

  const stat = statSync(dst);
  if (!stat.isFile()) {
    throw new Error(`output is not a regular file: ${dst}`);
  }
  if (stat.size === 0) {
    throw new Error(`output image is empty: ${dst}`);
  }
  if (stat.size > MAX_BYTES) {
    throw new Error(`output image exceeds ${MAX_BYTES} bytes: ${stat.size}`);
  }

  console.log(`wrote ${dst} (${stat.size} bytes)`);
}

main();
