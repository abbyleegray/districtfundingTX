import { EXPENDITURE_CATEGORIES, estimateCategory, type ExpenditureContext } from '../engine/expenditure'
import type { ExpenditureProfile } from '../engine/expenditureProfile'
import { NumberField } from './fields'

interface Props {
  profile: ExpenditureProfile
  context: ExpenditureContext
  onChange: (updater: (prev: ExpenditureProfile) => ExpenditureProfile) => void
}

export function ExpenditureInputForm({ profile, context, onChange }: Props) {
  function setOverride(func: string, value: number | null) {
    onChange((prev) => {
      const overrides = { ...prev.overrides }
      if (value == null) delete overrides[func]
      else overrides[func] = value
      return { ...prev, overrides }
    })
  }

  return (
    <div className="input-form">
      <div className="section-note">
        Auto-filled from real statewide spending data for a district your size, grouped by PEIMS
        Function Code. Override any line with your district's actual budgeted amount — leave blank to
        go back to the auto-computed default.
      </div>

      <details>
        <summary>Security staffing assumption</summary>
        <div className="section-body">
          <NumberField
            label="Assumed cost per security officer"
            value={profile.officerCostAssumption}
            min={0}
            step={1000}
            unit="$/year"
            onChange={(v) => onChange((prev) => ({ ...prev, officerCostAssumption: v }))}
            help="Documented range: $60,000–$100,000+/year. Security cost is driven by campus count, not enrollment."
          />
        </div>
      </details>

      {EXPENDITURE_CATEGORIES.map((cat) => {
        const result = estimateCategory(cat, context, profile.overrides[cat.func] ?? null)
        return (
          <details key={cat.func}>
            <summary>
              {cat.label} <span className="tag tag-expcode">Fn. {cat.functionCode}</span>
            </summary>
            <div className="section-body">
              <div className="section-note">{cat.description}</div>
              <NumberField
                label={`Annual expenditure${result.isOverridden ? '' : ' (auto default)'}`}
                value={Math.round(result.amount)}
                min={0}
                step={1000}
                unit="$"
                onChange={(v) => setOverride(cat.func, v)}
              />
              {result.isOverridden ? (
                <button type="button" className="btn-reset" onClick={() => setOverride(cat.func, null)}>
                  Reset to auto default (${Math.round(result.autoDefault).toLocaleString()})
                </button>
              ) : null}
              <span className="field-help">{result.methodologyNote}</span>
            </div>
          </details>
        )
      })}
    </div>
  )
}
