import type { StrokePoint } from "@/lib/types";

export type MatcherFixture = {
  id: string;
  description: string;
  points: StrokePoint[];
  expectedTop3: string[];
};

function buildStroke(points: Array<[number, number]>): StrokePoint[] {
  return points.map(([x, y], index) => ({
    x,
    y,
    t: index * 16,
  }));
}

export const matcherFixtures: MatcherFixture[] = [
  {
    id: "long-narrow-wave",
    description: "Long narrow wave should favor slender terrestrial snakes.",
    expectedTop3: [
      "thamnophis-sirtalis",
      "thamnophis-elegans",
      "opheodrys-aestivus",
    ],
    points: buildStroke([
      [22, 174],
      [72, 144],
      [126, 190],
      [180, 142],
      [236, 192],
      [292, 146],
      [350, 190],
      [408, 142],
      [470, 186],
      [534, 148],
      [598, 182],
      [662, 150],
      [724, 176],
    ]),
  },
  {
    id: "compact-heavy-coils",
    description: "Compact heavy coils should favor vipers and hognose-like profiles.",
    expectedTop3: [
      "agkistrodon-contortrix",
      "crotalus-atrox",
      "heterodon-platirhinos",
    ],
    points: buildStroke([
      [280, 160],
      [246, 124],
      [198, 134],
      [176, 176],
      [208, 220],
      [262, 228],
      [308, 194],
      [318, 150],
      [280, 120],
      [236, 138],
      [224, 180],
      [258, 214],
      [304, 208],
      [344, 178],
      [350, 142],
    ]),
  },
  {
    id: "broad-smooth-constrictor",
    description: "Broad smooth constrictor line should favor corn, kingsnake, and gopher snake profiles.",
    expectedTop3: [
      "pantherophis-guttatus",
      "lampropeltis-californiae",
      "pituophis-catenifer",
    ],
    points: buildStroke([
      [54, 202],
      [112, 170],
      [174, 156],
      [236, 170],
      [294, 198],
      [352, 220],
      [412, 228],
      [476, 214],
      [542, 188],
      [610, 164],
      [676, 154],
      [740, 166],
      [802, 194],
      [858, 216],
    ]),
  },
];
