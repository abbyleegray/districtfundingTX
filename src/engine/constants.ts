// Default statewide rates/weights, SY 2025-26, sourced from mo_variables.json `value_rate`.
// Every value here is overridable at call time (RateOverrides) so the "policy sandbox"
// mode (BUILD_SPEC §1.3) can test hypothetical formula changes.

export const DEFAULT_RATES = {
  BA: 6215.0,
  BA_adj: 8400.56,
  MCR: 0.613,
  LPE_GROWTH_FACTOR: 1.056,

  w_reg: 1.0,
  smallmid_small_threshold: 1600,
  smallmid_small_factor: 0.0004,
  smallmid_mid_threshold: 5000,
  smallmid_mid_factor: 0.000025,

  w_homebound: 5.0,
  w_hospital: 3.0,
  w_speech: 5.0,
  w_resource: 3.0,
  w_selfcontained: 3.0,
  w_offcampus: 2.7,
  w_vocadj: 2.3,
  w_stateschools: 2.8,
  w_residential: 4.0,
  w_nonpublic: 1.7,
  w_mainstream: 1.15,

  w_dys_pic37: 0.1,
  w_dys_pic43: 0.1,

  w_sce_min: 0.225,
  w_sce_max: 0.275,
  w_pregnant: 2.41,
  w_resid_nonedisadv: 0.2,

  w_eb_base: 0.1,
  w_eb_dl: 0.15,
  w_noneb_dl2way: 0.05,

  w_cte1: 1.1,
  w_cte2: 1.28,
  w_cte3: 1.47,

  w_k3_predk: 0.1,
  w_k3_all: 0.01,

  w_gt: 0.07,
  cap_gt_pct: 0.05,

  rate_ccmr_ed: 5000,
  rate_ccmr_noted: 3000,
  rate_ccmr_sped: 4000,

  w_fastgrowth: 0.04,

  rate_tia_master: 12000,
  rate_tia_exemplary: 6000,
  rate_tia_recognized: 3000,

  rate_ssa_ada: 21.1,
  rate_ssa_campus: 33540,

  rate_trans_reg: 1.08,
  rate_trans_sped: 1.13,

  rate_dropout: 275,
  rate_resplacement: 275,

  w_rpep_ed: 1.15,
  w_rpep_noted: 1.11,
  rate_rpep_grad_ed: 1500,
  rate_rpep_grad_noted: 700,
  rate_rpep_grad_sped: 1500,

  rate_fiie: 1000,

  threshold_district_size: 5000,
  rate_tra_small_34: 4000,
  rate_tra_small_5plus: 8000,
  rate_tra_large_34: 2500,
  rate_tra_large_5plus: 5000,

  rate_ssra: 45.0,
  rate_basiccosts: 106.0,

  DTR1_cap: 0.08,
  yield_L1: 129.52,
  yield_L2: 49.72,

  rate_asf: 470.813,
  rate_imta: 174.69,
  rate_imta_eb: 14.87,

  rate_rdspd: 6925,
} as const

export type RateKey = keyof typeof DEFAULT_RATES
export type RateOverrides = Partial<Record<RateKey, number>>

export function rate(key: RateKey, overrides?: RateOverrides): number {
  return overrides?.[key] ?? DEFAULT_RATES[key]
}
