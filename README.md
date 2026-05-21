# stocked & loaded 🛒

Personal HEB grocery cost tracker. Built with Vite + React, deployed on GitHub Pages.

## Setup

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` auto-deploy to GitHub Pages via the included Actions workflow.

One-time setup in your repo settings:
- **Settings → Pages → Source → GitHub Actions**

Then push and it'll be live at `lacey-griffith.github.io/stocked-and-loaded`

## Features

- **Overview** — spend charts, category breakdown, top repeat buys
- **Orders** — browse all orders, expand to see itemized list
- **Items** — searchable, filterable item browser with categories
- **Price history** — track price changes per item over time
- **Screenshot import** — upload HEB app screenshot, Claude reads it automatically
- **Manual entry** — add orders by hand

## Data

Stored in `localStorage`. To import your full order history, run `heb-scraper.js` in your browser console on heb.com while logged in.
