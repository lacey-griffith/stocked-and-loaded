# stocked & loaded — project context

## Stack
Vite + React, single-file app (src/App.jsx), deployed via GitHub Actions to GitHub Pages.

## Live site
lacey-griffith.github.io/stocked-and-loaded

## Data
79 real HEB orders, May 2023–May 2026, 2,002 items in src/seedData.js. Stored in localStorage key `stocked_and_loaded_v1`. Falls back to SEED_DATA on first load.

## Sprint status

| Sprint | Status | What shipped |
|--------|--------|-------------|
| 1 | ✅ Done | Category overrides, column sorting, time range filters |
| 2 | ✅ Done | Product detail page, full price graph |
| 3 | ✅ Done | Overview drilldowns, price history redesign |
| 4 | ✅ Done | Cart estimator, price alerts |
| 5 | ✅ Done | Insights layer (MoM spend, price movers, category trends) |
| 6 | ✅ Done | Volatile repeat buys filter, volatility scores (0–100, low/med/high), YoY seasonal spend chart |
| 7 | ✅ Done | Recipes tab (ingredient picker, price status, per serving cost) |
| 8 | 🔲 Next | Products tab (merge Items + Price History), sparklines grid, scatter chart, side panel detail |

## Up next
- Sprint 8: Merge Items + Price History into unified Products tab with three views (Table, Sparklines, Scatter) and a slide-in detail panel
- Receipt import: AI-powered OCR via Anthropic API (needs VITE_ANTHROPIC_API_KEY setup for local + GitHub Pages)

## Key constants / localStorage keys
- `stocked_and_loaded_v1` — orders array
- `stocked_loaded_cat_overrides` — category override map
- `stocked_loaded_time_range` — persisted time filter
- `stocked_loaded_cart_v1` — cart items
- `stocked_loaded_watchlist_v1` — price watch targets
- `stocked_loaded_recipes_v1` — saved recipes

## Agents
- `.claude/agents/Jenny.md` — spec compliance
- `.claude/agents/Karen.md` — reality check  
- `.claude/agents/Maya.md` — UI/UX design review
- `.claude/agents/Rex.md` — data analyst

## Last completed work
Sprint 6 finalized: volatility scores added to all Price History cards (calcVolatilityScore formula: priceRangePct×0.6 + normalizedChangeCount×0.4, capped 100, requires ≥3 purchases). YoY chart added to Insights tab with Week/Month/Year bucket toggle and category filter.
