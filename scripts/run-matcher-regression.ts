import { matcherFixtures } from "../src/data/matcher-fixtures";
import { rankSnakeMatches } from "../src/lib/match-snake";

let failed = false;

for (const fixture of matcherFixtures) {
  const ranked = rankSnakeMatches(fixture.points, 3);
  const rankedIds = ranked.map((entry) => entry.snake.id);
  const topPhotoId = ranked[0]?.photo.id;
  const missing = fixture.expectedTop3Species.filter((id) => !rankedIds.includes(id));

  if (topPhotoId !== fixture.expectedTopPhotoId || missing.length > 0) {
    failed = true;
    console.error(
      `[matcher] ${fixture.id} failed. Expected top photo: ${fixture.expectedTopPhotoId}; expected top3 species to include: ${fixture.expectedTop3Species.join(
        ", ",
      )}. Received photo: ${topPhotoId ?? "none"}; received species: ${rankedIds.join(", ")}`,
    );
    continue;
  }

  console.log(
    `[matcher] ${fixture.id} passed -> ${ranked
      .map((entry) => `${entry.snake.commonName} via ${entry.photo.fileName} (${entry.score}%)`)
      .join(", ")}`,
  );
}

if (failed) {
  process.exit(1);
}

console.log(`[matcher] ${matcherFixtures.length} regression fixtures passed.`);
