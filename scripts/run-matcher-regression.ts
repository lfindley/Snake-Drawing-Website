import { matcherFixtures } from "../src/data/matcher-fixtures";
import { rankSnakeMatches } from "../src/lib/match-snake";

let failed = false;

for (const fixture of matcherFixtures) {
  const ranked = rankSnakeMatches(fixture.points, 3);
  const rankedIds = ranked.map((entry) => entry.snake.id);
  const missing = fixture.expectedTop3.filter((id) => !rankedIds.includes(id));

  if (missing.length > 0) {
    failed = true;
    console.error(
      `[matcher] ${fixture.id} failed. Expected top3 to include: ${fixture.expectedTop3.join(
        ", ",
      )}. Received: ${rankedIds.join(", ")}`,
    );
    continue;
  }

  console.log(
    `[matcher] ${fixture.id} passed -> ${ranked
      .map((entry) => `${entry.snake.commonName} (${entry.score}%)`)
      .join(", ")}`,
  );
}

if (failed) {
  process.exit(1);
}

console.log(`[matcher] ${matcherFixtures.length} regression fixtures passed.`);
