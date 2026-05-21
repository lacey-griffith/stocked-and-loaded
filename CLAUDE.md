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
