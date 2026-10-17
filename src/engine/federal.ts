// Federal revenue estimator — V2_BUILD_SPEC.md §5.
// Unlike TEC's self-contained weight x count formulas, every rate here resets with annual
// congressional appropriations and (for Title I/Perkins especially) depends on every other
// district's numbers nationally — a standalone simulator cannot reproduce the real formula
// exactly. These are rough, openly-adjustable planning figures, not verified federal tables;
// treat every default as a starting point to replace with your district's actual award letter.

export interface FederalRevenueInputs {
  enrollment: number
  /** % of enrollment economically disadvantaged — reused from the Compensatory Ed input rather than re-asked. */
  econDisadvPct: number
  /** FTE_sped_agg from the state engine — reused rather than re-asked. */
  fteSpedAgg: number
  impactAidEligible: boolean
}

export interface FederalRevenueRates {
  titleIPerPovertyPoint: number
  ideaPerSpedStudent: number
  perkinsPerPovertyPoint: number
  impactAidFlatBonus: number
}

export const DEFAULT_FEDERAL_RATES: FederalRevenueRates = {
  titleIPerPovertyPoint: 800, // rough, commonly-cited ballpark after ESSA's four blended formulas (Basic/Concentration/Targeted/EFIG) — not a published single rate
  ideaPerSpedStudent: 1800, // federal IDEA funding commonly covers ~13-16% of a child's excess special-ed cost, which nationally works out to roughly this per-student order of magnitude
  perkinsPerPovertyPoint: 30, // Perkins V state CTE allocations are small relative to enrollment; this is a rough per-poverty-point planning figure
  impactAidFlatBonus: 500_000, // highly district-specific in reality — placeholder magnitude only
}

export interface FederalRevenueResult {
  titleI: number
  idea: number
  perkins: number
  impactAid: number
  total: number
}

export function calculateFederalRevenue(inputs: FederalRevenueInputs, rates: FederalRevenueRates): FederalRevenueResult {
  const econDisadvCount = inputs.enrollment * (Math.max(inputs.econDisadvPct, 0) / 100)
  const titleI = econDisadvCount * rates.titleIPerPovertyPoint
  const idea = inputs.fteSpedAgg * rates.ideaPerSpedStudent
  const perkins = econDisadvCount * rates.perkinsPerPovertyPoint
  const impactAid = inputs.impactAidEligible ? rates.impactAidFlatBonus : 0
  return { titleI, idea, perkins, impactAid, total: titleI + idea + perkins + impactAid }
}
