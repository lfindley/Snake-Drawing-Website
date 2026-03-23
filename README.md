# Snake Match

Snake Match is a client-side MVP built with Next.js, React, TypeScript, Tailwind CSS, Motion, and an HTML5 canvas. A user draws a single snake-like line, the app normalizes that stroke, extracts a small set of geometry features, and compares those features against local snake profiles to return the closest species match.

The current phase is intentionally desktop-first. The drawing surface, result composition, and transition scale are tuned for laptop and monitor widths, while mobile remains a functional fallback.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Dataset

- Raw image corpus: `Snake images/<species-slug>/*.jpg`
- App-served representative images: `public/images/snakes/<species-slug>.jpg`
- Typed species metadata and profiles: `src/data/`

The app merges folder-derived species IDs with an app-owned metadata layer. Featured species have curated facts and hand-tuned shape profiles. Other species fall back to placeholder facts and safe unknown states where metadata is incomplete.

## Matching pipeline

1. Capture the user stroke as ordered canvas points.
2. Resample and normalize the stroke for position, scale, and direction.
3. Extract path length, aspect ratio, curvature, turning variance, and waviness.
4. Compare those features against the local snake shape profiles with a weighted distance function.
5. Return the closest profile, a similarity score, and a feature-by-feature confidence report.

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run validate:dataset` checks representative images and metadata coverage.
- `npm run test:matcher` runs the saved matcher regression fixtures.

## Future improvements

- Replace or blend the heuristic matcher with a CV or ML pipeline.
- Generate the species index automatically from the image folders at build time.
- Add more curated facts and habitat data for the non-featured species.
- Support multiple strokes, undo, and optional image upload for comparisons.
