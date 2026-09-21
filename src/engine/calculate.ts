import { rate, type RateOverrides } from './constants'
import type { EngineInputs } from './inputs'
import { li, type LineItem } from './lineItems'
import { calculateSped } from './spedModel'

export interface FundingResult {
  lineItems: LineItem[]
  /** Intermediate aggregation values, exposed for transparency (BUILD_SPEC §9.3: "the whole point is seeing where the money comes from"). */
  intermediates: {
    ADA_ref: number
    ADA_reg: number
    FTE_sped_agg: number
    FTE_cte_agg: number
    WADA: number
    BA_adj: number
    compressionFactor: number
    DTR1: number
    DTR2: number
    PV_curr: number
    MO_collect: number
  }
  subtotals: {
    tierOne: number
    tierTwo: number
    asf: number
    imta: number
    otherPrograms: number
  }
  totalMO: number
  warnings: string[]
}

export function calculateFunding(inputs: EngineInputs, overrides?: RateOverrides): FundingResult {
  const warnings: string[] = []
  const BA_adj = rate('BA_adj', overrides)
  const MCR = rate('MCR', overrides)

  // ---- Special Education + CTE (carve-outs, subtracted from ADA_ref) ----
  const sped = calculateSped(inputs, BA_adj, overrides)
  const FTE_cte_agg = inputs.FTE_cte1 + inputs.FTE_cte2 + inputs.FTE_cte3
  const cteLineItems: LineItem[] = [
    li('w_cte1', 'CTE weight — not in approved program', 'Tier One', 'CTE', 'Linear - Per Unit', inputs.FTE_cte1 * rate('w_cte1', overrides) * BA_adj, true),
    li('w_cte2', 'CTE weight — approved program, levels 1-2', 'Tier One', 'CTE', 'Linear - Per Unit', inputs.FTE_cte2 * rate('w_cte2', overrides) * BA_adj, true),
    li('w_cte3', 'CTE weight — approved program, levels 3-4', 'Tier One', 'CTE', 'Linear - Per Unit', inputs.FTE_cte3 * rate('w_cte3', overrides) * BA_adj, true),
  ]

  const carveOutTotal = sped.fteSpedAgg + FTE_cte_agg
  if (carveOutTotal > inputs.ADA_ref && inputs.ADA_ref > 0) {
    warnings.push(
      `SpEd + CTE FTE (${carveOutTotal.toFixed(1)}) exceeds ADA_ref (${inputs.ADA_ref.toFixed(1)}) — carve-outs cannot exceed 100% of a district's population.`,
    )
  }
  const ADA_reg = Math.max(inputs.ADA_ref - carveOutTotal, 0)

  // ---- Compression check on Regular Program & Small/Mid-Size lines only (BA_adj note) ----
  const compressionFactor = inputs.TR_t1 > 0 && MCR > 0 ? Math.min(1, inputs.TR_t1 / MCR) : 1
  if (compressionFactor < 1) {
    warnings.push(
      `Tier One tax rate (${inputs.TR_t1.toFixed(4)}) is below the Maximum Compressed Rate (${MCR}) — Regular Program allotment scaled down by ${(compressionFactor * 100).toFixed(1)}%.`,
    )
  }

  const regularProgramAmount = ADA_reg * rate('w_reg', overrides) * BA_adj * compressionFactor
  const regularProgram = li('w_reg', 'Regular Program Allotment', 'Tier One', 'Regular Program', 'Linear - Per Unit', regularProgramAmount, true)

  const smallThreshold = rate('smallmid_small_threshold', overrides)
  const smallFactor = rate('smallmid_small_factor', overrides)
  const midThreshold = rate('smallmid_mid_threshold', overrides)
  const midFactor = rate('smallmid_mid_factor', overrides)
  const smallRate = inputs.ADA_ref < smallThreshold ? (smallThreshold - inputs.ADA_ref) * smallFactor : 0
  const midRate = inputs.ADA_ref < midThreshold ? (midThreshold - inputs.ADA_ref) * midFactor : 0
  const smallMidRate = Math.max(smallRate, midRate)
  const smallMidAmount = smallMidRate * BA_adj * inputs.ADA_ref * compressionFactor
  const smallMid = li(
    'ADJ_smallmid',
    'Small and Mid-Sized District Adjustment',
    'Tier One',
    'Regular Program',
    'Sliding Scale',
    smallMidAmount,
    true,
    'The district-size vs. marginal-revenue lever — shrinks to $0 as ADA rises past 5,000.',
  )

  // ---- Dyslexia (enrollment-based overlay) ----
  const dyslexia: LineItem[] = [
    li('w_dys_pic37', 'Dyslexia weight — Non-Special-Ed (PIC 37)', 'Tier One', 'Dyslexia', 'Linear - Per Unit', inputs.ENR_dys37 * rate('w_dys_pic37', overrides) * BA_adj, true),
    li('w_dys_pic43', 'Dyslexia weight — Special-Ed (PIC 43)', 'Tier One', 'Dyslexia', 'Linear - Per Unit', inputs.ENR_dys43 * rate('w_dys_pic43', overrides) * BA_adj, true),
  ]

  // ---- Compensatory Ed (enrollment-based overlay, sliding-scale SCE weight) ----
  const wSceMin = rate('w_sce_min', overrides)
  const wSceMax = rate('w_sce_max', overrides)
  const w_sce = wSceMin + (Math.min(Math.max(inputs.sce_concentrationPct, 0), 100) / 100) * (wSceMax - wSceMin)
  const compEd: LineItem[] = [
    li('w_sce', 'Comp. Ed weight (Ed-Disadvantaged concentration)', 'Tier One', 'Compensatory Ed', 'Sliding Scale', inputs.ENR_sce * w_sce * BA_adj, true, `Sliding weight of ${w_sce.toFixed(4)} at ${inputs.sce_concentrationPct}% concentration.`),
    li('w_pregnant', 'Pregnancy-Related student weight', 'Tier One', 'Compensatory Ed', 'Linear - Per Unit', inputs.ENR_pregnant * rate('w_pregnant', overrides) * BA_adj, true),
    li('w_resid_nonedisadv', 'Non-ed-disadvantaged residential treatment weight', 'Tier One', 'Compensatory Ed', 'Linear - Per Unit', inputs.ENR_resid_nonedisadv * rate('w_resid_nonedisadv', overrides) * BA_adj, true),
  ]

  // ---- Bilingual/ESL (ADA-based overlay) ----
  const bilingual: LineItem[] = [
    li('w_eb_base', 'Emergent Bilingual weight (base)', 'Tier One', 'Bilingual/ESL', 'Linear - Per Unit', inputs.ADA_eb * rate('w_eb_base', overrides) * BA_adj, true),
    li('w_eb_dl', 'Emergent Bilingual Dual Language weight', 'Tier One', 'Bilingual/ESL', 'Linear - Per Unit', inputs.ADA_eb_dl * rate('w_eb_dl', overrides) * BA_adj, true),
    li('w_noneb_dl2way', 'Non-Emergent Bilingual Dual Language Two-Way weight', 'Tier One', 'Bilingual/ESL', 'Linear - Per Unit', inputs.ADA_noneb_dl * rate('w_noneb_dl2way', overrides) * BA_adj, true),
  ]

  // ---- Early Education (ADA-based overlay + Pre-K carve-out) ----
  const earlyEd: LineItem[] = [
    li('w_k3_predk', 'K-3 Ed-Disadv + Emergent Bilingual weight (pre pre-K)', 'Tier One', 'Early Education', 'Linear - Per Unit', inputs.ADA_k3predk * rate('w_k3_predk', overrides) * BA_adj, true),
    li('ALLOT_prek', 'Full-day Pre-K allotment (carve-out)', 'Tier One', 'Early Education', 'One-Time / Facility-Triggered', inputs.ADA_prek * BA_adj, true, 'Funded first, carved OUT of the K-3 pool above (zero-sum vs. w_k3_predk for the same students) — treated additively here for transparency; avoid double-entering the same students in both fields.'),
    li('w_k3_all', 'K-3 All Students weight', 'Tier One', 'Early Education', 'Linear - Per Unit', inputs.ADA_k3all * rate('w_k3_all', overrides) * BA_adj, true),
  ]

  // ---- Gifted & Talented (ADA-based overlay, capped at 5% of ADA_ref) ----
  const capGtPct = rate('cap_gt_pct', overrides)
  const gtCapAda = capGtPct * inputs.ADA_ref
  const gtEligibleAda = Math.min(inputs.ADA_gt, gtCapAda)
  if (inputs.ADA_gt > gtCapAda && inputs.ADA_ref > 0) {
    warnings.push(`G/T identified ADA (${inputs.ADA_gt.toFixed(1)}) exceeds the ${(capGtPct * 100).toFixed(0)}% of ADA cap (${gtCapAda.toFixed(1)}) — excess is not funded.`)
  }
  const giftedTalented: LineItem[] = [
    li('w_gt', 'G/T identified ADA weight', 'Tier One', 'Gifted & Talented', 'Linear - Per Unit', gtEligibleAda * rate('w_gt', overrides) * BA_adj, true),
    li('ADJ_gt_setaside', 'G/T Performance Standards & MATHCOUNTS Set-Aside', 'Tier One', 'Gifted & Talented', 'Statewide Constant (Non-Scaling)', -Math.abs(inputs.ADJ_gt_setaside_dollars), false),
  ]

  // ---- CCMR Outcomes (flat $ per graduate, not weighted) ----
  const ccmr: LineItem[] = [
    li('rate_ccmr_ed', 'CCMR bonus — Ed-Disadvantaged Graduates', 'Tier One', 'CCMR Outcomes', 'Linear - Flat $ Per Event', inputs.Count_grad_ed * rate('rate_ccmr_ed', overrides), false),
    li('rate_ccmr_noted', 'CCMR bonus — Not Ed-Disadvantaged Graduates', 'Tier One', 'CCMR Outcomes', 'Linear - Flat $ Per Event', inputs.Count_grad_noted * rate('rate_ccmr_noted', overrides), false),
    li('rate_ccmr_sped', 'CCMR bonus — Special Education Graduates', 'Tier One', 'CCMR Outcomes', 'Linear - Flat $ Per Event', inputs.Count_grad_sped * rate('rate_ccmr_sped', overrides), false),
  ]

  // ---- Fast Growth ----
  const fastGrowth = li('w_fastgrowth', 'Fast Growth eligible ADA weight', 'Tier One', 'Fast Growth Allotment', 'Linear - Per Unit', inputs.ADA_fastgrowth * rate('w_fastgrowth', overrides) * BA_adj, true, 'Programmed at the base/only confirmed tier — higher growth-percentile tiers carry unpublished higher weights.')

  // ---- Teacher Incentive Allotment ----
  const tia: LineItem[] = [
    li('rate_tia_master', 'TIA — Master Teacher', 'Tier One', 'Teacher Incentive Allotment (TIA)', 'Linear - Flat $ Per Event', inputs.Count_tia_master * rate('rate_tia_master', overrides), true),
    li('rate_tia_exemplary', 'TIA — Exemplary Teacher', 'Tier One', 'Teacher Incentive Allotment (TIA)', 'Linear - Flat $ Per Event', inputs.Count_tia_exemplary * rate('rate_tia_exemplary', overrides), true),
    li('rate_tia_recognized', 'TIA — Recognized Teacher', 'Tier One', 'Teacher Incentive Allotment (TIA)', 'Linear - Flat $ Per Event', inputs.Count_tia_recognized * rate('rate_tia_recognized', overrides), true),
  ]

  const mentor = li('rate_mentor', 'Mentor teacher / mentee pairs', 'Tier One', 'Mentor Program Allotment', 'Linear - Flat $ Per Event', inputs.Count_mentor * inputs.rate_mentor, true, 'No statewide per-pair rate is published — both count and rate are open user inputs.')

  // ---- School Safety (KEY step-cost example: per-campus) ----
  const schoolSafety: LineItem[] = [
    li('rate_ssa_ada', 'School Safety Allotment — per ADA', 'Tier One', 'School Safety', 'Linear - Per Unit', inputs.ADA_ref * rate('rate_ssa_ada', overrides), false),
    li('rate_ssa_campus', 'School Safety Allotment — per campus', 'Tier One', 'School Safety', 'Per-Campus (Step)', inputs.Count_campuses * rate('rate_ssa_campus', overrides), false, 'Lumpy relative to ADA — jumps with campus count, not enrollment.'),
  ]

  // ---- Transportation ----
  const transportation: LineItem[] = [
    li('rate_trans_reg', 'Regular transportation', 'Tier One', 'Transportation', 'Linear - Per Unit', inputs.Miles_reg * rate('rate_trans_reg', overrides), false),
    li('rate_trans_sped', 'Special Education transportation', 'Tier One', 'Transportation', 'Linear - Per Unit', inputs.Miles_sped * rate('rate_trans_sped', overrides), false),
  ]

  const nifa = li('ALLOT_nifa', 'New Instructional Facility Allotment (NIFA)', 'Tier One', 'NIFA', 'One-Time / Facility-Triggered', inputs.ALLOT_nifa_dollars, false, 'Facility-specific, event-triggered — no flat statewide rate; enter district-computed amount directly.')

  // ---- Dropout Recovery ----
  const dropoutRecovery: LineItem[] = [
    li('rate_dropout', 'Dropout Recovery School ADA rate', 'Tier One', 'Dropout Recovery', 'Linear - Per Unit', inputs.ADA_dropout * rate('rate_dropout', overrides), false),
    li('rate_resplacement', 'Residential Placement Facility ADA rate', 'Tier One', 'Dropout Recovery', 'Linear - Per Unit', inputs.ADA_resplacement * rate('rate_resplacement', overrides), false),
  ]

  // ---- R-PEP ----
  const rpep: LineItem[] = [
    li('w_rpep_ed', 'R-PEP Ed-Disadvantaged ADA weight', 'Tier One', 'R-PEP', 'Linear - Per Unit', inputs.ADA_rpep_ed * rate('w_rpep_ed', overrides) * BA_adj, true),
    li('w_rpep_noted', 'R-PEP Non-Ed-Disadvantaged ADA weight', 'Tier One', 'R-PEP', 'Linear - Per Unit', inputs.ADA_rpep_noted * rate('w_rpep_noted', overrides) * BA_adj, true),
    li('rate_rpep_grad_ed', 'R-PEP grad bonus (Ed-Disadvantaged)', 'Tier One', 'R-PEP', 'Linear - Flat $ Per Event', inputs.Count_rpep_grad_ed * rate('rate_rpep_grad_ed', overrides), false),
    li('rate_rpep_grad_noted', 'R-PEP grad bonus (Not Ed-Disadvantaged)', 'Tier One', 'R-PEP', 'Linear - Flat $ Per Event', inputs.Count_rpep_grad_noted * rate('rate_rpep_grad_noted', overrides), false),
    li('rate_rpep_grad_sped', 'R-PEP grad bonus (Special Education)', 'Tier One', 'R-PEP', 'Linear - Flat $ Per Event', inputs.Count_rpep_grad_sped * rate('rate_rpep_grad_sped', overrides), false),
  ]

  const fiie = li('rate_fiie', 'Full Individual and Initial Evaluation (FIIE)', 'Tier One', 'FIIE', 'Linear - Flat $ Per Event', inputs.Count_fiie * rate('rate_fiie', overrides), false)

  // ---- Teacher Retention (KEY step-threshold example: rate bucket gated by district enrollment size) ----
  const threshold = rate('threshold_district_size', overrides)
  const isLargeDistrict = inputs.ENR_peims >= threshold
  const tra34Rate = isLargeDistrict ? rate('rate_tra_large_34', overrides) : rate('rate_tra_small_34', overrides)
  const tra5plusRate = isLargeDistrict ? rate('rate_tra_large_5plus', overrides) : rate('rate_tra_small_5plus', overrides)
  const teacherRetention: LineItem[] = [
    li(
      'rate_tra_34',
      `Teacher Retention — 3-4 yrs exp. (${isLargeDistrict ? 'large' : 'small'} district rate)`,
      'Tier One',
      'Teacher Retention',
      'Step-Threshold',
      inputs.Count_tra_3to4yrs * tra34Rate,
      false,
      `District enrollment ${inputs.ENR_peims.toLocaleString()} vs. ${threshold.toLocaleString()} threshold — crossing it changes the per-teacher rate discretely.`,
    ),
    li(
      'rate_tra_5plus',
      `Teacher Retention — 5+ yrs exp. (${isLargeDistrict ? 'large' : 'small'} district rate)`,
      'Tier One',
      'Teacher Retention',
      'Step-Threshold',
      inputs.Count_tra_5plusYrs * tra5plusRate,
      false,
    ),
  ]

  // ---- Support Staff Retention ----
  const adaAdjAvgBase = (regularProgramAmount + smallMidAmount) / BA_adj
  const adaAdjAvg = Math.max(adaAdjAvgBase - inputs.ADA_virtual_nonres, 0)
  const supportStaffRetention = li('rate_ssra', 'Support Staff Retention rate', 'Tier One', 'Support Staff Retention', 'Linear - Per Unit', adaAdjAvg * rate('rate_ssra', overrides), false)

  // ---- Basic Costs ----
  const basicCosts = li('rate_basiccosts', 'Basic Costs rate', 'Tier One', 'Basic Costs', 'Linear - Per Unit', inputs.ENR_peims * rate('rate_basiccosts', overrides), false, 'Enrollment-based — does not shrink if attendance drops while enrollment holds steady.')

  const tierOneLineItems: LineItem[] = [
    regularProgram,
    smallMid,
    ...sped.lineItems,
    ...cteLineItems,
    ...dyslexia,
    ...compEd,
    ...bilingual,
    ...earlyEd,
    ...giftedTalented,
    ...ccmr,
    fastGrowth,
    ...tia,
    mentor,
    ...schoolSafety,
    ...transportation,
    nifa,
    ...dropoutRecovery,
    ...rpep,
    fiie,
    ...teacherRetention,
    supportStaffRetention,
    basicCosts,
  ]
  const tierOneTotal = tierOneLineItems.reduce((sum, item) => sum + item.amount, 0)

  // ---- Tier Two Guaranteed Yield ----
  const WADA = tierOneLineItems.filter((item) => item.feedsWada).reduce((sum, item) => sum + item.amount, 0) / BA_adj

  const PV_curr = inputs.PV_curr_override ?? inputs.PV_prior * rate('LPE_GROWTH_FACTOR', overrides)
  const MO_collect_raw = inputs.MO_collect_override ?? (PV_curr * inputs.TR_adopted) / 100
  const MO_collect = MO_collect_raw - inputs.ADJ_ifalp - inputs.ADJ_tif + inputs.ADJ_taxrefund

  const DTR1_cap = rate('DTR1_cap', overrides)
  const DTR1 = Math.min(inputs.TR_t1, DTR1_cap)
  const DTR2 = Math.max(inputs.TR_adopted - inputs.TR_t1, 0)

  const tier2L1 = rate('yield_L1', overrides) * WADA * (DTR1 * 100)
  const tier2L2 = rate('yield_L2', overrides) * WADA * (DTR2 * 100)
  const localShare = (PV_curr / 100) * (DTR1 + DTR2)
  const tierTwoLineItems: LineItem[] = [
    li('yield_L1', 'Level 1 (Golden Pennies) Guaranteed Yield', 'Tier Two', 'Guaranteed Yield', 'Statewide Constant (Non-Scaling)', tier2L1, false),
    li('yield_L2', 'Level 2 (Copper Pennies) Guaranteed Yield', 'Tier Two', 'Guaranteed Yield', 'Statewide Constant (Non-Scaling)', tier2L2, false),
    li('localshare_t2', 'Local Share (subtracted — raised by local tax pennies)', 'Tier Two', 'Guaranteed Yield', 'Derived - Formula Output', -localShare, false),
  ]
  const tierTwoTotal = tierTwoLineItems.reduce((sum, item) => sum + item.amount, 0)

  // ---- ASF ----
  const asfLineItems: LineItem[] = [li('rate_asf', 'ASF per-capita distribution', 'ASF', 'Available School Fund', 'Linear - Per Unit', inputs.ADA_asf * rate('rate_asf', overrides), false, 'Uses prior-year ADA, not ADA_ref.')]
  const asfTotal = asfLineItems.reduce((sum, item) => sum + item.amount, 0)

  // ---- IMTA ----
  const imtaLineItems: LineItem[] = [
    li('rate_imta', 'IMTA per-student rate', 'IMTA', 'IMTA', 'Linear - Per Unit', inputs.ENR_peims * rate('rate_imta', overrides), false),
    li('rate_imta_eb', 'IMTA Emergent Bilingual add-on', 'IMTA', 'IMTA', 'Linear - Per Unit', inputs.ENR_eb_imta * rate('rate_imta_eb', overrides), false),
  ]
  const imtaTotal = imtaLineItems.reduce((sum, item) => sum + item.amount, 0)

  // ---- Other Programs (RDSPD + district-specific/rate-not-published pass-throughs) ----
  const otherProgramsLineItems: LineItem[] = [
    li('rate_rdspd', 'Regional Day School for the Deaf (RDSPD)', 'Other Programs', 'Other Programs', 'Statutory Cap/Ceiling', inputs.Count_rdspd * rate('rate_rdspd', overrides), false),
    ...Object.entries(inputs.otherProgramsDollars)
      .filter(([, v]) => v)
      .map(([symbol, amount]) => li(symbol, symbol, 'Other Programs', 'Other Programs', 'Derived - Formula Output', amount ?? 0, false, 'District-specific or rate-not-published — entered directly.')),
  ]
  const otherProgramsTotal = otherProgramsLineItems.reduce((sum, item) => sum + item.amount, 0)

  const totalMO = tierOneTotal + tierTwoTotal + asfTotal + imtaTotal + otherProgramsTotal

  return {
    lineItems: [...tierOneLineItems, ...tierTwoLineItems, ...asfLineItems, ...imtaLineItems, ...otherProgramsLineItems],
    intermediates: {
      ADA_ref: inputs.ADA_ref,
      ADA_reg,
      FTE_sped_agg: sped.fteSpedAgg,
      FTE_cte_agg,
      WADA,
      BA_adj,
      compressionFactor,
      DTR1,
      DTR2,
      PV_curr,
      MO_collect,
    },
    subtotals: {
      tierOne: tierOneTotal,
      tierTwo: tierTwoTotal,
      asf: asfTotal,
      imta: imtaTotal,
      otherPrograms: otherProgramsTotal,
    },
    totalMO,
    warnings,
  }
}
