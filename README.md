# Legislator Election 24

Legislator election visualization (Vue 3 + D3). Deployable to GitHub Pages.

## Demo & Repo

- Demo: `https://kevin7261.github.io/legislator-election-24/`
- Repo: `https://github.com/kevin7261/legislator-election-24`

## Features

- Visualization with Vue 3 and D3.js
- Tunable settings and responsive layout
- Correct base path for static hosting: `'/legislator-election-24/'`
- Data decoupled under `public/data/`

## Tech Stack

- Vue 3, Vue Router, Pinia
- D3.js (drawing, transforms, zoom)
- Bootstrap 5, Font Awesome

## Data

- Grid stats: `public/data/geojson/grid_with_weighted_angle_stats_500m.geojson`
- Boundary: `public/data/geojson/臺北市區界圖_20220915.geojson`

## Project Structure

```
src/
├─ tabs/
│  └─ MapTab.vue            # map + arrow rendering
├─ stores/
│  ├─ dataStore.js          # visualization flags/data
│  └─ defineStore.js        # settings
├─ router/
│  └─ index.js              # base: '/legislator-election-24/'
└─ main.js

public/
└─ data/
   └─ geojson/

vue.config.js               # publicPath: '/legislator-election-24/'
```

## Quick Start

Requirements: Node.js 16+, npm 7+

```bash
git clone https://github.com/kevin7261/legislator-election-24.git
cd legislator-election-24
npm install
npm run serve
```

Dev URL: `http://localhost:8080/legislator-election-24/`

## Build & Deploy

```bash
npm run build     # outputs dist/
npm run deploy    # publish to GitHub Pages via gh-pages
```

Keep `publicPath` and router base aligned with the repo name.

## Scripts

```bash
npm run lint
npm run lint:fix
npm run prettier
npm run format
```

## License

MIT
