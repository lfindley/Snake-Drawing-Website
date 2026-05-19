import type { StrokePoint } from "@/lib/types";

export type MatcherFixture = {
  id: string;
  description: string;
  points: StrokePoint[];
  expectedTopPhotoId: string;
  expectedTop3Species: string[];
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
    description: "Outline-first baseline for a long narrow wave stroke.",
    expectedTopPhotoId: "pituophis-catenifer/edef41fbc6.jpg",
    expectedTop3Species: [
      "pituophis-catenifer",
      "pantherophis-spiloides",
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
    description: "Outline-first baseline for a compact coiled stroke.",
    expectedTopPhotoId: "agkistrodon-piscivorus/cab5e78852.jpg",
    expectedTop3Species: [
      "agkistrodon-piscivorus",
      "rhinocheilus-lecontei",
      "storeria-occipitomaculata",
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
    description: "Outline-first baseline for a broad smooth curve.",
    expectedTopPhotoId: "pituophis-catenifer/edef41fbc6.jpg",
    expectedTop3Species: [
      "pituophis-catenifer",
      "coluber-constrictor",
      "pantherophis-spiloides",
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
  {
    id: "tight-serpentine",
    description: "Outline-first baseline for a tight repeating serpentine stroke.",
    expectedTopPhotoId: "pituophis-catenifer/edef41fbc6.jpg",
    expectedTop3Species: [
      "pituophis-catenifer",
      "pantherophis-spiloides",
      "opheodrys-aestivus",
    ],
    points: buildStroke([
      [40, 170],
      [88, 136],
      [134, 184],
      [180, 130],
      [228, 188],
      [274, 134],
      [320, 186],
      [364, 138],
      [408, 184],
      [452, 142],
      [500, 182],
      [548, 146],
      [596, 180],
    ]),
  },
  {
    id: "squat-coil",
    description: "Outline-first baseline where silhouette overlap should favor a squat coil.",
    expectedTopPhotoId: "diadophis-punctatus/48a66f2b9e.jpg",
    expectedTop3Species: [
      "diadophis-punctatus",
      "storeria-occipitomaculata",
      "agkistrodon-piscivorus",
    ],
    points: buildStroke([
      [250, 170],
      [226, 144],
      [190, 148],
      [176, 182],
      [198, 214],
      [234, 224],
      [270, 216],
      [294, 188],
      [290, 156],
      [262, 138],
      [228, 144],
      [214, 174],
      [236, 202],
      [272, 202],
      [300, 182],
    ]),
  },
];
