// The synthetic-district convenience layer described in BUILD_SPEC.md §3 and §5.
// A person builds a district from enrollment + attendance-rate + category %'s;
// this module turns that into the raw EngineInputs the pure formula engine expects.
//
// Two population-input behaviors, per §5:
//  - Carve-out categories (SpEd, CTE): % of enrollment, subtract from ADA_ref via FTE.
//  - Overlay categories (Bilingual, G/T, R-PEP, Comp Ed, Dropout, Retention, ...):
//    % of enrollment applied independently against the shared base — can overlap.
// Every ADA-driven category gets its own attendance-rate override (defaults to the
// district-wide rate); enrollment-based categories (Dyslexia, Comp Ed, Basic Costs,
// IMTA) never multiply by an attendance rate at all.

import {
  emptyEngineInputs,
  SPED_NEW_MODEL_ILLUSTRATIVE_WEIGHTS,
  type EngineInputs,
  type SpedModelMode,
  type SpedNewModelTierPopulation,
  type SpedNewModelTierWeights,
} from './inputs'

export interface SyntheticDistrictProfile {
  enrollment: number
  districtAttendanceRatePct: number

  specialEd: {
    attendanceRatePct: number | null
    model: SpedModelMode
    legacyPct: {
      homebound: number
      hospital: number
      speech: number
      resource: number
      selfContained: number
      offCampus: number
      vocAdj: number
      stateSchools: number
      residential: number
      nonpublic: number
      mainstream: number
    }
    eciSetAsideDollars: number
    gtSetAsideDollars: number
    newModelPct: SpedNewModelTierPopulation
    newModelWeights: SpedNewModelTierWeights
  }

  cte: {
    attendanceRatePct: number | null
    tier1Pct: number
    tier2Pct: number
    tier3Pct: number
  }

  dyslexia: { pic37Pct: number; pic43Pct: number }

  compEd: {
    concentrationPct: number
    pregnantPct: number
    residTreatmentPct: number
  }

  bilingual: {
    attendanceRatePct: number | null
    ebBasePct: number
    ebDlPct: number
    nonEbDlPct: number
  }

  earlyEd: {
    attendanceRatePct: number | null
    k3PrePrekPct: number
    prekPct: number
    k3AllPct: number
  }

  giftedTalented: { attendanceRatePct: number | null; identifiedPct: number }

  rpep: {
    attendanceRatePct: number | null
    edDisadvPct: number
    nonEdDisadvPct: number
    gradEd: number
    gradNoted: number
    gradSped: number
  }

  dropoutRecovery: { attendanceRatePct: number | null; pct: number }
  residentialPlacement: { attendanceRatePct: number | null; pct: number }
  fastGrowth: { attendanceRatePct: number | null; eligiblePct: number }
  supportStaffRetention: { virtualNonResPct: number }

  graduates: { edDisadv: number; notEdDisadv: number; sped: number }

  staffing: {
    tiaMaster: number
    tiaExemplary: number
    tiaRecognized: number
    mentorPairs: number
    mentorRate: number
    fiieEvaluations: number
    tra3to4yrs: number
    tra5plusYrs: number
  }

  facilities: {
    campusCount: number
    milesRegular: number
    milesSped: number
    nifaDollars: number
  }

  rdspd: { studentCount: number }
  asf: { priorYearAda: number }

  propertyTax: {
    priorYearPropertyValue: number
    currentYearPropertyValueOverride: number | null
    adoptedTaxRate: number
    tier1TaxRate: number
    moCollectOverride: number | null
    ifaLeasePurchaseAdj: number
    tifPaymentAdj: number
    taxRefundAdj: number
  }

  imta: { emergentBilingualPct: number }

  otherProgramsDollars: EngineInputs['otherProgramsDollars']
}

