# stocked & loaded — Project Notes

## Ship Log Rule

After every commit/push, append a log entry to the ## Ship Log section of this file. Each entry must include:
- Date
- What changed (2-3 sentences max, plain english)
- Any known issues or follow-ups

---

## Ship Log

### 2026-05-22 (12)
Applied 18 Maya UI/UX design review fixes across App.jsx, App.module.css, and index.css. Key changes: `button:focus-visible` red outline added globally; cart rows stack to single column on mobile ≤500px; product detail store column hides and grid reflows to 4 columns on mobile ≤480px; image/store placeholders moved to below the purchase history table; cart qty stepper buttons get aria-labels; Price Watch card hidden when watchlist is empty; category trend legend dots removed; chart label is now dynamic ("Spend per order/week/month"); MoM Change box gets a colored left border when non-zero.
- No known issues.

### 2026-05-22 (11)
Completed product detail view. Re-added `prevTab` state — `selectProduct()` now captures the current tab, and Back calls `setTab(prevTab)` so it reliably returns to the originating tab. Low/High hero stats now show the date of that price. Added a gray rounded image placeholder card (ti-photo, "Image coming soon") between the graph and the purchase history table. Replaced the plain multi-store text with a dashed-border card (ti-building-store icon, "Price comparison across stores coming soon").
- No known issues.

### 2026-05-22 (10)
Fixed date parsing, chart readability, orders compact view, price history A–Z index, and items load more. `parseDate()` now uses a regex to extract just `Month Day, Year` from HEB timestamps like "Dec 15, 2023, 11:00am–12:00pm", fixing MoM bucketing inflation. Overview bar chart has Per order / Weekly / Monthly toggle with autoSkip + maxTicksLimit:12. Orders tab adds a compact list view (one row per order, expandable). Price history gets an A–Z pill bar that scrolls to the first matching item. Items tab cap raised to 250 with a Load more button (+250/click).
- No known issues.

### 2026-05-22 (9)
Applied 4 Jenny/Karen audit fixes to Sprint 5 product detail. `pdBack` used undefined `var(--sans)` — fixed to `var(--font)`. Blank-page trap patched: when `selectedProduct` key is missing from `priceHistory`, a back button + "Item not found" message renders instead of an invisible dead end. `prevTab` state was dead (tab never changes during product navigation) — removed. Insights price mover names now clickable via `selectProduct(c.key)`, making them the 7th entry point to product detail.
- No known issues.

### 2026-05-22 (8)
Added product detail view (Sprint 5). `ProductLineGraph` (200px, all dots, accented last point with white border, x/y axes). Clicking any item name in the items table, order drilldowns (overview and orders tab), category drilldown, cart, or price history card opens a full detail view with hero stats (current price, total delta chip, low/high), Chart.js line graph, purchase history table (date/store/qty/price/change), and a multi-store placeholder. Back button or tab switch clears the view.
- No known issues.

### 2026-05-22 (7)
Applied 5 Sprint 4 audit fixes. `cartRow` border switched to `border-top/:first-child` to eliminate the double border between the last cart item and the total strip. `updateCartQty` now clamps at 1 (`Math.max`) so the − button never silently deletes — the explicit × is the only delete path. `cartSearch` cleared in the `[tab]` effect so the search dropdown doesn't reappear when returning to the cart tab. `useMemo` dep array for `computeInsights` expanded to `[orders, catOverrides]`. Watchlist target input gets `placeholder="0.00"`.
- No known issues.

### 2026-05-22 (6)
Added cart estimator and price alerts (Sprint 4). Cart tab (`ti-shopping-cart-plus`) lets you search price history items, add them with a qty stepper, and see a running estimated total. Each row shows last-bought date and price-change count. A bell button pre-fills a watch target with the current price and adds the item to a "Price watch" section below the cart, which shows editable target price, current price, and a green/red/gray status chip. If any watched items are at or below target, a green callout appears in the overview insights card. Both cart and watchlist persist to localStorage.
- No known issues.

### 2026-05-22 (5)
Applied 10 Jenny/Karen audit fixes to the Insights feature. Key fixes: price movers now compare the last two purchases (not first-to-last) so intermediate price swings register correctly; `momDelta === 0` renders "No change" in gray instead of falling through to green; `categoryTrend` wired into the category trends card as a "Biggest shift" callout; overview insights card labeled "· current month" to distinguish it from filtered metrics; `computeInsights` wrapped in `useMemo([orders])`; explicit +/- signs on all delta values; CSS border fix and category name overflow truncation.
- No known issues.

### 2026-05-22 (4)
Added Insights tab and overview summary card. `computeInsights(orders, allItems)` computes month-over-month spend delta, all price movers (jumps and drops sorted by magnitude), and per-category MoM growth. A red-left-border summary card above Top Repeat Buys in the overview tab shows this-month total, MoM delta, and price change count with the biggest mover callouts and a "View insights →" link. The full Insights tab has three cards: month comparison boxes, a two-column price movers grid (increases / decreases, top 6 each), and a category trend bar list.
- No known issues.

