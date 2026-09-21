import { rate, type RateOverrides } from './constants'
import type { EngineInputs } from './inputs'
import { li, type LineItem } from './lineItems'

export interface SpedModelResult {
  /** FTE aggregate subtracted from ADA_ref to derive ADA_reg. */
  fteSpedAgg: number
  lineItems: LineItem[]
}

/**
 * Legacy Model (TEC 48.102, in effect through SY 2025-26): 9 instructional-arrangement
 * FTE weights, all subtracted from ADA_ref via FTE_sped_agg, plus two ADA-based
 * additive-only lines (nonpublic, mainstream) that feed WADA but do NOT reduce ADA_reg.
 */
function calculateLegacySped(inputs: EngineInputs, ba_adj: number, overrides?: RateOverrides): SpedModelResult {
  const f = inputs.spedLegacyFte
  const arrangementLines: [keyof typeof f, string, number][] = [
    ['homebound', 'Homebound', rate('w_homebound', overrides)],
    ['hospital', 'Hospital Class', rate('w_hospital', overrides)],
    ['speech', 'Speech Therapy', rate('w_speech', overrides)],
    ['resource', 'Resource Room', rate('w_resource', overrides)],
    ['selfContained', 'Self-Contained', rate('w_selfcontained', overrides)],
    ['offCampus', 'Off Home Campus', rate('w_offcampus', overrides)],
    ['vocAdj', 'Vocational Adjustment Class', rate('w_vocadj', overrides)],
    ['stateSchools', 'State Schools', rate('w_stateschools', overrides)],
    ['residential', 'Residential Care and Treatment', rate('w_residential', overrides)],
  ]

  const lineItems: LineItem[] = arrangementLines.map(([key, label, weight]) =>
    li(
      `w_${key}`,
      `${label} FTE weight`,
      'Tier One',
      'Special Education',
      'Linear - Per Unit',
      f[key] * weight * ba_adj,
      true,
    ),
  )

  lineItems.push(
    li(
      'w_nonpublic',
      'Non-Public Contracts ADA weight',
      'Tier One',
      'Special Education',
      'Linear - Per Unit',
      inputs.ADA_nonpublic * rate('w_nonpublic', overrides) * ba_adj,
      true,
      'ADA-based, additive only — not part of FTE_sped_agg.',
    ),
    li(
      'w_mainstream',
      'Mainstream ADA weight',
      'Tier One',
      'Special Education',
      'Linear - Per Unit',
      inputs.ADA_mainstream * rate('w_mainstream', overrides) * ba_adj,
      true,
      'ADA-based, additive only — not part of FTE_sped_agg.',
    ),
    li(
      'ADJ_eci',
      'Early Childhood Intervention (ECI) Set-Aside',
      'Tier One',
      'Special Education',
      'Statewide Constant (Non-Scaling)',
      -Math.abs(inputs.ADJ_eci_dollars),
      false,
    ),
  )

  const fteSpedAgg = Object.values(f).reduce((sum, v) => sum + v, 0)
  return { fteSpedAgg, lineItems }
}

/**
 * New Model — Exploratory (HB2/SB568, 89th Leg): 7 service-intensity tiers (tier 7
 * reserved for residential placement). Structurally real; NO dollar weight is finalized
 * in statute. Weights here are always user-adjustable — see BUILD_SPEC §6.
 */
function calculateNewModelSped(inputs: EngineInputs, ba_adj: number): SpedModelResult {
  const pop = inputs.spedNewModelPopulation
  const w = inputs.spedNewModelWeights

  const tiers: [keyof typeof pop, keyof typeof w, string][] = [
    ['tier1', 'tier1', 'Tier 1 (least intensive)'],
    ['tier2', 'tier2', 'Tier 2'],
    ['tier3', 'tier3', 'Tier 3'],
    ['tier4', 'tier4', 'Tier 4'],
    ['tier5', 'tier5', 'Tier 5'],
    ['tier6', 'tier6', 'Tier 6'],
    ['tier7Residential', 'tier7Residential', 'Tier 7 (residential placement)'],
  ]

  const lineItems: LineItem[] = tiers.map(([popKey, wKey, label]) =>
    li(
      `sped_new_${popKey}`,
      `${label} — illustrative, not enacted`,
      'Tier One',
      'Special Education (New Model — Exploratory)',
      'Linear - Per Unit',
      pop[popKey] * w[wKey] * ba_adj,
      true,
      'No dollar weight is finalized in statute; permanent weights await the 2027 Legislature.',
    ),
  )

  const fteSpedAgg = Object.values(pop).reduce((sum, v) => sum + v, 0)
  return { fteSpedAgg, lineItems }
}

export function calculateSped(inputs: EngineInputs, ba_adj: number, overrides?: RateOverrides): SpedModelResult {
  return inputs.spedModel === 'newExploratory'
    ? calculateNewModelSped(inputs, ba_adj)
    : calculateLegacySped(inputs, ba_adj, overrides)
}
