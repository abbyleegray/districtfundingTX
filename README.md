# Texas M&O Funding Simulator

An interactive simulator of the Texas Foundation School Program's
**Maintenance & Operations (M&O)** funding formula — Tier One, Tier Two, ASF,
and IMTA — for a single Texas school district. Build a synthetic district
from enrollment, attendance, and population-share sliders and see how state
M&O revenue responds, including the step-costs and thresholds that make the
formula non-linear as a district grows or shrinks.

See `docs/source-data/BUILD_SPEC.md` for the full project brief (goals,
scope, data schema, formula architecture). This build implements build-order
items 1–5: formula engine, synthetic district input UI, results breakdown,
cost-behavior-aware visualization, and the SpEd funding model toggle. Real
district (SOF) lookup mode (§3, item 6) is not yet built.

## Running it

```
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint
```

## Project layout

- `src/engine/` — the pure calculation engine (BUILD_SPEC §8). No React
  imports. `calculateFunding(inputs, rateOverrides?)` in `calculate.ts` is
  the entry point; `synthetic.ts` converts the friendlier
  enrollment/attendance/%-share UI inputs into the engine's raw `EngineInputs`.
- `src/components/` — the React UI: the district-builder form, the funding
  breakdown table, and the marginal-cost-by-district-size chart.
- `src/data/mo_variables.json` — the 91-variable dataset the engine is built
  from.
- `docs/source-data/` — the original build spec, the human-readable
  spreadsheet (canonical if it ever disagrees with the JSON), and the
  interactive variable-tree map.

## Notable modeling decisions

- **Carve-out vs. overlay categories** (BUILD_SPEC §5): Special Education and
  CTE population shares subtract from `ADA_ref` to produce `ADA_reg`, and are
  validated against a shared 100%-of-enrollment cap. Every other category
  (Bilingual, G/T, R-PEP, Comp Ed, Dropout Recovery, Retention, …) overlays
  independently on the same base and is allowed to overlap.
- **Per-category attendance-rate overrides**: every ADA-driven category can
  override the district-wide attendance rate; enrollment-based categories
  (Dyslexia, Comp Ed, Basic Costs, IMTA) never multiply by an attendance rate
  at all, per TEA's own guidance that those allotments don't shrink with
  chronic absenteeism.
- **SpEd model toggle**: switching between the Legacy instructional-arrangement
  model and the New Model — Exploratory service-intensity structure
  recomputes `FTE_sped_agg → ADA_reg → WADA → Tier Two`, per BUILD_SPEC §6.
  The new model's dollar weights are always open user inputs — no weight is
  finalized in statute yet.
- **"Other Programs" pass-throughs**: line items whose dollar amounts are
  district-specific or whose statewide rate was never published (Ch. 313
  credits, TIRZ payments, homestead/compression aid, mentor-program rate,
  etc.) are exposed as direct dollar inputs rather than guessed at from a
  population share, since the source dataset itself flags them as
  not-formula-derivable.
- **Simplifications flagged in code comments**: the Tier Two DTR1/DTR2
  golden/copper-penny split, the Small/Mid-Size Adjustment's ADA basis, and
  the Pre-K carve-out's netting against the K-3 pool are all areas where the
  public TEA documentation is less precise than the rest of the formula: the
  engine takes a reasonable, clearly-commented position rather than silently
  guessing. Validate against a real district's Summary of Finances report
  before relying on exact dollar figures.

## Not yet built

- Real-district (TEA Summary of Finances) lookup mode.
- Legislatively required expenditures, I&S, and federal funding — separate
  modules by design (BUILD_SPEC §2).
