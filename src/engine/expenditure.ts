// Expenditure estimation engine — V2_BUILD_SPEC.md §6.
// Built from real statewide PEIMS Function Code data (src/data/spending_bands.json,
// staffing_bands.json), grouped into 11 enrollment bands, per docs/source-data/analyze_staffing_trends.R.
// Four category "basis" types, per §6.2, chosen by what the real data actually showed:
//   - flat-per-pupil: CV settles down at larger sizes, a single per-band $/student figure is defensible
//   - fixed-marginal: classic fixed-cost-dilution shape (fixed/enrollment + marginal), fit by
//     weighted least squares across band midpoints rather than using one band average
//   - per-campus: driven by campus count, not enrollment (School Safety officers)
//   - mileage-unknown: driven by route mileage, not enrollment — no per-pupil default is honest
//   - no-confident-default: CV stays high (0.6-1.5+) at every size tested — defaults to $0, open entry

import spendingRaw from '../data/spending_bands.json'
import staffingRaw from '../data/staffing_bands.json'

export interface SpendBandRow {
  n: number
  mean_pp: number
  median_pp: number
  sd_pp: number
  cv: number
}

export interface StaffBandRow {
  n: number
  mean_fte_per_1000: number
  cv_fte_per_1000: number
  mean_pay_per_pupil: number
  cv_pay_per_pupil: number
  mean_avg_salary: number
  median_avg_salary: number
  cv_avg_salary: number
}

const spendingBands = spendingRaw as Record<string, Record<string, SpendBandRow>>
const staffingBands = staffingRaw as Record<string, Record<string, StaffBandRow>>

export interface EnrollmentBand {
  id: string
  label: string
  min: number
  max: number
  midpoint: number
  /** substring that uniquely identifies this band regardless of the inconsistent letter prefixes between the two source CSVs */
  match: string
}

export const ENROLLMENT_BANDS: EnrollmentBand[] = [
  { id: 'A', label: '< 500', min: 0, max: 500, midpoint: 300, match: '<500' },
  { id: 'B', label: '500–1,000', min: 500, max: 1000, midpoint: 750, match: '500-1,000' },
  { id: 'C', label: '1,000–2,000', min: 1000, max: 2000, midpoint: 1500, match: '1,000-2,000' },
  { id: 'D', label: '2,000–4,000', min: 2000, max: 4000, midpoint: 3000, match: '2,000-4,000' },
  { id: 'E', label: '4,000–6,000', min: 4000, max: 6000, midpoint: 5000, match: '4,000-6,000' },
  { id: 'F', label: '6,000–8,000', min: 6000, max: 8000, midpoint: 7000, match: '6,000-8,000' },
  { id: 'G', label: '8,000–10,000', min: 8000, max: 10000, midpoint: 9000, match: '8,000-10,000' },
  { id: 'H', label: '10,000–15,000', min: 10000, max: 15000, midpoint: 12500, match: '10,000-15,000' },
  { id: 'I', label: '15,000–20,000', min: 15000, max: 20000, midpoint: 17500, match: '15,000-20,000' },
  { id: 'J', label: '20,000–25,000', min: 20000, max: 25000, midpoint: 22500, match: '20,000-25,000' },
  // Open-ended top band — the source tables don't report a mean enrollment within it, so the
  // midpoint used for the fixed/marginal curve fit is a reasonable representative estimate, not a
  // measured value. Only affects the regression fit, not the flat-per-pupil lookups (which use
  // whichever band the district's actual enrollment falls into, unaffected by this estimate).
  { id: 'K', label: '25,000+', min: 25000, max: Infinity, midpoint: 40000, match: '25,000+' },
]

export function bandForEnrollment(enrollment: number): EnrollmentBand {
  return ENROLLMENT_BANDS.find((b) => enrollment >= b.min && enrollment < b.max) ?? ENROLLMENT_BANDS[ENROLLMENT_BANDS.length - 1]
}

function lookupBandRow<T>(table: Record<string, Record<string, T>>, func: string, band: EnrollmentBand): T | undefined {
  const rows = table[func]
  if (!rows) return undefined
  const key = Object.keys(rows).find((k) => k.includes(band.match))
  return key ? rows[key] : undefined
}

