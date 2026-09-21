# Texas M&O Funding Simulator

Independent-study project modeling the Texas Foundation School Program's M&O
(Tier One + Tier Two) funding formula for a single district, built from
TEA's Summary of Finances structure.

## Start here

Read **`BUILD_SPEC.md`** first — it's the full brief: goals, scope, data
schema, formula architecture, and suggested build order. It's written to be
handed directly to a Claude Code session as its starting context.

## What's in this folder

- `BUILD_SPEC.md` — the build spec (read this first)
- `mo_variables.json` — 91 M&O funding variables (symbol, formula, weight/rate,
  cost-behavior classification), the actual data the formula engine runs on
- `MO_Variables_v2.xlsx` — the same data, human-readable, canonical if it ever
  disagrees with the JSON. Has a Legend tab explaining every column.
- `TX_MO_Funding_Variable_Tree.html` — interactive visual map of how every
  variable nests into the aggregation hubs and ultimately into total funding.
  Open it in a browser; no build step needed.

## Scope

This repo is M&O only (Tier One + Tier Two + ASF + IMTA). I&S, required
expenditures, and federal funding are separate future modules — see
`BUILD_SPEC.md` §2 and §7 for what's deliberately not here yet.

## Suggested stack

Client-side React (Vite), no backend needed for v1. See `BUILD_SPEC.md` §8
for the full reasoning. Deploy free via Vercel or GitHub Pages.
