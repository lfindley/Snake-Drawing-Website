import type { RawSpeciesSlug } from "@/data/raw-species";
import type { SnakeShapeProfile } from "@/lib/types";

type SnakeMetadataEntry = {
  commonName?: string;
  habitat?: string;
  region?: string;
  venomous?: boolean | null;
  facts?: string[];
  isFeatured?: boolean;
  shapeProfile?: SnakeShapeProfile;
};

export const curatedSnakeMetadata: Partial<
  Record<RawSpeciesSlug, SnakeMetadataEntry>
> = {
  "agkistrodon-piscivorus": {
    commonName: "Northern Cottonmouth",
    habitat: "Swamps, slow rivers, marsh edges, and cypress wetlands",
    region: "Southeastern United States",
    venomous: true,
    facts: [
      "Cottonmouths are venomous pit vipers that spend more time near water than copperheads do.",
      "Adults are heavier-bodied and often hold a more compact, muscular posture.",
      "Their common name comes from the bright white interior of the mouth shown during defensive displays.",
    ],
    shapeProfile: {
      pathLength: 1.88,
      aspectRatio: 2.45,
      curvature: 0.38,
      turnVariance: 0.29,
      waviness: 0.35,
    },
  },
  "coluber-constrictor": {
    commonName: "North American Racer",
    habitat: "Field margins, scrubland, open woodland, and roadside vegetation",
    region: "Much of the United States, Mexico, and southern Canada",
    venomous: false,
    facts: [
      "Racers are slim, fast-moving snakes with a streamlined body and low, efficient curves.",
      "They rely on speed and excellent eyesight rather than ambush tactics.",
      "Adults are often nearly patternless compared with many blotched rat snakes.",
    ],
    shapeProfile: {
      pathLength: 3.08,
      aspectRatio: 6.3,
      curvature: 0.18,
      turnVariance: 0.12,
      waviness: 0.49,
    },
  },
  "pantherophis-guttatus": {
    commonName: "Corn Snake",
    habitat: "Pine woods, abandoned barns, and overgrown field edges",
    region: "Southeastern United States",
    venomous: false,
    isFeatured: true,
    facts: [
      "Corn snakes are non-venomous constrictors that help control rodents.",
      "Their orange and rust blotches make them one of the most recognizable North American snakes.",
      "They are strong climbers and often shelter in hollow logs or farm structures.",
      "The species is popular in herpetology because it is generally calm and adaptable.",
    ],
    shapeProfile: {
      pathLength: 2.1,
      aspectRatio: 3.8,
      curvature: 0.28,
      turnVariance: 0.21,
      waviness: 0.61,
    },
  },
  "lampropeltis-californiae": {
    commonName: "California Kingsnake",
    habitat: "Chaparral, grassland, scrub, and suburban edges",
    region: "California, Nevada, Arizona, and northern Mexico",
    venomous: false,
    isFeatured: true,
    facts: [
      "California kingsnakes are non-venomous constrictors with high-contrast banding.",
      "They are named for their ability to prey on other snakes, including rattlesnakes.",
      "This species is adaptable and can live in dry valleys as well as rocky foothills.",
      "Its bold band pattern makes it a strong educational comparison species for the MVP.",
    ],
    shapeProfile: {
      pathLength: 2.4,
      aspectRatio: 4.2,
      curvature: 0.24,
      turnVariance: 0.18,
      waviness: 0.46,
    },
  },
  "thamnophis-sirtalis": {
    commonName: "Common Garter Snake",
    habitat: "Meadows, marsh edges, gardens, and stream corridors",
    region: "Much of the United States and southern Canada",
    venomous: false,
    isFeatured: true,
    facts: [
      "Garter snakes are slim, active snakes often seen with yellow or cream dorsal stripes.",
      "They tolerate cool climates better than many snakes and can be active early in the season.",
      "Their diet includes worms, amphibians, and small fish.",
      "They rely on fast movement and twisting body shapes more than brute constriction.",
    ],
    shapeProfile: {
      pathLength: 2.8,
      aspectRatio: 5.4,
      curvature: 0.33,
      turnVariance: 0.26,
      waviness: 0.78,
    },
  },
  "agkistrodon-contortrix": {
    commonName: "Eastern Copperhead",
    habitat: "Deciduous woodland, rocky hillsides, and leaf litter",
    region: "Eastern and central United States",
    venomous: true,
    isFeatured: true,
    facts: [
      "Copperheads are venomous pit vipers known for their copper-toned hourglass pattern.",
      "They often rely on camouflage and remain motionless rather than fleeing.",
      "Juveniles have yellow-tipped tails that help lure prey.",
      "Their thicker bodies and tighter coils make them visually distinct from racers and garter snakes.",
    ],
    shapeProfile: {
      pathLength: 1.74,
      aspectRatio: 2.6,
      curvature: 0.4,
      turnVariance: 0.31,
      waviness: 0.37,
    },
  },
  "crotalus-atrox": {
    commonName: "Western Diamondback Rattlesnake",
    habitat: "Desert scrub, rocky canyons, and dry grassland",
    region: "Southwestern United States and northern Mexico",
    venomous: true,
    isFeatured: true,
    facts: [
      "This large rattlesnake is famous for its diamond pattern and tail rattle.",
      "It is a venomous pit viper that often adopts a compact defensive posture.",
      "Western diamondbacks live in arid country but still use washes and rocky shelter.",
      "Their stockier body profile helps differentiate them from long, ribbon-like species.",
    ],
    shapeProfile: {
      pathLength: 1.66,
      aspectRatio: 2.2,
      curvature: 0.36,
      turnVariance: 0.28,
      waviness: 0.32,
    },
  },
  "opheodrys-aestivus": {
    commonName: "Rough Green Snake",
    habitat: "Shrubs, vines, and wet woodland margins",
    region: "Southeastern United States",
    venomous: false,
    isFeatured: true,
    facts: [
      "Rough green snakes are extremely slender and bright green, helping them disappear in foliage.",
      "They are non-venomous and feed mainly on insects and spiders.",
      "This species spends much of its time off the ground in vegetation.",
      "Its silhouette is usually long, light, and gently curved instead of tightly coiled.",
    ],
    shapeProfile: {
      pathLength: 3,
      aspectRatio: 6.1,
      curvature: 0.21,
      turnVariance: 0.16,
      waviness: 0.63,
    },
  },
  "pituophis-catenifer": {
    commonName: "Gopher Snake",
    habitat: "Grassland, desert margin, and open woodland",
    region: "Western and central North America",
    venomous: false,
    isFeatured: true,
    facts: [
      "Gopher snakes are large non-venomous constrictors that often bluff aggressively when threatened.",
      "They flatten the head and hiss loudly, which can make them look rattlesnake-like at a glance.",
      "They are important rodent hunters across farms, dunes, and open country.",
      "Their body shape tends to read as long and muscular with broader, slower curves.",
    ],
    shapeProfile: {
      pathLength: 2.25,
      aspectRatio: 3.1,
      curvature: 0.26,
      turnVariance: 0.2,
      waviness: 0.4,
    },
  },
  "heterodon-platirhinos": {
    commonName: "Eastern Hognose",
    habitat: "Sandy soil, pine barrens, and open woodland",
    region: "Eastern United States",
    venomous: false,
    isFeatured: true,
    facts: [
      "Eastern hognose snakes are famous for their upturned snouts and dramatic bluff displays.",
      "They often flatten the neck like a cobra and may play dead when stressed.",
      "Their favorite food is toads, and they are built for digging in loose soil.",
      "The body shape reads as short-to-medium length with compact bends and a stout front half.",
    ],
    shapeProfile: {
      pathLength: 1.82,
      aspectRatio: 2.4,
      curvature: 0.34,
      turnVariance: 0.24,
      waviness: 0.36,
    },
  },
  "lampropeltis-triangulum": {
    commonName: "Milk Snake",
    habitat: "Forest edges, farms, rocky slopes, and old foundations",
    region: "Eastern and central North America",
    venomous: false,
    facts: [
      "Milk snakes are non-venomous kingsnakes known for alternating red or brown saddles and pale bands.",
      "They usually read as long and smooth-bodied rather than thick and compact.",
      "The species often turns up in barns, stone walls, and abandoned structures.",
    ],
    shapeProfile: {
      pathLength: 2.32,
      aspectRatio: 4.1,
      curvature: 0.24,
      turnVariance: 0.18,
      waviness: 0.48,
    },
  },
  "masticophis-flagellum": {
    commonName: "Coachwhip",
    habitat: "Open scrub, desert flats, sandy grassland, and dry woodland",
    region: "Southern United States and northern Mexico",
    venomous: false,
    facts: [
      "Coachwhips are extremely long, fast snakes with a whiplike body taper.",
      "They often appear stretched and lightly curved instead of tightly coiled.",
      "The species is a strong visual contrast to stockier vipers and hognose snakes.",
    ],
    shapeProfile: {
      pathLength: 3.2,
      aspectRatio: 6.8,
      curvature: 0.16,
      turnVariance: 0.11,
      waviness: 0.45,
    },
  },
  "nerodia-sipedon": {
    commonName: "Northern Watersnake",
    habitat: "Lakeshores, streams, marshes, and vegetated pond edges",
    region: "Eastern United States and southern Canada",
    venomous: false,
    facts: [
      "Northern watersnakes are non-venomous but often mistaken for cottonmouths and other heavier species.",
      "They tend to show stronger side-to-side motion than pit vipers but retain a thicker body than garter snakes.",
      "They are strongly associated with water and basking sites near shorelines.",
    ],
    shapeProfile: {
      pathLength: 2.42,
      aspectRatio: 4.45,
      curvature: 0.31,
      turnVariance: 0.24,
      waviness: 0.69,
    },
  },
  "pantherophis-alleghaniensis": {
    commonName: "Eastern Rat Snake",
    habitat: "Hardwood forest, rocky ridges, barns, and forest edge",
    region: "Eastern United States",
    venomous: false,
    facts: [
      "Eastern rat snakes are long, climbing constrictors often seen in trees and old buildings.",
      "Their body silhouette is usually long and steady, with broader curves than garter snakes.",
      "Dark adults are frequently mistaken for more dangerous species at a distance.",
    ],
    shapeProfile: {
      pathLength: 2.5,
      aspectRatio: 4.35,
      curvature: 0.23,
      turnVariance: 0.18,
      waviness: 0.47,
    },
  },
  "pantherophis-obsoletus": {
    commonName: "Western Rat Snake",
    habitat: "Woodland, prairie edge, rocky bluffs, and farm country",
    region: "Central United States",
    venomous: false,
    facts: [
      "Western rat snakes are non-venomous constrictors with a long, muscular body and broad bends.",
      "They often appear less ribbon-like than racers or garter snakes.",
      "As with other rat snakes, they are strong climbers and opportunistic nest raiders.",
    ],
    shapeProfile: {
      pathLength: 2.44,
      aspectRatio: 4.08,
      curvature: 0.24,
      turnVariance: 0.19,
      waviness: 0.44,
    },
  },
  "thamnophis-elegans": {
    commonName: "Western Terrestrial Garter Snake",
    habitat: "Mountain meadows, riparian corridors, sagebrush flats, and wet grassland",
    region: "Western North America",
    venomous: false,
    facts: [
      "This garter snake tends to read as narrow, quick, and highly sinuous in motion.",
      "It occupies a broad range of western habitats, from streamsides to high country meadows.",
      "Its patterning varies widely, but the overall body plan remains distinctly slender.",
    ],
    shapeProfile: {
      pathLength: 2.88,
      aspectRatio: 5.7,
      curvature: 0.33,
      turnVariance: 0.25,
      waviness: 0.81,
    },
  },
};
