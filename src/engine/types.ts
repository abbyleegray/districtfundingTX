// Types matching the mo_variables.json schema (see docs/source-data/BUILD_SPEC.md §4)

export type CostBehaviorTag =
  | 'Linear - Per Unit'
  | 'Linear - Flat $ Per Event'
  | 'Per-Campus (Step)'
  | 'Sliding Scale'
  | 'Step-Threshold'
  | 'Capped / Prorated'
  | 'One-Time / Facility-Triggered'
  | 'Derived - Formula Output'
  | 'Derived Input'
  | 'Statewide Constant (Non-Scaling)'
  | 'Statutory Cap/Ceiling'

export type CountBasis =
  | 'ADA (Attendance)'
  | 'ADA (Attendance, Derived)'
  | 'ADA (Attendance, Half-Day Adjusted)'
  | 'ADA (Attendance, Prior-Year)'
  | 'Enrollment (Membership)'
  | 'FTE (Instructional Time)'
  | 'WADA (Derived Aggregate)'
  | 'Teacher/Staff Count'
  | 'Graduate Count (Event)'
  | 'Evaluation Count (Event)'
  | 'Campus/Facility Count'
  | 'Campus/Facility Count (Event)'
  | 'Route Mileage'
  | 'Student Count (Program-Specific)'
  | string // N/A (...) subtypes for pure constants/derived values

export type VariableType =
  | 'District Input'
  | 'Statewide Constant'
  | 'Derived'
  | 'Statutory Cap'
  | string // several compound subtypes appear in the dataset, e.g. "District Input + sliding scale"

export interface MOVariable {
  symbol: string
  name: string
  fsp_component: string
  category: string
  tec_statute: string
  value_rate: string
  cost_behavior_tag: CostBehaviorTag
  count_basis: CountBasis
  variable_type: VariableType
  formula: string
  unit: string
  source_sheet: string
  source_location: string
  notes: string | null
  my_notes: string | null
}
