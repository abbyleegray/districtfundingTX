# Texas M&O Funding Simulator — Build Spec

## 1. What this app is

An interactive simulator of the Texas Foundation School Program's **Maintenance & Operations (M&O)** funding formula — Tier One and Tier Two — for a single Texas public school district at a time. The person using it can adjust a district's characteristics (size, student population mix, tax rate, staffing) and see how state M&O revenue responds.

**Primary analytical goals** (in the founder's own words, condensed):
1. **Budget flexibility analysis** — how far a district's M&O dollars stretch once staffing and required costs are subtracted.
2. **Marginal cost vs. marginal revenue by district size** — the funding formula is mostly linear per-student, but a handful of genuinely step-fixed costs (campus counts, size thresholds) create real non-linearities as a district grows or shrinks. The app should make these visible, not smooth them away.
3. **Policy sandbox** — testing hypothetical changes to the funding formula itself (weights, rates, caps) to see fiscal impact, including a fully open "what if Texas adopted a different Special Education funding structure" mode (see §6).
4. **Trade-off modeling** (later phase, not v1) — once required expenditures are layered in, model the staffing trade-offs districts are forced into under budget constraints (e.g., cutting a librarian position to add a teacher).

## 2. Scope for this build phase

**In scope:** M&O revenue only — Tier One + Tier Two + ASF + IMTA. This is the `mo_variables.json` dataset (91 variables, described in §4).

**Explicitly out of scope for now** (separate future modules, do not build):
- **I&S** (bonds/debt service) — entirely different funding mechanism (guaranteed-yield programs on debt service, not an entitlement formula), no recapture applies to it. Will get its own module later, including "what if a bond fails" scenarios.
- **Legislatively required expenditures** (minimum salary schedules, class-size ratios, safety mandates) — different research base (TEC Ch. 21, §25.112, TAC facility standards), will be a separate spreadsheet/module before it's wired into this app.
- **Federal funding** — real and required eventually (see §7 for the legislative basis), but not yet built.
- **Recapture, Local Fund Assignment, charter-only funding, single-institution funding (Windham/TSBVI/TSD)** — deliberately excluded from the M&O dataset itself; these represent local-revenue accounting or entity types outside a standard ISD's own retained M&O revenue, not part of this tool's target output.

## 3. Two operating modes the app must support

- **Synthetic/hypothetical district mode** — the primary mode. The person builds a district from scratch: total enrollment, an attendance-rate assumption, and category-level population percentages (see §5).
- **Real district mode** — pulls a specific real Texas district's actual numbers. TEA publishes a **Summary of Finances (SOF)** report *per district*, in the same structure this whole dataset was reverse-engineered from (Tier One Detail, Special Education FTE, Tier Two Detail, etc.), available via TEA's Foundation School Program → Summary of Finances page and the School District State Aid Reports webpage. Each SOF report comes in multiple vintages per year (LPE, DPE, Near Final, Final) — default to Final for a settled/accurate picture, but let the user pick. This mode is a stretch goal for v1; the data-entry UI for synthetic mode should be built first and is the harder problem.

## 4. The data file: `mo_variables.json`

91 records, each with this schema (matches the columns in `MO_Variables_v2.xlsx`, which is the human-readable source of truth if the JSON and spreadsheet ever diverge — treat the spreadsheet as canonical):

```json
{
  "symbol": "w_mainstream",
  "name": "Mainstream ADA weight",
  "fsp_component": "Tier One",
  "category": "Special Education",
  "tec_statute": "48.102",
  "value_rate": "1.15",
  "cost_behavior_tag": "Linear - Per Unit",
  "count_basis": "ADA (Attendance)",
  "variable_type": "Statewide Constant",
  "formula": "ADA_mainstream x w_mainstream x BA_adj",
  "unit": "Weight",
  "source_sheet": "Special Education FTE",
  "source_location": "Row 20",
  "notes": "...",
  "my_notes": ""
}
```

**Fields that should directly drive app behavior:**
- **`cost_behavior_tag`** — this is the field that should determine how a variable's UI control behaves and how it's visualized in any marginal-cost analysis. Values in use: `Linear - Per Unit`, `Linear - Flat $ Per Event`, `Per-Campus (Step)`, `Sliding Scale`, `Step-Threshold`, `Capped / Prorated`, `One-Time / Facility-Triggered`, `Derived - Formula Output`, `Statewide Constant (Non-Scaling)`, `Statutory Cap/Ceiling`. The `Per-Campus (Step)` and `Step-Threshold` tags are your two clearest built-in step-cost examples (School Safety's campus allotment; Teacher Retention's 5,000-enrollment size cutoff) — these should visibly behave differently from smooth per-student sliders, since that discontinuity is a core thing the app exists to show.
- **`count_basis`** — determines which top-level input a variable's count multiplies against: `ADA (Attendance)`, `Enrollment (Membership)`, `FTE (Instructional Time)`, `WADA (Derived Aggregate)`, `Teacher/Staff Count`, `Graduate Count (Event)`, `Campus/Facility Count`, `Route Mileage`, or an `N/A (...)` subtype for pure constants/derived values. **Getting this right matters concretely**: Comp Ed, Dyslexia, Basic Costs, and IMTA are enrollment-based and do NOT shrink if attendance drops while enrollment holds steady — nearly everything else does. A model that applies one attendance-rate multiplier uniformly to every category will misstate this.
- **`variable_type`** — `District Input` (user-editable), `Statewide Constant` (fixed unless explicitly testing a policy-change scenario), `Derived` (computed, never a direct input), `Statutory Cap` (a ceiling, needs proration logic if binding).

## 5. Formula architecture — the core dependency chain

Full detail lives in `MO_Variables_v2.xlsx` (91 rows) and was mapped visually during design (available as reference: `TX_MO_Funding_Variable_Tree.html`). The skeleton:

```
ADA_ref (Refined ADA - measured, not derived)
  ├─ minus FTE_sped_agg, FTE_cte_agg → ADA_reg → Regular Program Allotment
  ├─ × rate_ssa_ada → School Safety (ADA component)
  └─ checked against 1,600/5,000 thresholds → Small/Mid-Size Adjustment

WADA = (sum of every Subchapter B/C weighted allotment) / BA_adj
  → feeds Tier Two Guaranteed Yield exclusively:
     Tier Two = yield_L1 × WADA × DTR1 + yield_L2 × WADA × DTR2 − local share

Total M&O Funding = Total Cost of Tier One + Tier Two + ASF + IMTA
```

**Two categories of student-population inputs, and they behave differently:**
- **Carve-out categories** (Special Education, CTE): their FTE counts *subtract* from `ADA_ref` to produce `ADA_reg`. These have a real ceiling — you cannot carve out more than 100% of a district's population, and the 9 SpEd instructional-arrangement FTEs and 3 CTE FTE tiers should be tracked against a shared cap for validation.
- **Overlay categories** (Bilingual, G/T, R-PEP, Comp Ed, Dropout Recovery, Support Staff Retention): applied independently against the shared ADA/Enrollment base, and **can and should overlap** — a student can be Bilingual and G/T simultaneously, and the math should allow that rather than forcing categories into a non-overlapping partition.

**Per-category attendance-rate override:** rather than one global attendance rate applied everywhere, each ADA-driven category should support its own attendance-rate input (defaulting to the district-wide rate, editable per category), since real subpopulations can and do have different attendance patterns than the district average. For carve-out categories (SpEd/CTE) this has a genuine second-order effect: a lower SpEd attendance rate means less gets subtracted from `ADA_reg`, which changes Regular Program revenue too — this should be visible in the UI, not hidden.

**Special Education FTE mechanics (if modeling below the aggregate level):** SpEd FTE is not attendance — it's `contact hours ÷ 6-hour day`, capped by IEP-authorized eligibility, and capped statutorily at 6 hours/day or 30 hours/week per student across all combined services. If the app ever models per-student service combinations rather than pure aggregate percentages, build "service profiles" (e.g., "Resource Room only," "Resource + Speech combo") rather than fully independent per-setting sliders, since independent sliders can't represent the shared 6-hour ceiling or support realistic reallocation scenarios (moving students from one profile to another).

## 6. Special Education funding model toggle

Texas is mid-transition from the current instructional-arrangement model to a new **service intensity model** (HB2/SB568, 89th Legislature). Build this as a toggle:

- **Legacy Model** (default, and the only model legally in effect through SY 2025-26): the 9 instructional-arrangement weights already in `mo_variables.json` under Category = "Special Education".
- **New Model — Exploratory**: structurally real (7 intensity tiers, one reserved for residential placement, determined via 5 ARD-assessed domains; up to 2 stackable service groups for related services/1:1 support), but **no dollar weight per tier is finalized in statute yet** — final 2026-27 weights aren't determined until the September 2027 settle-up, and truly permanent weights await the Legislature's 2027 session. Build the tier/service-group *structure* as fixed, but make every dollar-per-tier field an open, user-adjustable input with no authoritative default. If a placeholder seed value is wanted for demonstration purposes, the 2022 Special Education Funding Commission's draft (never-enacted) illustrative ranges are the best available anchor — Tier 3 ≈0.97–1.32, Tier 4 ≈1.28–1.70, Tier 5 ≈1.50–1.99, Tier 6 ≈4.80–6.00, Tier 7 as high as 20 — clearly labeled in the UI as illustrative, not current law.
- Switching modes must recompute downstream: SpEd allotment change → `FTE_sped_agg` → `ADA_reg` → `WADA` → Tier Two. If toggling the SpEd model doesn't visibly move Tier Two revenue too, the wiring is wrong.

## 7. Federal funding (for a later module — legislative basis only, not built yet)

When this module is built, the controlling statutes are:
- **ESEA/ESSA** (Pub. L. 114-95) — Title I-A (aid to low-income students, by far the largest program), Title I-C (Migrant Ed), Title II-A (teacher quality), Title III-A (English learners), Title IV-A (student support/enrichment)
- **IDEA** (20 U.S.C. §1400 et seq.) — Part B (school-age SpEd) and Part C (infants/toddlers)
- **Perkins V** (20 U.S.C. §2301 et seq.) — federal CTE funding
- **McKinney-Vento Homeless Assistance Act**, Title VII-B
- **Impact Aid Act** — relevant given Texas's significant federal/military land acreage
- **Richard B. Russell National School Lunch Act** — flows through a separate Food Service Fund, not general operating funds (parallel to how I&S sits outside M&O)

Unlike TEC's formulas, federal formula-grant *dollar amounts* reset annually via congressional appropriations rather than being fixed like TEC weights — model them the way Tier Two's yield rates are modeled (a rate that can change year to year), not as a hardcoded constant. As of the most recent appropriations act (FY26, signed Feb. 2026), all major titles remain funded near FY25 levels despite administrative reorganization attempts — but which federal agency administers some programs may still shift even where the underlying formula hasn't changed. Check current status before hardcoding figures when this module is actually built.

## 8. Suggested technical architecture

- **Client-side React app (Vite)** — the entire calculation engine can run in the browser; no backend is needed for v1 since this is a calculator, not a multi-user data store.
- **Formula engine as plain JS/TS, decoupled from UI** — load `mo_variables.json`, expose a `calculateFunding(districtInputs, options)` function that returns the full breakdown (every allotment line + subtotals + total). Keep this pure/testable, independent of React state.
- **Hosting:** GitHub for the repo, Vercel (or GitHub Pages) for zero-cost static deployment.
- **State management:** React's built-in state is almost certainly sufficient given the app's single-district, single-session nature — don't reach for Redux/Zustand unless the UI complexity genuinely demands it.
- If/when persistent shared scenarios across users are wanted, add a lightweight backend (e.g., Supabase) at that point — not before.

## 9. Suggested build order

1. Formula engine (pure functions, `mo_variables.json` → total funding number), tested against a known real district's actual SOF report for validation.
2. Synthetic district input UI: total enrollment, district-wide attendance rate, category percentage sliders (carve-out vs. overlay behavior as in §5).
3. Results display: full allotment breakdown, not just a final number — the whole point is seeing where the money comes from.
4. Cost-behavior-aware visualization: make step costs (Per-Campus, Step-Threshold) visibly different from smooth per-student lines — this is the marginal-cost/revenue-by-size analysis in concrete form.
5. SpEd model toggle (§6).
6. Real-district lookup mode (§3), if pursued for v1.

## 10. Files accompanying this spec

- `mo_variables.json` — the 91-variable dataset, described in §4.
- `MO_Variables_v2.xlsx` — the same data, human-readable, with a Legend tab explaining every column and a full record of what was trimmed and why. Treat as canonical if the two ever disagree.
- `TX_MO_Funding_Variable_Tree.html` — an interactive visual map of how every variable nests into the aggregation hubs (`ADA_reg`, `WADA`, Tier One/Two totals, Total M&O Funding). Useful for onboarding anyone else onto the project, or for re-orienting after time away.
