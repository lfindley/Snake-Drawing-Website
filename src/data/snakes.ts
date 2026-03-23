import { rawSpeciesSlugs, type RawSpeciesSlug } from "@/data/raw-species";
import { curatedSnakeMetadata } from "@/data/snake-metadata";
import type { SnakeProfile, SnakeShapeProfile } from "@/lib/types";

const commonNameFallbacks: Partial<Record<RawSpeciesSlug, string>> = {
  "agkistrodon-piscivorus": "Northern Cottonmouth",
  "coluber-constrictor": "North American Racer",
  "crotalus-horridus": "Timber Rattlesnake",
  "crotalus-ruber": "Red Diamond Rattlesnake",
  "crotalus-scutulatus": "Mojave Rattlesnake",
  "crotalus-viridis": "Prairie Rattlesnake",
  "diadophis-punctatus": "Ring-necked Snake",
  "haldea-striatula": "Rough Earthsnake",
  "lampropeltis-triangulum": "Milk Snake",
  "masticophis-flagellum": "Coachwhip",
  "natrix-natrix": "Grass Snake",
  "nerodia-erythrogaster": "Plain-bellied Watersnake",
  "nerodia-fasciata": "Banded Watersnake",
  "nerodia-rhombifer": "Diamond-backed Watersnake",
  "nerodia-sipedon": "Northern Watersnake",
  "pantherophis-alleghaniensis": "Eastern Rat Snake",
  "pantherophis-emoryi": "Great Plains Rat Snake",
  "pantherophis-obsoletus": "Western Rat Snake",
  "pantherophis-spiloides": "Gray Rat Snake",
  "pantherophis-vulpinus": "Fox Snake",
  "rhinocheilus-lecontei": "Long-nosed Snake",
  "storeria-dekayi": "Dekay's Brownsnake",
  "storeria-occipitomaculata": "Red-bellied Snake",
  "thamnophis-elegans": "Western Terrestrial Garter Snake",
  "thamnophis-marcianus": "Checkered Garter Snake",
  "thamnophis-proximus": "Western Ribbon Snake",
  "thamnophis-radix": "Plains Garter Snake",
};

const venomousFallbacks = new Set<RawSpeciesSlug>([
  "agkistrodon-contortrix",
  "agkistrodon-piscivorus",
  "crotalus-atrox",
  "crotalus-horridus",
  "crotalus-ruber",
  "crotalus-scutulatus",
  "crotalus-viridis",
]);

const profileFamilies: Array<{
  match: (slug: RawSpeciesSlug) => boolean;
  profile: SnakeShapeProfile;
}> = [
  {
    match: (slug) =>
      slug.startsWith("crotalus-") || slug.startsWith("agkistrodon-"),
    profile: {
      pathLength: 1.7,
      aspectRatio: 2.35,
      curvature: 0.37,
      turnVariance: 0.29,
      waviness: 0.34,
    },
  },
  {
    match: (slug) => slug.startsWith("thamnophis-") || slug.startsWith("nerodia-"),
    profile: {
      pathLength: 2.7,
      aspectRatio: 4.9,
      curvature: 0.31,
      turnVariance: 0.24,
      waviness: 0.72,
    },
  },
  {
    match: (slug) =>
      slug.startsWith("pantherophis-") ||
      slug.startsWith("lampropeltis-") ||
      slug === "natrix-natrix",
    profile: {
      pathLength: 2.26,
      aspectRatio: 3.9,
      curvature: 0.25,
      turnVariance: 0.19,
      waviness: 0.5,
    },
  },
  {
    match: (slug) =>
      slug === "opheodrys-aestivus" ||
      slug === "masticophis-flagellum" ||
      slug === "coluber-constrictor",
    profile: {
      pathLength: 2.95,
      aspectRatio: 6,
      curvature: 0.19,
      turnVariance: 0.14,
      waviness: 0.58,
    },
  },
  {
    match: (slug) =>
      slug === "pituophis-catenifer" ||
      slug === "heterodon-platirhinos" ||
      slug === "rhinocheilus-lecontei",
    profile: {
      pathLength: 2,
      aspectRatio: 2.7,
      curvature: 0.29,
      turnVariance: 0.21,
      waviness: 0.38,
    },
  },
];

function titleCase(part: string) {
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function slugToScientificName(slug: string) {
  return slug.split("-").map(titleCase).join(" ");
}

function slugToDisplayName(slug: RawSpeciesSlug) {
  return commonNameFallbacks[slug] ?? slugToScientificName(slug);
}

function fallbackShapeProfile(slug: RawSpeciesSlug): SnakeShapeProfile {
  const family = profileFamilies.find((entry) => entry.match(slug));

  return (
    family?.profile ?? {
      pathLength: 2.2,
      aspectRatio: 3.4,
      curvature: 0.27,
      turnVariance: 0.2,
      waviness: 0.45,
    }
  );
}

export const snakeProfiles: SnakeProfile[] = rawSpeciesSlugs.map((slug) => {
  const metadata = curatedSnakeMetadata[slug];

  return {
    id: slug,
    commonName: metadata?.commonName ?? slugToDisplayName(slug),
    scientificName: slugToScientificName(slug),
    image: `/images/snakes/${slug}.jpg`,
    habitat: metadata?.habitat ?? null,
    region: metadata?.region ?? null,
    venomous:
      metadata?.venomous === undefined
        ? venomousFallbacks.has(slug)
          ? true
          : null
        : metadata.venomous,
    facts:
      metadata?.facts ?? [
        "Educational facts for this species are still being curated.",
        "This MVP currently prioritizes a featured subset with hand-authored species notes.",
      ],
    shapeProfile: metadata?.shapeProfile ?? fallbackShapeProfile(slug),
    isFeatured: metadata?.isFeatured ?? false,
  };
});

export const featuredSnakeProfiles = snakeProfiles.filter((snake) => snake.isFeatured);