### 2026-05-21
Vite + React app deployed to GitHub Pages via GitHub Actions. Price history tab overhauled: sparklines (Chart.js, teal line, no axes), numeric delta chips (red for increases, green for decreases), search filter by item name, sorted by most price changes descending. Fixed entry sort order (was newest-first, now oldest-first) and replaced string unit price comparison with numeric via `parseUnitPrice`. Agents Jenny (spec auditor) and Karen (reality checker) added to `.claude/agents/`.

### 2026-05-21
Applied HEB brand color palette to `index.css`. Added 11 brand variables (`--color-teal`, `--color-heb-red`, cold-brew scale, etc). Replaced old green accent (#2d6a4f) with `--color-teal` (#2B8562) for charts, tabs, and focus rings; primary buttons now use `--color-heb-red` (#E1251B) via a new `--primary` token. Backgrounds mapped to cold-brew-50 and buttercream; danger updated to brisket-red.
- No known issues. Dark mode accent updated to a lighter teal (#4db88a).

### 2026-05-21
Full rebrand to HEB bright/clean aesthetic. Page background is cold-brew-50 (#F5F5F5), all cards are white with light #E5E5E5 borders and a subtle shadow. Header is HEB red with white text; active tabs are red; bar chart bars are red. Removed the dark-mode media query entirely — app is always light. Secondary buttons (import, add manually) show as white on the red header.
- No known issues.

### 2026-05-21
Replaced seed data with the full 79-order HEB export from `heb-orders-2026-05-21 (2).json`. Previous seed had 9 orders; this brings in real order history with more items and a longer date range.
- No known issues.

### 2026-05-21
Added persistent category overrides. Items tab category column is now a pill-shaped select — changing it writes to `stocked_loaded_cat_overrides` in localStorage immediately. Overrides flow into `allItems` so they propagate to the overview donut chart, order detail color dots, and price history without any extra steps.
- No known issues.

### 2026-05-21
Added asc/desc/off column sorting to the items table. Each of the four column headers is clickable and cycles through states; active column shows a directional chevron, inactive columns show a faded up-chevron hint. Jenny and Karen both audited before push — two fixes applied (null guards on name/cat comparators, key props on chevron elements).
- No known issues.

### 2026-05-22 (3)
Applied all 16 Jenny/Karen audit fixes. `TimeFilterBar` hoisted to module scope (was remounting on every render, breaking date input focus). `PriceHistoryCard` keyed on `item.name` instead of array index (view-state no longer bleeds between cards after search). Category drilldown `lastPrice` and `totalSpend` now use `parseUnitPrice(i.unitPrice)` instead of the line total. Bar/donut `onClick` handlers no longer cross-null each other (drilldowns are independent). Drilldowns clear on tab switch. `freshOrders` captured inside `setTimeout` for a clean closure. `drilldownOrderData` resolves from `timeFilteredOrders`. Chart `useEffect` cleanup now destroys both chart instances. Indicator chip has explicit `overview` branch. Hero "Current" shows `—` for missing unit price. `phStatBox` has `min-width: 60px`; `phHeroValue` truncates with ellipsis. `minEntry`/`maxEntry` use `findLast` for most-recent occurrence. Screenshot button hidden unless `VITE_ANTHROPIC_API_KEY` is set (with `console.warn`). Status badge added to bar drilldown panel. `::marker { display: none }` replaced by existing `list-style: none`.
- No known issues.

### 2026-05-22 (2)
Redesigned price history cards. Each card now has a hero stat row (current price, total delta chip in red/green, times bought, Low/High stat boxes with dates). The old sparkline is replaced with a responsive 90px Chart.js line graph (HEB red, white-bordered dot on the most recent point, no axes/grid). Price entries collapse into a `<details>` toggle in Graph view. A Graph/Chips button pair at the top-right of each card toggles between the full graph+stats layout and a flat always-expanded chips-only view.
- No known issues.

### 2026-05-22
Wired time range filter to the overview tab. All four metrics, both charts, and the category legend now reflect the active filter. Bar chart drilldown: clicking a bar shows a full order detail panel below the charts (same style as orders tab). Donut drilldown: clicking a category segment shows a panel with top items in that category sorted by total spend, including times bought and last price. Both drilldowns reset on filter change and can be closed via X button or re-clicking the same element.
- No known issues.

### 2026-05-21
Added time range filtering to the items and orders tabs. A filter bar with 30d/60d/90d pills, a month dropdown (built from actual order dates), and a custom date range picker sits above both tabs. Selection persists to localStorage via `stocked_loaded_time_range`. An active indicator chip shows how many records match (e.g. "12 of 79 orders").
- No known issues.
