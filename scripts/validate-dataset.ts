import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { rawSpeciesSlugs } from "../src/data/raw-species";
import { curatedSnakeMetadata } from "../src/data/snake-metadata";
import { snakeProfiles } from "../src/data/snakes";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(currentDir, "..");

const problems: string[] = [];
const warnings: string[] = [];

for (const slug of rawSpeciesSlugs) {
  const imagePath = resolve(projectRoot, "public", "images", "snakes", `${slug}.jpg`);

  if (!existsSync(imagePath)) {
    problems.push(`Missing representative image for ${slug}: ${imagePath}`);
  }

  const profile = snakeProfiles.find((entry) => entry.id === slug);

  if (!profile) {
    problems.push(`Missing snake profile for ${slug}`);
    continue;
  }

  if (!profile.commonName || profile.commonName === profile.scientificName) {
    warnings.push(`Common name for ${slug} still looks unresolved: "${profile.commonName}"`);
  }

  if (!profile.habitat) {
    warnings.push(`Habitat missing for ${slug}`);
  }

  if (!profile.region) {
    warnings.push(`Region missing for ${slug}`);
  }

  if (profile.facts.length < 2) {
    warnings.push(`Too few facts for ${slug}`);
  }
}

const curatedCount = Object.keys(curatedSnakeMetadata).length;
if (curatedCount < 12) {
  warnings.push(`Curated metadata count is ${curatedCount}; desktop release target should keep expanding this.`);
}

if (problems.length > 0) {
  problems.forEach((problem) => console.error(`[dataset:error] ${problem}`));
  process.exit(1);
}

warnings.forEach((warning) => console.warn(`[dataset:warn] ${warning}`));
console.log(
  `[dataset] validated ${snakeProfiles.length} species, ${curatedCount} curated metadata entries, and representative images.`,
);
