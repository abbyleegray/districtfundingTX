// Raw engine inputs: one field per district-input variable in mo_variables.json,
// grouped the way the source Summary of Finances sheets group them.
// This is the "pure" layer BUILD_SPEC.md §8 calls for — calculateFunding() takes
// exactly this shape. The synthetic-district UI (src/engine/synthetic.ts) is a
// convenience layer that fills this in from enrollment/attendance/% sliders.

export type SpedModelMode = 'legacy' | 'newExploratory'

export interface SpedLegacyFte {
  homebound: number
  hospital: number
  speech: number
  resource: number
  selfContained: number
  offCampus: number
  vocAdj: number
  stateSchools: number
  residential: number
}

/** New service-intensity model (HB2/SB568, 89th Leg) — structure real, dollar weights not yet in statute. See BUILD_SPEC §6. */
export interface SpedNewModelTierPopulation {
  tier1: number
  tier2: number
  tier3: number
  tier4: number
  tier5: number
  tier6: number
  tier7Residential: number
}

export interface SpedNewModelTierWeights {
  tier1: number
  tier2: number
  tier3: number
  tier4: number
  tier5: number
  tier6: number
  tier7Residential: number
}

/** 2022 SpEd Funding Commission draft (never enacted) illustrative ranges — midpoints. Explicitly not current law. */
export const SPED_NEW_MODEL_ILLUSTRATIVE_WEIGHTS: SpedNewModelTierWeights = {
  tier1: 0,
  tier2: 0,
  tier3: 1.145,
  tier4: 1.49,
  tier5: 1.745,
  tier6: 5.4,
  tier7Residential: 20,
}

export interface EngineInputs {
  // ---- Base counts ----
  ADA_ref: number
  ENR_peims: number

  // ---- Special Education (carve-out: subtracted from ADA_ref via FTE_sped_agg) ----
  spedModel: SpedModelMode
  spedLegacyFte: SpedLegacyFte
  spedNewModelPopulation: SpedNewModelTierPopulation
  spedNewModelWeights: SpedNewModelTierWeights
  /** ADA-based, additive-only SpEd lines — NOT subtracted from ADA_reg (per source-sheet labeling). */
  ADA_nonpublic: number
  ADA_mainstream: number
  ADJ_eci_dollars: number
  ADJ_gt_setaside_dollars: number

  // ---- CTE (carve-out: subtracted from ADA_ref via FTE_cte_agg) ----
  FTE_cte1: number
  FTE_cte2: number
  FTE_cte3: number

  // ---- Dyslexia (overlay, enrollment-based) ----
  ENR_dys37: number
  ENR_dys43: number

  // ---- Compensatory Ed (overlay, enrollment-based) ----
  ENR_sce: number
  /** % economically-disadvantaged concentration, drives the 0.225-0.275 sliding-scale w_sce. */
  sce_concentrationPct: number
  ENR_pregnant: number
  ENR_resid_nonedisadv: number

  // ---- Bilingual / ESL (overlay, ADA-based) ----
  ADA_eb: number
  ADA_eb_dl: number
  ADA_noneb_dl: number

  // ---- Early Education (overlay, ADA-based) ----
  ADA_k3predk: number
  ADA_prek: number
  ADA_k3all: number

  // ---- Gifted & Talented (overlay, ADA-based, capped) ----
  ADA_gt: number

  // ---- CCMR outcomes (graduate-count events) ----
  Count_grad_ed: number
  Count_grad_noted: number
  Count_grad_sped: number

  // ---- Fast Growth (overlay, ADA-based) ----
  ADA_fastgrowth: number

  // ---- Teacher Incentive Allotment (teacher-count events) ----
  Count_tia_master: number
  Count_tia_exemplary: number
  Count_tia_recognized: number

  // ---- Mentor Program (teacher-count events, rate not statutorily published) ----
  Count_mentor: number
  rate_mentor: number

  // ---- School Safety ----
  Count_campuses: number

  // ---- Transportation ----
  Miles_reg: number
  Miles_sped: number

  // ---- NIFA (one-time, facility-triggered, no statewide rate) ----
  ALLOT_nifa_dollars: number

  // ---- Dropout Recovery ----
  ADA_dropout: number
  ADA_resplacement: number

  // ---- R-PEP ----
  ADA_rpep_ed: number
  ADA_rpep_noted: number
  Count_rpep_grad_ed: number
  Count_rpep_grad_noted: number
  Count_rpep_grad_sped: number

