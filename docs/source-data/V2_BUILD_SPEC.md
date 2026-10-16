# Texas Public School Funding Simulator — Version 2 Build Spec

This supersedes `BUILD_SPEC.md` for everything it overlaps with. Where the two
disagree, this document wins — it incorporates real bugs found in the live V1
app, real statewide data analysis (spending and staffing trends by district
size), and a full UI/UX overhaul. Organized to be handed to Claude Code as a
standalone brief.

---

## 0. Known bugs to fix first (before any UI work)

These were found by testing the live V1 app against Austin ISD's actual FY24-25
Final Summary of Finances. Fix both before touching anything else, since the
UI work below assumes correct underlying numbers.

1. **Tier Two must floor at zero per level, not as a combined total.**
   ```
   Allotment_L1 = MAX(0, Entitlement_L1 - LocalShare_L1)
   Allotment_L2 = MAX(0, Entitlement_L2 - LocalShare_L2)
   TierTwo = Allotment_L1 + Allotment_L2   // can never be negative
   ```
   V1 was producing a large negative number for property-wealthy districts
   (e.g., -$332,123,236 for a test run) because it summed first and floored
   never, or floored only the combined total.

2. **Tier One needs the same floor-at-zero treatment, which was missing
   entirely.** `Total Cost of Tier One` (the gross entitlement) was being
   reported as if it were `FSP State Share of Tier One` (what the state
   actually pays after netting local revenue). These are different numbers:
   ```
   FSP_State_Share_Tier_One = MAX(0, Total_Cost_of_Tier_One - Local_Fund_Assignment - ASF)
   ```
   Real Austin ISD: Total Cost of Tier One = $582,942,368, Local Fund
   Assignment = $1,232,462,284 — the state share is correctly $0, not
   $582,942,368. Local Fund Assignment itself still doesn't need to be a
   user-facing variable (per the earlier scoping decision), but the
   subtraction and floor must happen internally using the property
   value/tax collection variables already in the model (`PV_curr`,
   `MO_collect`, `DTR1`, `DTR2`).

3. **Separately audit the Level 2 entitlement and combined local-share
   calculation** — in testing, Level 2's gross entitlement and the combined
   local share were both substantially overstated relative to Austin's real
   numbers (Level 2 entitlement ~$74.6K modeled vs. ~$40.3K real; local
   share ~$498K modeled vs. ~$309K real). Trace the full chain: `Total M&O
   Collections → Yield per Penny → Collections at Tier One Rate → Level 1
   collections (capped at 0.08) → Level 2 collections (the remainder) →
   DTR1 = L1 collections × 100 ÷ Property Value → DTR2 = L2 collections ×
   100 ÷ Property Value`.

4. **Confirmed test case for regression testing**: Austin ISD, FY24-25
   Final — WADA 93,709.514, property value $187,446,735,158, DTR1 0.0775,
   DTR2 0.0872, adopted M&O rate 0.8275, Tier One rate 0.6575. Expected
   result: **Tier One state share = $0, Tier Two = $0** (both correctly
   floored — Austin is wealthy enough to be entirely locally funded at
   both tiers). Basic Costs and IMTA were independently verified correct
   against real enrollment (72,272) in earlier testing — don't need
   re-checking.

5. **Two corrected statutory facts to fix in the data, not just the UI
   copy** (both were caught by inconsistencies between past research and
   these notes):
   - **G/T eligibility cap is 5% of ADA, not 7%.** TEC §48.109(a) sets the
     *weight* at 0.07 (the Basic Allotment multiplier); §48.109(c)
     separately sets the *eligibility cap* at 5%. These are easy to
     conflate since they're both small numbers in the same statute
     section, but they are not the same number. `cap_gt_pct` should read
     "5% of district ADA," and `w_gt` stays 0.07.
   - **TIA has no statewide funding cap and no cap on the number of
     teachers who can be designated.** Confirmed via TEA/TIA program
     materials: "Unlike previous state incentive programs, there is no cap
     on TIA allotment funds or the number of teachers who may earn a
     designation." Every other allotment in the sheet has some kind of
     ceiling (a statewide dollar cap, an ADA percentage cap, or an
     eligibility threshold) — TIA is the one genuine exception, and the
     UI should say so explicitly rather than implying a cap exists.

