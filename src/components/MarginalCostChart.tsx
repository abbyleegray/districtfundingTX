import { useMemo, useState } from 'react'
import { calculateFunding } from '../engine/calculate'
import { buildEngineInputsFromSynthetic, type SyntheticDistrictProfile } from '../engine/synthetic'

interface Props {
  profile: SyntheticDistrictProfile
}

const WIDTH = 720
const HEIGHT = 320
const MARGIN = { top: 16, right: 24, bottom: 36, left: 92 }

function studentsPerCampus(profile: SyntheticDistrictProfile): number {
  return profile.enrollment > 0 && profile.facilities.campusCount > 0 ? profile.enrollment / profile.facilities.campusCount : 750
}

export function MarginalCostChart({ profile }: Props) {
  const [mode, setMode] = useState<'total' | 'marginal'>('total')
  const [rangeMax, setRangeMax] = useState(12000)

  const points = useMemo(() => {
    const perCampus = studentsPerCampus(profile)
    const steps = 60
    const raw: { enrollment: number; total: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const enrollment = Math.max(100, Math.round((rangeMax * i) / steps))
      const scaled: SyntheticDistrictProfile = {
        ...profile,
        enrollment,
        facilities: { ...profile.facilities, campusCount: Math.max(1, Math.ceil(enrollment / perCampus)) },
      }
      const result = calculateFunding(buildEngineInputsFromSynthetic(scaled))
      raw.push({ enrollment, total: result.totalMO })
    }
    return raw
  }, [profile, rangeMax])

  const series = useMemo(() => {
    if (mode === 'total') return points
    // marginal $ per additional student, centered finite difference
    return points.map((p, i) => {
      const prev = points[Math.max(0, i - 1)]
      const next = points[Math.min(points.length - 1, i + 1)]
      const dEnrollment = next.enrollment - prev.enrollment || 1
      const dTotal = next.total - prev.total
      return { enrollment: p.enrollment, total: dTotal / dEnrollment }
    })
  }, [points, mode])

  const currentEnrollment = profile.enrollment
  const maxY = Math.max(...series.map((p) => p.total), 1)
  const minY = Math.min(0, ...series.map((p) => p.total))
  const xScale = (enrollment: number) => MARGIN.left + (enrollment / rangeMax) * (WIDTH - MARGIN.left - MARGIN.right)
  const yScale = (value: number) => HEIGHT - MARGIN.bottom - ((value - minY) / (maxY - minY || 1)) * (HEIGHT - MARGIN.top - MARGIN.bottom)

  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.enrollment).toFixed(1)} ${yScale(p.total).toFixed(1)}`).join(' ')

  const yTicks = 5
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minY + ((maxY - minY) * i) / yTicks)
  const xTicks = 6
  const xTickValues = Array.from({ length: xTicks + 1 }, (_, i) => Math.round((rangeMax * i) / xTicks))

  const formatY = (v: number) =>
    mode === 'total'
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : `$${(v / 1000).toFixed(1)}k/student`

  return (
    <div className="chart">
      <div className="chart-controls">
        <div className="chart-mode-toggle">
          <button type="button" className={mode === 'total' ? 'active' : ''} onClick={() => setMode('total')}>
            Total M&amp;O by size
          </button>
          <button type="button" className={mode === 'marginal' ? 'active' : ''} onClick={() => setMode('marginal')}>
            Marginal $/student
          </button>
        </div>
        <label className="chart-range">
          Enrollment range up to
          <input type="number" value={rangeMax} step={1000} min={2000} onChange={(e) => setRangeMax(e.target.valueAsNumber || 12000)} />
        </label>
      </div>
      <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Funding by district size">
        {yTickValues.map((v) => (
          <g key={v}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yScale(v)} y2={yScale(v)} className="grid-line" />
            <text x={MARGIN.left - 8} y={yScale(v)} textAnchor="end" dominantBaseline="middle" className="axis-label">
              {formatY(v)}
            </text>
          </g>
        ))}
        {xTickValues.map((v) => (
          <g key={v}>
            <text x={xScale(v)} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle" className="axis-label">
              {v.toLocaleString()}
            </text>
          </g>
        ))}
        <text x={(WIDTH + MARGIN.left) / 2} y={HEIGHT - 4} textAnchor="middle" className="axis-title">
          Enrollment
        </text>

        {/* Step-Threshold marker: Teacher Retention rate bucket flips at 5,000 enrollment */}
        {rangeMax > 5000 ? (
          <line x1={xScale(5000)} x2={xScale(5000)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className="threshold-line" />
        ) : null}
        {rangeMax > 5000 ? (
          <text x={xScale(5000) + 4} y={MARGIN.top + 12} className="threshold-label">
            5,000 — Teacher Retention rate step
          </text>
        ) : null}

        <path d={path} className="chart-line" />

        {currentEnrollment <= rangeMax ? (
          <line x1={xScale(currentEnrollment)} x2={xScale(currentEnrollment)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className="current-line" />
        ) : null}
      </svg>
      <p className="chart-caption">
        Campus count is scaled with enrollment (≈{Math.round(studentsPerCampus(profile)).toLocaleString()} students/campus, from your current
        inputs), so the $33,540 School Safety per-campus allotment shows up as visible jumps rather than a smooth line — the same is true of the
        Teacher Retention rate bucket at 5,000 enrollled students. All other population shares are held at their current percentages while
        enrollment is scaled.
      </p>
    </div>
  )
}