export function spendRow(func: string, band: EnrollmentBand): SpendBandRow | undefined {
  return lookupBandRow(spendingBands, func, band)
}

export function staffRow(func: string, band: EnrollmentBand): StaffBandRow | undefined {
  return lookupBandRow(staffingBands, func, band)
}

/** Weighted least squares fit of mean_pp ~ marginal + fixed/enrollment, using band midpoints as the enrollment proxy and band sample size n as the weight. */
export function fitFixedMarginal(func: string): { fixed: number; marginal: number } {
  let sw = 0,
    swx = 0,
    swy = 0,
    swxx = 0,
    swxy = 0
  for (const band of ENROLLMENT_BANDS) {
    const row = spendRow(func, band)
    if (!row) continue
    const w = row.n
    const x = 1 / band.midpoint
    const y = row.mean_pp
    sw += w
    swx += w * x
    swy += w * y
    swxx += w * x * x
    swxy += w * x * y
  }
  const denom = sw * swxx - swx * swx
  const fixed = denom !== 0 ? (sw * swxy - swx * swy) / denom : 0
  const marginal = sw !== 0 ? (swy - fixed * swx) / sw : 0
  return { fixed: Math.max(fixed, 0), marginal: Math.max(marginal, 0) }
}

export type ExpenditureBasis = 'flat-per-pupil' | 'fixed-marginal' | 'per-campus' | 'mileage-unknown' | 'no-confident-default'

export interface ExpenditureCategoryConfig {
  func: string
  functionCode: string
  label: string
  /** Plain-language description for the category's pop-up. */
  description: string
  staffingLabel?: string
  basis: ExpenditureBasis
  /** True if this function's dollars don't flow through the General Fund M&O budget this app models (shown for staffing context only). */
  notGeneralFundNote?: string
}

export const EXPENDITURE_CATEGORIES: ExpenditureCategoryConfig[] = [
  { func: 'Instruction_11', functionCode: '11', label: 'Instruction', description: 'Classroom teachers, instructional aides, and the direct costs of teaching students.', staffingLabel: 'Teachers & Instructional Aides', basis: 'flat-per-pupil' },
  { func: 'Media_12', functionCode: '12', label: 'Instructional Resources & Media Services', description: 'School librarians and instructional materials coordinators.', staffingLabel: 'Librarians & Media Staff', basis: 'flat-per-pupil' },
  { func: 'CurricDev_13', functionCode: '13', label: 'Curriculum & Staff Development', description: 'Costs of developing curriculum and training teachers.', basis: 'flat-per-pupil' },
  { func: 'InstrLead_21', functionCode: '21', label: 'Instructional Leadership', description: 'Instructional coaches, program directors, and teacher-facing instructional support staff.', staffingLabel: 'Instructional Coaches & Program Directors', basis: 'flat-per-pupil' },
  { func: 'SchoolLead_23', functionCode: '23', label: 'School Leadership', description: 'Campus-level administration.', staffingLabel: 'Principals & Assistant Principals', basis: 'fixed-marginal' },
  { func: 'Guidance_31', functionCode: '31', label: 'Guidance & Counseling Services', description: 'School counselors, psychologists, and diagnosticians.', staffingLabel: 'Counselors & Psychologists', basis: 'flat-per-pupil' },
  { func: 'SocialWork_32', functionCode: '32', label: 'Social Work Services', description: 'Social workers and family/community liaisons — a service relatively few districts staff at scale.', staffingLabel: 'Social Workers & Family Liaisons', basis: 'no-confident-default' },
  { func: 'Health_33', functionCode: '33', label: 'Health Services', description: 'School nurses and health-related therapists.', staffingLabel: 'Nurses & Health Therapists', basis: 'flat-per-pupil' },
  { func: 'Transport_34', functionCode: '34', label: 'Transportation', description: 'Operating the district’s bus fleet and routes.', staffingLabel: 'Transportation Staff', basis: 'mileage-unknown' },
  { func: 'Extracurr_36', functionCode: '36', label: 'Extracurricular Activities', description: 'Athletics and other extracurricular programs.', staffingLabel: 'Athletics & Extracurricular Staff', basis: 'flat-per-pupil' },
  { func: 'GenAdmin_41', functionCode: '41', label: 'General Administration', description: 'Superintendent’s office and central business/HR administration.', staffingLabel: 'Superintendent & Central Administration', basis: 'fixed-marginal' },
  { func: 'Facilities_51', functionCode: '51', label: 'Facilities Maintenance & Operations', description: 'Custodial staff, building maintenance, and utilities.', staffingLabel: 'Custodial & Maintenance Staff', basis: 'fixed-marginal' },
  { func: 'Security_52', functionCode: '52', label: 'Security & Monitoring Services', description: 'Campus security and safety officers — statutorily driven by campus count, not enrollment.', staffingLabel: 'Security & Safety Officers', basis: 'per-campus' },
  { func: 'DataProc_53', functionCode: '53', label: 'Data Processing Services', description: 'IT infrastructure and data-systems staff.', staffingLabel: 'IT & Data Processing Staff', basis: 'flat-per-pupil' },
  { func: 'CommunitySvc_61', functionCode: '61', label: 'Community Services', description: 'Programs serving the broader community beyond enrolled students (adult education, community use of facilities, etc.).', basis: 'flat-per-pupil' },
]