  // ---- FIIE ----
  Count_fiie: number

  // ---- Teacher Retention (rate bucket auto-selected by ENR_peims vs threshold_district_size) ----
  Count_tra_3to4yrs: number
  Count_tra_5plusYrs: number

  // ---- Support Staff Retention ----
  ADA_virtual_nonres: number

  // ---- Basic Costs ----
  // uses ENR_peims directly

  // ---- Tier Two / Property & Tax ----
  PV_prior: number
  PV_curr_override: number | null
  TR_adopted: number
  TR_t1: number
  MO_collect_override: number | null
  ADJ_ifalp: number
  ADJ_tif: number
  ADJ_taxrefund: number

  // ---- ASF ----
  ADA_asf: number

  // ---- IMTA ----
  ENR_eb_imta: number

  // ---- RDSPD ----
  Count_rdspd: number

  // ---- Other Programs (district-specific / rate-not-published: direct $ pass-throughs) ----
  otherProgramsDollars: Partial<Record<
    | 'credit_ch313'
    | 'payment_tirz'
    | 'aid_homestead_ceiling'
    | 'aid_tax_refunds'
    | 'aid_homestead_exempt'
    | 'aid_compression'
    | 'aid_instrmat_state'
    | 'aid_oer'
    | 'aid_insurance_diff'
    | 'aid_retention_backstop'
    | 'aid_adulted'
    | 'aid_uil'
    | 'adj_texasfirst'
    | 'rate_trans_private'
    | 'rate_trans_cte'
    | 'rate_tuition_gap'
    | 'rate_collegeprep_gap'
    | 'rate_certexam_gap'
    | 'cap_rpep',
    number
  >>
}

export function emptyEngineInputs(): EngineInputs {
  return {
    ADA_ref: 0,
    ENR_peims: 0,
    spedModel: 'legacy',
    spedLegacyFte: {
      homebound: 0,
      hospital: 0,
      speech: 0,
      resource: 0,
      selfContained: 0,
      offCampus: 0,
      vocAdj: 0,
      stateSchools: 0,
      residential: 0,
    },
    spedNewModelPopulation: {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      tier5: 0,
      tier6: 0,
      tier7Residential: 0,
    },
    spedNewModelWeights: { ...SPED_NEW_MODEL_ILLUSTRATIVE_WEIGHTS },
    ADA_nonpublic: 0,
    ADA_mainstream: 0,
    ADJ_eci_dollars: 0,
    ADJ_gt_setaside_dollars: 0,
    FTE_cte1: 0,
    FTE_cte2: 0,
    FTE_cte3: 0,
    ENR_dys37: 0,
    ENR_dys43: 0,
    ENR_sce: 0,
    sce_concentrationPct: 0,
    ENR_pregnant: 0,
    ENR_resid_nonedisadv: 0,
    ADA_eb: 0,
    ADA_eb_dl: 0,
    ADA_noneb_dl: 0,
    ADA_k3predk: 0,
    ADA_prek: 0,
    ADA_k3all: 0,
    ADA_gt: 0,
    Count_grad_ed: 0,
    Count_grad_noted: 0,
    Count_grad_sped: 0,
    ADA_fastgrowth: 0,
    Count_tia_master: 0,
    Count_tia_exemplary: 0,
    Count_tia_recognized: 0,
    Count_mentor: 0,
    rate_mentor: 0,
    Count_campuses: 0,
    Miles_reg: 0,
    Miles_sped: 0,
    ALLOT_nifa_dollars: 0,
    ADA_dropout: 0,
    ADA_resplacement: 0,
    ADA_rpep_ed: 0,
    ADA_rpep_noted: 0,
    Count_rpep_grad_ed: 0,
    Count_rpep_grad_noted: 0,
    Count_rpep_grad_sped: 0,
    Count_fiie: 0,
    Count_tra_3to4yrs: 0,
    Count_tra_5plusYrs: 0,
    ADA_virtual_nonres: 0,
    PV_prior: 0,
    PV_curr_override: null,
    TR_adopted: 0,
    TR_t1: 0,
    MO_collect_override: null,
    ADJ_ifalp: 0,
    ADJ_tif: 0,
    ADJ_taxrefund: 0,
    ADA_asf: 0,
    ENR_eb_imta: 0,
    Count_rdspd: 0,
    otherProgramsDollars: {},
  }
}