---

## 1. Overall vibe shift: instructive simulator, not just a calculator

Every input should teach the person what they just changed and why it
matters, not just accept a number. Concretely: no jargon without an
explanation available at the point of use; every pop-up follows the same
two-part structure (plain-language explanation on top, legal citation +
technical name + variable code on the bottom); acronyms get spelled out in
every header, with the acronym in parentheses after.

---

## 2. Visual/structural system

### 2.1 Three content-block types, used consistently everywhere

- **Permanent explainer box** — grayish rounded rectangle, always visible
  (not a pop-up). Used for section-level context that applies to everything
  below it (e.g., "for each of the following classifications, indicate the
  percent of your district's students who fall into that category").
- **Pop-up box** — a circled "?" icon. Click to reveal. Two-part structure,
  always: plain-language explanation first, then (if applicable) a line
  break and the statute citation + technical name + variable code +
  equation. Any statute citation inside a pop-up should be a clickable link
  to the actual code section (see §2.3).
- **Subtext** — small gray text under an input, permanently visible, no
  background box. Used for short clarifying instructions ("What percent of
  all enrolled students fall into this category?") or calibration guidance
  ("Typical range: 0.60–0.85 M&O tax rate").

### 2.2 Section-level structure

- **Revenue section** (currently "District Builder"): subtle green
  background. Collapsible accordion.
- **Expenditure section** (new): structurally parallel to Revenue.
  Collapsible accordion, placed directly beneath Revenue.
- **Funding breakdown output** (right side, top summary): unchanged
  placement. Add pop-ups to Tier One, Tier Two, ASF, IMTA, Other Programs
  explaining what each means; spell out every acronym in full.
- **Comprehensive funding breakdown** (the detailed line-by-line list):
  default to **collapsed**. Green background, a visibly **darker** shade
  than the Revenue section so the two are distinguishable at a glance.
  Every line item gets a pop-up with plain-language explanation + how it
  functions in the overall calculation + the equation at the bottom.
- **Total expenditures output** (new): placed beneath Total M&O Funding,
  structured the same way as the revenue breakdown — collapsed accordion
  by default, matching visual treatment, pop-ups on every line.

### 2.3 Interaction details

- Every variable dropdown gets a small arrow on the right indicating it
  expands on click.
- **Dual slider + type-in box, wherever a slider currently exists alone.**
  The type-in box respects the same cap as the slider (e.g., Homebound's
  20% cap). If a typed value exceeds the cap, show an inline error: `Max:
  20%` and clamp the value back to the max rather than silently rejecting
  it.
- **Lenient number formatting on every percentage/dollar input.** On blur
  or Enter: `5` → `5.00%`, `17.2` → `17.20%`. Dollar fields: allow the `$`
  to be typed or typed as pure digits; display the `$` symbol *inside* the
  input box (not just as a label beside it) once a value is entered.
- **Statute citations link out.** Anywhere a TEC/TAC section number appears
  inside a pop-up, hyperlink it to the actual code section (e.g.,
  `statutes.capitol.texas.gov` or `texas.public.law` — pick one source and
  use it consistently across every citation for a uniform look).
- **Cross-field validation, two places specifically called out:**
  - R-PEP: the sum of its sub-variable inputs cannot exceed total
    enrollment. Error message if violated.
  - CCMR graduation outcomes: same rule — the sum of the three graduate
    categories cannot exceed enrollment.
  - General principle worth applying anywhere a set of sub-category
    percentages represents mutually exclusive population slices (the
    "carve-out" categories from the data model, not the "overlay" ones,
    which are allowed to overlap by design — see `MO_Variables_v2.xlsx`'s
    Cost Behavior Tag column for which is which).

---

## 3. Title section

- **New title**: "Texas Public School Funding Simulator" (replaces "Texas
  M&O Funding Simulator").
- **New subheading**: "This simulator models how revenue is calculated and
  spent in Texas public school districts for maintenance and operations
  (i.e., salaries, curriculum, and all other day-to-day expenses).

  Note: This simulator does not model 'Interest and Sinking' revenue, which
  is used to pay bond and other long-term debt. The simulator will also not
  accurately predict public charter school revenue since the funding
  formula for charters differs."
- **Header restructured as two tabs**, browser-tab style: the active tab is
  bold/saturated, the inactive tab is muted. Second tab reads
  "Placeholder" for now (future: real district budget lookup — this is
  Purpose 2 from earlier planning). Clicking the inactive tab swaps which
  one is bold/muted.
- Increase title and subheading font size slightly for readability.

---

## 4. Revenue builder — section-by-section content

For every pop-up below, the structure is: **plain-language explanation**,
then (where applicable) a line break, then **statute citation (linked) +
technical name + variable code**. Equations belong in the detailed
breakdown pop-ups (§2.2), not necessarily the input-side pop-ups, unless
noted.

### District Basics
- Permanent explainer box: "The big-picture numbers describing the
  students your district serves."
- Total enrollment — pop-up: "The number of students who are enrolled in
  your district."
- District-wide attendance rate — pop-up: "The average share of enrolled
  days that students actually attended school last year. Real Texas
  districts typically run attendance rates in the high 80s to mid 90s
  (percent)."
- Rename "Implied ADA_ref" to **"Average Daily Attendance (calculated)"**
  in the main view; keep `ADA_ref` as the technical code shown only in
  that field's own pop-up/breakdown.

### Special Education
- **Legacy Model / New Model**: split into two side-by-side boxes, each
  with its own radio/bubble selector, each a **darker** shade than the
  standard permanent-explainer gray (to visually distinguish "you must
  choose one of these two" from ordinary informational boxes).
  - Legacy Model pop-up: "This is the model Texas has used since the
    current funding structure was adopted — special education funding is
    based on which instructional setting a student is placed in (such as
    a resource room or a self-contained classroom). It remains in effect
    through the 2025–26 school year and is being phased out in favor of a
    new model based on each student's intensity of need, not their
    classroom setting."
  - New Model pop-up: "A new funding structure, created by House Bill 2
    (2025), that funds special education based on how intensive a
    student's needs are rather than which classroom they're placed in. It
    is being phased in starting with the 2026–27 school year. The exact
    dollar amounts for each intensity tier have not been finalized by the
    state yet, so the values here are adjustable estimates, not official
    figures."
- Legacy model permanent explainer (above the category list): "For each
  of the following special education settings, enter the percentage of
  your district's students who are classified into that setting. A
  student can only be counted in one setting at a time."
- Per-category pop-ups (plain-language description for each; weight and
  citation go on the bottom half):
  - **Homebound**: "Students who receive instruction at home because a
    medical or other condition prevents them from attending school in
    person." *(Confirm current cap value with Claude Code against the
    live validation logic — notes reference a 20% cap already
    implemented.)*
  - **Hospital Class**: "Students receiving instruction in a hospital
    setting due to a medical condition."
  - **Speech Therapy**: "Students who receive speech-language therapy
    services."
  - **Resource Room**: "Students who spend part of their day in a general
    education classroom and part in a smaller, specialized setting for
    additional support."
  - **Self-Contained (Severe/Mild-Moderate)**: "Students who spend most
    or all of their school day in a specialized classroom designed for
    their specific needs."
  - **Off Home Campus**: "Students who receive special education services
    at a campus other than the one they'd normally attend."
  - **Vocational Adjustment**: "Students receiving job-training-related
    special education services."
  - **State Schools**: "Students placed at a state-run school for
    students who are blind, visually impaired, deaf, or hard of hearing."
  - **Residential Care and Treatment**: "Students placed in a residential
    facility that provides both treatment and education."
- Permanent explainer for **Non-Public Contracts, Mainstream, and ECI
  Set-Aside** (these behave differently from the categories above — they
  don't go through the same contact-hour/FTE calculation): "These three
  items work differently from the categories above. Non-Public Contracts
  and Mainstream are based on actual attendance rather than instructional
  time. The Early Childhood Intervention (ECI) Set-Aside is a mandatory
  deduction the state subtracts from the total special education funding
  pool — it isn't something your district receives, it's money set aside
  before allotments are calculated."
  - Mainstream pop-up: "Students who spend most of their day in a general
    education classroom with special education support, rather than a
    separate specialized setting."
  - Non-Public Contracts pop-up: "Students whose special education
    services are provided by an outside (non-district) provider under
    contract."
- Subtext under every SpEd percentage input: "What percentage of your
  district's special-education-identified students fall into this
  category?"

### CTE (Career and Technical Education)
- Header: "Career and Technical Education (CTE)"
- Per-category pop-ups:
  - **Not in an approved program**: "Students taking a standalone CTE
    elective course that isn't part of a structured, multi-course
    program."
  - **Approved program, levels 1–2**: "Students in the introductory or
    intermediate courses of a structured CTE course sequence."
  - **Approved program, levels 3–4**: "Students in the advanced or
    capstone courses of a CTE sequence — often including work-based
    learning or practicum experience."
- If a district-attendance-override toggle is present: explain it as "By
  default, this category uses your district-wide attendance rate. Turn
  this on if you want to model a different attendance rate specifically
  for CTE students."
- Subtext: "What percentage of your district's students fall into this
  CTE category?"

### Dyslexia
- Subtext: "What percentage of all enrolled students are receiving
  dyslexia services, regardless of whether they're also classified as
  special education?" *(Reminder for Claude Code: this category is
  enrollment-based, not attendance-based — the subtext should reflect
  that it's about enrolled students, not ADA.)*
- Pop-ups for PIC 37 (non-SpEd dyslexia services) and PIC 43 (dyslexia
  services delivered as part of an IEP), explaining the distinction in
  one sentence each.

### Compensatory Education
- Subtext: "What percentage of all enrolled students are classified as
  economically disadvantaged?" *(Also enrollment-based — same reminder as
  above.)*
- Pop-ups for the base weight, the pregnancy-related category, and the
  non-resident-parent residential-treatment carve-out, each in one plain
  sentence.

### Bilingual / English as a Second Language (ESL)
- Header: spell out both acronyms in full, e.g. "Bilingual / English as a
  Second Language (ESL)".
- Subtext per category: "What percentage of all enrolled students are in
  this bilingual/ESL program type?"
- Pop-ups distinguishing the base Emergent Bilingual category from the
  Dual Language (one-way/two-way) categories in plain language — e.g.,
  "Dual Language programs teach students in both English and another
  language, with the goal of fluency in both."

### Early Education
- **Fix the confusing label**: "K-3 pre-pre-K (Ed-Disadv. + EB)" should
  become something like **"K-3 Base Funding (before Pre-K set-aside)"**.
  The original label's "pre pre-K" wording meant "before the Pre-K
  carve-out happens" — a reference to calculation order, not an actual
  grade band — which is exactly the kind of internal-jargon label this
  whole redesign is meant to eliminate. Pop-up explanation: "This is the
  base K-3 funding pool for economically disadvantaged and emergent
  bilingual students, calculated before a portion is set aside
  specifically for full-day Pre-K funding (see the Pre-K input below)."
- Subtext per category: "What percentage of all enrolled K-3 students
  fall into this category?"

### Gifted and Talented
- Subtext: "What percentage of all enrolled students are identified as
  gifted and talented?"
- Pop-up: include that **the eligibility cutoff is 5% of district ADA**
  (corrected from 7% — see §0.5 above), and that total statewide G/T
  funding is capped at $100 million per year, so an individual district's
  allotment can be prorated down in a year where statewide demand exceeds
  that cap.
- For dollar-amount inputs: put the `$` symbol inside the input box, and
  note in the pop-up whether there's a typical/average value districts
  commonly use (flag for Claude Code: pull this from the spending/staffing
  analysis where available, otherwise state plainly that no statewide
  average is available for this specific field).

### R-PEP (Rural Pathways Excellence Partnership)
- Header: spell out in full, "Rural Pathways Excellence Partnership
  (R-PEP)"; use "R-PEP" in individual variable names to save space once
  the full name is established in the section header.
- Permanent explainer: "R-PEP provides additional funding to small and
  rural districts that partner with community colleges or technical
  schools on career and technology programs. It applies only to districts
  that meet specific size and rurality requirements — most large or
  suburban districts won't qualify."
- Subtext per category: "What percentage of all enrolled students fall
  into this R-PEP category?"
- Validation: sum of R-PEP sub-variables cannot exceed total enrollment
  (see §2.3).

### Dropout Recovery and Residential Placement
- Subtext: "What percentage of all enrolled students are served through a
  dropout recovery school or residential placement facility?"

### Fast Growth and Support Staff Retention
- Explainer box for Fast Growth: "This applies only to districts whose
  enrollment has grown fast enough, relative to other Texas districts, to
  qualify as one of the state's fastest-growing. Most districts will not
  qualify."
- Subtext for the Fast Growth percentage input: "This represents only the
  portion of your enrollment that's specifically eligible under the Fast
  Growth formula — not your district's overall growth rate. If your
  district doesn't qualify as a fast-growth district, this should be 0%."

### CCMR (College, Career, and Military Readiness) Graduation Outcomes
- Header: spell out in full.
- Validation: sum of the three graduate categories (economically
  disadvantaged, not economically disadvantaged, special education)
  cannot exceed total enrollment (see §2.3).

### TIA (Teacher Incentive Allotment)
- Header: spell out in full.
- Comprehensive explainer box: "The Teacher Incentive Allotment rewards
  individual teachers who earn a performance-based designation (Recognized,
  Exemplary, or Master) by generating additional funding tied to that
  specific teacher. Unlike most other allotments in this simulator, **TIA
  has no statewide funding cap** — every qualifying teacher generates
  funding, no matter how many teachers in Texas earn a designation that
  year. Enter the number of teachers at each designation level your
  district employs."
- Pop-ups per designation level explaining what distinguishes Recognized,
  Exemplary, and Master (e.g., based on classroom observation ratings and
  student growth data), with the current dollar range for each tier and
  the note that rates rise further starting with the 2026–27 school year
  under HB 2.
- Note for later build phase (flagged, not built now): once the
  expenditure/budget side is built, add a recommended total teacher count
  here, driven off the mandated-staffing-ratio logic already planned for
  the expenditure section.

### Facilities (Transportation, NIFA, School Safety)
- Transportation pop-up explaining mileage, with calibration guidance:
  "The state reimburses districts roughly $1.08 per mile for regular
  routes and $1.13 per mile for special education routes (verify current
  GAA-set rate before finalizing). For reference, a mid-size Texas
  district commonly drives several hundred thousand to a few million
  miles per year depending on geography — there's no single 'typical'
  mileage figure since it depends heavily on district size and how spread
  out the district is, not enrollment alone." *(Our spending/staffing
  analysis confirmed Transportation cost doesn't correlate cleanly with
  enrollment at any district size — CV stayed high, 0.25–1.67, across
  every size band. Don't present a single average mileage figure as if
  it's broadly representative; the honest framing is that this input
  needs the user's own knowledge of their district's geography.)*
- NIFA: spell out "New Instructional Facility Allotment (NIFA)" and
  explain in a pop-up: "A one-time allotment that helps cover the
  increased operating costs of opening a brand-new school building — not
  construction costs themselves, which are funded separately through
  bonds (outside this simulator's scope)."

### RDSPD, ASF, and IMTA
- Spell out all three in full: "Regional Day School Program for the Deaf
  (RDSPD)", "Available School Fund (ASF)", "Instructional Materials and
  Technology Allotment (IMTA)".
- Add pop-ups and input limits as described above (e.g., IMTA's
  Emergent-Bilingual add-on share should be capped sensibly against total
  enrollment).
- Subtext for the IMTA Emergent Bilingual share specifically: "What
  percentage of all enrolled students are both emergent bilingual and
  generating this specific add-on funding?"

### Property Value and Tax Rate
- This section's pop-ups need the most ground-up explanation in the whole
  app — assume genuinely zero prior knowledge.
  - Property value pop-up: "The total taxable value of all property in
    your district, as certified by the county appraisal district. This is
    the base your local property tax is calculated against."
  - M&O tax rate pop-up: "The portion of your district's property tax
    rate that funds day-to-day operations (as opposed to debt payments,
    which are funded separately). Typical Texas district M&O rates
    currently fall between roughly $0.66 and $0.92 per $100 of property
    value — check your own district's current adopted rate at [link to a
    maintained public lookup, e.g., Texas Comptroller's tax rate
    database] for an exact figure."
  - Tier One (compressed) rate pop-up: "A separate, lower rate the state
    uses specifically to calculate your Basic Allotment — this is not the
    same as your district's actual adopted tax rate, and is generally
    lower due to state-mandated 'tax compression.'"

---

## 5. Federal revenue (new section)

Build per the architecture already discussed:

```
Federal_Revenue = Title_I_Estimate + IDEA_Estimate + Perkins_Estimate + Impact_Aid_Flag

Title_I_Estimate   = Enrollment × EconDisadv_% × $_per_poverty_point
IDEA_Estimate      = FTE_sped_agg × $_per_SpEd_student   (base-payment + per-pupil, per TEA's actual
                      LEA-level IDEA-B distribution mechanism, not a flat national rate)
Perkins_Estimate   = Enrollment × EconDisadv_% × $_per_poverty_point_perkins   (population/poverty-driven,
                      NOT CTE-enrollment-driven — corrected from an earlier draft of this approach)
Impact_Aid_Flag    = a yes/no toggle ("Is your district adjacent to significant federal/military land?"),
                      adding a flat bonus only when checked
```

Apply the same explainer architecture as the state side: plain-language pop-up
on top, statute citation (ESSA Title I-A, IDEA Part B §611, Perkins V) on the
bottom. Label this section clearly as **estimated**, not a precise formula —
unlike TEC's self-contained weight × count formulas, Title I in particular
depends on national-level data (every other district's numbers) that a
standalone simulator can't reproduce exactly. A permanent explainer box at
the top of this section should say so directly, in plain language, so the
distinction from the state-funding sections is clear to a user without
requiring them to already know why.

---

## 6. Expenditure output section (new)

### 6.1 Core architecture

Auto-calculate spending for each PEIMS Function Code category, using the
real statewide size-band data already gathered (`spending_trend_summary.csv`,
`staffing_trend_summary.csv`). Each category gets an adjustable override —
auto-fill with the band-appropriate default, let the user override it
directly.

**Per your explicit instruction: force the averages onto the expenditure
defaults even when a district's enrollment is small, rather than leaving
the field blank or refusing to estimate.** This is a deliberate choice to
flag in the UI, since we know some categories are genuinely unreliable at
small enrollment (see below) — the number should still populate, but the
pop-up for a category with a high coefficient of variation at that size
should say so honestly rather than implying false precision.

### 6.2 Category-by-category build guidance, from the real data

- **Confident flat per-student default** (CV tightens to roughly 0.1–0.2
  once above ~1,000–2,000 enrollment): Instruction, Guidance/Counseling,
  Health Services.
- **Fixed-cost decay curve — use the regression, not a flat average**
  (General Admin, School Leadership, Facilities Maintenance showed a
  classic `Fixed/Enrollment + Marginal` shape in testing): compute
  `per_pupil ~ 1/enrollment` and use the resulting fixed + marginal
  estimate rather than a single band average, since these categories
  change meaningfully and continuously with size rather than settling at
  a stable number.
- **Driven by something other than enrollment — do not default off a
  per-pupil ratio at all**:
  - **Security**: per-campus, not per-pupil (confirmed both by the
    statutory mandate — one officer per campus — and empirically, CV
    stayed high at every enrollment band). Default should be `Cost_per_
    officer × Campus_Count`, with the real documented cost range
    ($60,000–$100,000+/year per officer) shown in the pop-up, directly
    alongside the much smaller current School Safety *revenue* line so the
    funding gap is visible to the user. (Real example worth citing in the
    pop-up: Austin ISD received about $5.4 million in state transportation
    funding but spent nearly $42 million — an almost 8x gap, and a
    comparable gap exists for the safety-officer mandate specifically.)
  - **Transportation**: route-mileage-driven, not enrollment-driven
    (confirmed, CV 0.25–1.67 at every band tested). Don't present a
    per-pupil default; ask for mileage directly (with the calibration
    guidance from §4 above), or default to a clearly-labeled "unknown,
    please adjust" state rather than a misleading enrollment-based number.
- **Rarely-offered / highly discretionary — no confident default at any
  size** (CV stayed above 0.6–1.0 even in the largest bands): Social Work
  Services. Default to $0 with the field open for direct entry.
- **Salary should be size-aware for Instruction specifically.** Average
  teacher salary climbs steadily with district size ($51,500 in the
  smallest band to $58,882 in the largest, in the real data) — this isn't
  noise, and a single statewide average salary assumption would
  systematically misstate both the smallest and largest districts. Scale
  the default salary assumption by the user's entered enrollment rather
  than using one fixed number.

### 6.3 Staffing-specific printouts (explicit request)

- **Students-per-teacher**: a clearly visible printout, computed as
  `Enrollment ÷ Teacher_Count` (where `Teacher_Count` is whichever of the
  mandated/actual toggle values is active).
- **For every staffing-related Function category, show FTE count and
  average salary** alongside the dollar total — not just the total cost.
  Use the role → Function mapping already built (`analyze_staffing_
  trends.R`) to determine which real-world job titles roll into each
  Function's staffing printout (e.g., Function 23's printout should read
  as "Principals/Assistant Principals," not just "School Leadership
  staff").

### 6.4 Pop-up content for expenditure line items

Each expenditure category's pop-up should end with a short, honest
methodology note, using the actual band the user's entered enrollment
falls into — e.g.: *"For districts your size (5,000–10,000 students), we
found this category typically runs $403–$1,264 per student across Texas
districts (coefficient of variation: 0.22), so we've defaulted to the
middle of that range. You can adjust it directly if you know your
district's actual figure."* This should pull live from the band tables,
not be hardcoded per category, since the user's enrollment input
determines which band applies.

---

## 7. Visual Breakdown (renamed from "Graphs")

Replace the current "Funding by district size" tab location with a
**"Visual Breakdown"** tab, visually distinct in color from the green
revenue/expenditure sections (pick a third, non-green, non-navy accent
color to keep the three content types — input, output, visualization —
distinguishable at a glance).

Three views, as separate tabs within this section:

1. **Overall cost/revenue crossover**: total cost vs. total revenue plotted
   across a range of student counts, using the district's current input
   values as the basis for the curve (not just the single point the user
   has entered) — this is the view that shows where/whether a deficit
   emerges as size changes.
2. **Marginal cost/revenue breakdown**: same x-axis (number of students),
   but showing how *each individual* expense and revenue category changes
   with size, not just the totals — this is where the fixed-cost-decay
   categories (General Admin, Facilities) and the roughly-flat categories
   (Instruction, Guidance) should visually look different from each other,
   using the formulas established in §6.2.
3. **Stacked bar comparison**: two stacked bars side by side — one for
   total revenue (segmented by source: Tier One, Tier Two, ASF, IMTA,
   Other Programs, Federal), one for total cost (segmented by Function
   Code category) — at the single student count currently entered in the
   District Builder.

---

## 8. Open items still needing a decision or further research

- Exact current Transportation per-mile rates ($1.08 regular / $1.13 SpEd
  were used throughout this project, but verify against the current GAA
  before finalizing — rates are appropriation-set and can change between
  biennia).
- Whether to build a live or periodically-updated link/lookup for current
  district M&O tax rates (mentioned as a "nice to have" for the Property
  Value section's calibration guidance) versus a static typical-range
  statement.
- The still-unmapped staff roles from `analyze_staffing_trends.R`'s
  `unmapped` output (Coordinator/Manager/Supervisor, Specialist/
  Consultant, Department Head, and a few others) — worth a final pass once
  their total FTE share is known.
