# stocked & loaded — Project Notes

## Ship Log Rule

After every commit/push, append a log entry to the ## Ship Log section of this file. Each entry must include:
- Date
- What changed (2-3 sentences max, plain english)
- Any known issues or follow-ups

---

## Ship Log

### 2026-05-21
Vite + React app deployed to GitHub Pages via GitHub Actions. Price history tab overhauled: sparklines (Chart.js, teal line, no axes), numeric delta chips (red for increases, green for decreases), search filter by item name, sorted by most price changes descending. Fixed entry sort order (was newest-first, now oldest-first) and replaced string unit price comparison with numeric via `parseUnitPrice`. Agents Jenny (spec auditor) and Karen (reality checker) added to `.claude/agents/`.

### 2026-05-21
Applied HEB brand color palette to `index.css`. Added 11 brand variables (`--color-teal`, `--color-heb-red`, cold-brew scale, etc). Replaced old green accent (#2d6a4f) with `--color-teal` (#2B8562) for charts, tabs, and focus rings; primary buttons now use `--color-heb-red` (#E1251B) via a new `--primary` token. Backgrounds mapped to cold-brew-50 and buttercream; danger updated to brisket-red.
- No known issues. Dark mode accent updated to a lighter teal (#4db88a).

### 2026-05-21
Full rebrand to HEB bright/clean aesthetic. Page background is cold-brew-50 (#F5F5F5), all cards are white with light #E5E5E5 borders and a subtle shadow. Header is HEB red with white text; active tabs are red; bar chart bars are red. Removed the dark-mode media query entirely — app is always light. Secondary buttons (import, add manually) show as white on the red header.
- No known issues.