export function defaultSyntheticProfile(): SyntheticDistrictProfile {
  return {
    enrollment: 5000,
    districtAttendanceRatePct: 95,
    specialEd: {
      attendanceRatePct: null,
      model: 'legacy',
      legacyPct: {
        homebound: 0.1,
        hospital: 0.05,
        speech: 1.5,
        resource: 5,
        selfContained: 2,
        offCampus: 0.3,
        vocAdj: 0.2,
        stateSchools: 0,
        residential: 0.1,
        nonpublic: 0.1,
        mainstream: 3,
      },
      eciSetAsideDollars: 0,
      gtSetAsideDollars: 0,
      newModelPct: { tier1: 3, tier2: 4, tier3: 3, tier4: 1.5, tier5: 0.7, tier6: 0.2, tier7Residential: 0.05 },
      newModelWeights: { ...SPED_NEW_MODEL_ILLUSTRATIVE_WEIGHTS },
    },
    cte: { attendanceRatePct: null, tier1Pct: 4, tier2Pct: 8, tier3Pct: 5 },
    dyslexia: { pic37Pct: 3, pic43Pct: 0.5 },
    compEd: { concentrationPct: 60, pregnantPct: 0.1, residTreatmentPct: 0 },
    bilingual: { attendanceRatePct: null, ebBasePct: 12, ebDlPct: 2, nonEbDlPct: 1 },
    earlyEd: { attendanceRatePct: null, k3PrePrekPct: 8, prekPct: 3, k3AllPct: 25 },
    giftedTalented: { attendanceRatePct: null, identifiedPct: 5 },
    rpep: { attendanceRatePct: null, edDisadvPct: 0, nonEdDisadvPct: 0, gradEd: 0, gradNoted: 0, gradSped: 0 },
    dropoutRecovery: { attendanceRatePct: null, pct: 0 },
    residentialPlacement: { attendanceRatePct: null, pct: 0 },
    fastGrowth: { attendanceRatePct: null, eligiblePct: 0 },
    supportStaffRetention: { virtualNonResPct: 0 },
    graduates: { edDisadv: 200, notEdDisadv: 150, sped: 40 },
    staffing: {
      tiaMaster: 5,
      tiaExemplary: 15,
      tiaRecognized: 30,
      mentorPairs: 0,
      mentorRate: 0,
      fiieEvaluations: 50,
      tra3to4yrs: 20,
      tra5plusYrs: 60,
    },
    facilities: { campusCount: 6, milesRegular: 150000, milesSped: 10000, nifaDollars: 0 },
    rdspd: { studentCount: 0 },
    asf: { priorYearAda: 4750 },
    propertyTax: {
      priorYearPropertyValue: 1_500_000_000,
      currentYearPropertyValueOverride: null,
      adoptedTaxRate: 0.9746,
      tier1TaxRate: 0.6119,
      moCollectOverride: null,
      ifaLeasePurchaseAdj: 0,
      tifPaymentAdj: 0,
      taxRefundAdj: 0,
    },
    imta: { emergentBilingualPct: 12 },
    otherProgramsDollars: {},
  }
}

function pct(share: number, base: number): number {
  return (Math.max(share, 0) / 100) * base
}

/** ADA-based category count: population share of enrollment, scaled by that category's own attendance rate. */
function adaCategoryCount(populationPct: number, categoryAttendanceRatePct: number | null, districtAttendanceRatePct: number, enrollment: number): number {
  const attendanceRate = categoryAttendanceRatePct ?? districtAttendanceRatePct
  return pct(populationPct, enrollment) * (attendanceRate / 100)
}