export const DEFAULT_OFFICER_COST = 80_000 // midpoint of the $60k-$100k+ documented range, V2_BUILD_SPEC.md §6.2

export interface ExpenditureContext {
  enrollment: number
  campusCount: number
  /** Total annual route mileage (regular + SpEd combined), if known. */
  totalMileage: number | null
  officerCostAssumption: number
}

export interface ExpenditureLineResult {
  category: ExpenditureCategoryConfig
  band: EnrollmentBand
  /** The auto-computed default, before any user override. */
  autoDefault: number
  /** The amount actually used (override if set, else autoDefault). */
  amount: number
  isOverridden: boolean
  /** honest per-category, per-band methodology note, pulled live from the tables — V2_BUILD_SPEC.md §6.4 */
  methodologyNote: string
  cv: number | null
}

function formatMoney(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

export function estimateCategory(category: ExpenditureCategoryConfig, ctx: ExpenditureContext, override: number | null): ExpenditureLineResult {
  const band = bandForEnrollment(ctx.enrollment)
  const row = spendRow(category.func, band)
  let autoDefault = 0
  let methodologyNote: string
  let cv: number | null = row?.cv ?? null

  switch (category.basis) {
    case 'flat-per-pupil': {
      const perPupil = row?.median_pp ?? 0
      autoDefault = perPupil * ctx.enrollment
      methodologyNote = row
        ? `For districts your size (${band.label} students), this category typically runs ${formatMoney(row.median_pp)}/student across Texas districts (coefficient of variation: ${row.cv.toFixed(2)}), so we've defaulted to the middle of that range (sample: ${row.n} districts). ${row.cv > 0.3 ? 'That CV is on the higher side for this basis — treat the default as a starting point, not a precise estimate.' : ''}`
        : 'No statewide data available for this category/size combination — defaulted to $0.'
      break
    }
    case 'fixed-marginal': {
      const { fixed, marginal } = fitFixedMarginal(category.func)
      autoDefault = (marginal + fixed / Math.max(ctx.enrollment, 1)) * ctx.enrollment
      methodologyNote = `This category shows a classic fixed-cost shape in the real data: a district your size (${band.label} students) typically spends ${row ? formatMoney(row.median_pp) : '—'}/student (CV ${row ? row.cv.toFixed(2) : '—'}), but smaller districts spend substantially more per student for essentially the same administrative function. We fit a fixed-cost-plus-marginal-cost curve (≈${formatMoney(fixed)} fixed ÷ enrollment, plus ≈${formatMoney(marginal)}/student marginal) across all district sizes rather than using one band average.`
      break
    }
    case 'per-campus': {
      autoDefault = ctx.officerCostAssumption * ctx.campusCount
      methodologyNote = `Driven by campus count, not enrollment or a per-pupil ratio — Texas law requires at least one officer per campus, and the real spending data confirms it (CV stayed high, ${row ? row.cv.toFixed(2) : '0.3–1.0'}, at every district size). Documented officer cost runs $60,000–$100,000+/year; defaulted to ${formatMoney(ctx.officerCostAssumption)} × ${ctx.campusCount} campuses. Compare this to your much smaller School Safety *revenue* line above — that gap is real: Austin ISD, for example, received about $5.4M in state transportation funding but spent nearly $42M, and a comparable gap exists for the safety-officer mandate specifically.`
      break
    }
    case 'mileage-unknown': {
      if (ctx.totalMileage != null && ctx.totalMileage > 0) {
        // No confident statewide $/mile operating-cost figure exists (as opposed to the state's
        // reimbursement rate, which is a different, usually lower, number) — ask the user directly.
        autoDefault = 0
        methodologyNote = `Transportation cost is route-mileage-driven, not enrollment-driven (CV stayed high, 0.22–0.96, at every district size we tested) — a per-pupil default would misstate it either direction depending on your geography. You've entered ${ctx.totalMileage.toLocaleString()} annual route miles on the revenue side; there's no confident statewide $/mile operating-cost figure to multiply that by (distinct from the state's lower reimbursement rate), so enter your district's actual transportation budget directly.`
      } else {
        autoDefault = 0
        methodologyNote = `Transportation cost is route-mileage-driven, not enrollment-driven (CV stayed high, 0.22–0.96, at every district size we tested). For reference, mid-size Texas districts commonly run several hundred thousand to a few million miles per year, depending on geography — there's no single "typical" figure. Defaulted to $0; enter your district's actual transportation budget directly.`
      }
      break
    }
    case 'no-confident-default': {
      autoDefault = 0
      methodologyNote = `Rarely offered at any scale, and highly discretionary where it is — coefficient of variation stayed above 0.6–1.5 even in the largest districts we tested (your band: ${row ? row.cv.toFixed(2) : '—'}). No statewide figure is a confident default here; defaulted to $0 for direct entry.`
      break
    }
  }

  const amount = override ?? autoDefault
  return { category, band, autoDefault, amount, isOverridden: override != null, methodologyNote, cv }
}

export interface StaffingPrintout {
  category: ExpenditureCategoryConfig
  fteCount: number
  avgSalary: number
  studentsPerStaff: number | null
}

export function staffingPrintout(category: ExpenditureCategoryConfig, enrollment: number): StaffingPrintout | null {
  const band = bandForEnrollment(enrollment)
  const row = staffRow(category.func, band)
  if (!row) return null
  const fteCount = (row.mean_fte_per_1000 / 1000) * enrollment
  return {
    category,
    fteCount,
    avgSalary: row.mean_avg_salary,
    studentsPerStaff: fteCount > 0 ? enrollment / fteCount : null,
  }
}

export interface ExpenditureResult {
  lines: ExpenditureLineResult[]
  total: number
  staffingPrintouts: StaffingPrintout[]
  studentsPerTeacher: number | null
}

export function calculateExpenditures(ctx: ExpenditureContext, overrides: Partial<Record<string, number>>): ExpenditureResult {
  const lines = EXPENDITURE_CATEGORIES.map((cat) => estimateCategory(cat, ctx, overrides[cat.func] ?? null))
  const total = lines.reduce((sum, l) => sum + l.amount, 0)
  const staffingPrintouts = [...EXPENDITURE_CATEGORIES, FOOD_SERVICE_CATEGORY]
    .map((cat) => staffingPrintout(cat, ctx.enrollment))
    .filter((p): p is StaffingPrintout => p != null)
  const instruction = staffingPrintouts.find((p) => p.category.func === 'Instruction_11')
  const studentsPerTeacher = instruction && instruction.fteCount > 0 ? ctx.enrollment / instruction.fteCount : null
  return { lines, total, staffingPrintouts, studentsPerTeacher }
}

/** Function 35 (Food Service) runs through a separate Food Service special revenue fund, not the General Fund M&O budget this app models — staffing-only context, no dollar expenditure line. */
export const FOOD_SERVICE_CATEGORY: ExpenditureCategoryConfig = {
  func: 'FoodService_35',
  functionCode: '35',
  label: 'Food Service',
  description: "Cafeteria and nutrition staff — funded through the district's separate Food Service fund, not general M&O revenue.",
  staffingLabel: 'Food Service Staff',
  basis: 'flat-per-pupil',
  notGeneralFundNote: 'Shown for staffing context only — Food Service is funded through a separate special revenue fund (National School Lunch Act), outside this simulator’s M&O scope.',
}
