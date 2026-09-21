interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  help?: string
}

export function NumberField({ label, value, onChange, min, max, step, unit, help }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {unit ? <span className="field-unit"> ({unit})</span> : null}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
      />
      {help ? <span className="field-help">{help}</span> : null}
    </label>
  )
}

interface PercentSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  max?: number
  help?: string
}

export function PercentSlider({ label, value, onChange, max = 100, help }: PercentSliderProps) {
  return (
    <label className="field field-slider">
      <span className="field-label">
        {label} <span className="field-value">{value.toFixed(2)}%</span>
      </span>
      <input type="range" min={0} max={max} step={0.05} value={value} onChange={(e) => onChange(e.target.valueAsNumber)} />
      {help ? <span className="field-help">{help}</span> : null}
    </label>
  )
}

interface AttendanceOverrideProps {
  label?: string
  value: number | null
  districtDefault: number
  onChange: (value: number | null) => void
}

export function AttendanceOverride({ label = 'Attendance rate override', value, districtDefault, onChange }: AttendanceOverrideProps) {
  const isOverridden = value !== null
  return (
    <label className="field field-attendance">
      <span className="field-label">
        <input
          type="checkbox"
          checked={isOverridden}
          onChange={(e) => onChange(e.target.checked ? districtDefault : null)}
        />
        {' '}
        {label}
        {!isOverridden ? <span className="field-unit"> (using district-wide {districtDefault}%)</span> : null}
      </span>
      {isOverridden ? (
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
      ) : null}
      {isOverridden ? <span className="field-value">{value.toFixed(1)}%</span> : null}
    </label>
  )
}