export function buildEngineInputsFromSynthetic(p: SyntheticDistrictProfile): EngineInputs {
  const inputs = emptyEngineInputs()
  const { enrollment, districtAttendanceRatePct: districtRate } = p

  inputs.ENR_peims = enrollment
  inputs.ADA_ref = enrollment * (districtRate / 100)

  // ---- Special Education (carve-out, FTE-based; nonpublic/mainstream are ADA-based additive-only) ----
  const spedRate = p.specialEd.attendanceRatePct
  const sp = p.specialEd.legacyPct
  inputs.spedModel = p.specialEd.model
  inputs.spedLegacyFte = {
    homebound: adaCategoryCount(sp.homebound, spedRate, districtRate, enrollment),
    hospital: adaCategoryCount(sp.hospital, spedRate, districtRate, enrollment),
    speech: adaCategoryCount(sp.speech, spedRate, districtRate, enrollment),
    resource: adaCategoryCount(sp.resource, spedRate, districtRate, enrollment),
    selfContained: adaCategoryCount(sp.selfContained, spedRate, districtRate, enrollment),
    offCampus: adaCategoryCount(sp.offCampus, spedRate, districtRate, enrollment),
    vocAdj: adaCategoryCount(sp.vocAdj, spedRate, districtRate, enrollment),
    stateSchools: adaCategoryCount(sp.stateSchools, spedRate, districtRate, enrollment),
    residential: adaCategoryCount(sp.residential, spedRate, districtRate, enrollment),
  }
  inputs.ADA_nonpublic = adaCategoryCount(sp.nonpublic, spedRate, districtRate, enrollment)
  inputs.ADA_mainstream = adaCategoryCount(sp.mainstream, spedRate, districtRate, enrollment)
  inputs.ADJ_eci_dollars = p.specialEd.eciSetAsideDollars
  inputs.ADJ_gt_setaside_dollars = p.specialEd.gtSetAsideDollars
  inputs.spedNewModelPopulation = {
    tier1: adaCategoryCount(p.specialEd.newModelPct.tier1, spedRate, districtRate, enrollment),
    tier2: adaCategoryCount(p.specialEd.newModelPct.tier2, spedRate, districtRate, enrollment),
    tier3: adaCategoryCount(p.specialEd.newModelPct.tier3, spedRate, districtRate, enrollment),
    tier4: adaCategoryCount(p.specialEd.newModelPct.tier4, spedRate, districtRate, enrollment),
    tier5: adaCategoryCount(p.specialEd.newModelPct.tier5, spedRate, districtRate, enrollment),
    tier6: adaCategoryCount(p.specialEd.newModelPct.tier6, spedRate, districtRate, enrollment),
    tier7Residential: adaCategoryCount(p.specialEd.newModelPct.tier7Residential, spedRate, districtRate, enrollment),
  }
  inputs.spedNewModelWeights = { ...p.specialEd.newModelWeights }

  // ---- CTE (carve-out, FTE-based) ----
  const cteRate = p.cte.attendanceRatePct
  inputs.FTE_cte1 = adaCategoryCount(p.cte.tier1Pct, cteRate, districtRate, enrollment)
  inputs.FTE_cte2 = adaCategoryCount(p.cte.tier2Pct, cteRate, districtRate, enrollment)
  inputs.FTE_cte3 = adaCategoryCount(p.cte.tier3Pct, cteRate, districtRate, enrollment)

  // ---- Dyslexia (overlay, enrollment-based — no attendance multiplier) ----
  inputs.ENR_dys37 = pct(p.dyslexia.pic37Pct, enrollment)
  inputs.ENR_dys43 = pct(p.dyslexia.pic43Pct, enrollment)

  // ---- Compensatory Ed (overlay, enrollment-based) ----
  inputs.ENR_sce = pct(p.compEd.concentrationPct, enrollment)
  inputs.sce_concentrationPct = p.compEd.concentrationPct
  inputs.ENR_pregnant = pct(p.compEd.pregnantPct, enrollment)
  inputs.ENR_resid_nonedisadv = pct(p.compEd.residTreatmentPct, enrollment)

  // ---- Bilingual/ESL (overlay, ADA-based) ----
  const bilRate = p.bilingual.attendanceRatePct
  inputs.ADA_eb = adaCategoryCount(p.bilingual.ebBasePct, bilRate, districtRate, enrollment)
  inputs.ADA_eb_dl = adaCategoryCount(p.bilingual.ebDlPct, bilRate, districtRate, enrollment)
  inputs.ADA_noneb_dl = adaCategoryCount(p.bilingual.nonEbDlPct, bilRate, districtRate, enrollment)

  // ---- Early Education (overlay, ADA-based) ----
  const earlyRate = p.earlyEd.attendanceRatePct
  inputs.ADA_k3predk = adaCategoryCount(p.earlyEd.k3PrePrekPct, earlyRate, districtRate, enrollment)
  inputs.ADA_prek = adaCategoryCount(p.earlyEd.prekPct, earlyRate, districtRate, enrollment)
  inputs.ADA_k3all = adaCategoryCount(p.earlyEd.k3AllPct, earlyRate, districtRate, enrollment)

  // ---- Gifted & Talented (overlay, ADA-based, capped) ----
  inputs.ADA_gt = adaCategoryCount(p.giftedTalented.identifiedPct, p.giftedTalented.attendanceRatePct, districtRate, enrollment)

  // ---- R-PEP (overlay, ADA-based) ----
  const rpepRate = p.rpep.attendanceRatePct
  inputs.ADA_rpep_ed = adaCategoryCount(p.rpep.edDisadvPct, rpepRate, districtRate, enrollment)
  inputs.ADA_rpep_noted = adaCategoryCount(p.rpep.nonEdDisadvPct, rpepRate, districtRate, enrollment)
  inputs.Count_rpep_grad_ed = p.rpep.gradEd
  inputs.Count_rpep_grad_noted = p.rpep.gradNoted
  inputs.Count_rpep_grad_sped = p.rpep.gradSped

  // ---- Dropout Recovery / Residential Placement (overlay, ADA-based) ----
  inputs.ADA_dropout = adaCategoryCount(p.dropoutRecovery.pct, p.dropoutRecovery.attendanceRatePct, districtRate, enrollment)
  inputs.ADA_resplacement = adaCategoryCount(p.residentialPlacement.pct, p.residentialPlacement.attendanceRatePct, districtRate, enrollment)

  // ---- Fast Growth (overlay, ADA-based) ----
  inputs.ADA_fastgrowth = adaCategoryCount(p.fastGrowth.eligiblePct, p.fastGrowth.attendanceRatePct, districtRate, enrollment)

  // ---- Support Staff Retention ----
  inputs.ADA_virtual_nonres = pct(p.supportStaffRetention.virtualNonResPct, enrollment)

  // ---- CCMR graduates ----
  inputs.Count_grad_ed = p.graduates.edDisadv
  inputs.Count_grad_noted = p.graduates.notEdDisadv
  inputs.Count_grad_sped = p.graduates.sped

  // ---- Staffing-based allotments (direct counts, not population %) ----
  inputs.Count_tia_master = p.staffing.tiaMaster
  inputs.Count_tia_exemplary = p.staffing.tiaExemplary
  inputs.Count_tia_recognized = p.staffing.tiaRecognized
  inputs.Count_mentor = p.staffing.mentorPairs
  inputs.rate_mentor = p.staffing.mentorRate
  inputs.Count_fiie = p.staffing.fiieEvaluations
  inputs.Count_tra_3to4yrs = p.staffing.tra3to4yrs
  inputs.Count_tra_5plusYrs = p.staffing.tra5plusYrs

  // ---- Facilities ----
  inputs.Count_campuses = p.facilities.campusCount
  inputs.Miles_reg = p.facilities.milesRegular
  inputs.Miles_sped = p.facilities.milesSped
  inputs.ALLOT_nifa_dollars = p.facilities.nifaDollars

  // ---- RDSPD, ASF ----
  inputs.Count_rdspd = p.rdspd.studentCount
  inputs.ADA_asf = p.asf.priorYearAda

  // ---- Property & Tax / Tier Two ----
  inputs.PV_prior = p.propertyTax.priorYearPropertyValue
  inputs.PV_curr_override = p.propertyTax.currentYearPropertyValueOverride
  inputs.TR_adopted = p.propertyTax.adoptedTaxRate
  inputs.TR_t1 = p.propertyTax.tier1TaxRate
  inputs.MO_collect_override = p.propertyTax.moCollectOverride
  inputs.ADJ_ifalp = p.propertyTax.ifaLeasePurchaseAdj
  inputs.ADJ_tif = p.propertyTax.tifPaymentAdj
  inputs.ADJ_taxrefund = p.propertyTax.taxRefundAdj

  // ---- IMTA (enrollment-based) ----
  inputs.ENR_eb_imta = pct(p.imta.emergentBilingualPct, enrollment)

  inputs.otherProgramsDollars = p.otherProgramsDollars

  return inputs
}
