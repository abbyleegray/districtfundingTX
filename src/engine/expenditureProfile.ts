import { DEFAULT_OFFICER_COST } from './expenditure'

export interface ExpenditureProfile {
  /** Keyed by the category's `func` id (e.g. "Instruction_11"). null/absent = use the auto default. */
  overrides: Partial<Record<string, number>>
  officerCostAssumption: number
}

export function defaultExpenditureProfile(): ExpenditureProfile {
  return { overrides: {}, officerCostAssumption: DEFAULT_OFFICER_COST }
}
