import { Fragment } from 'react'
import type { FundingResult } from '../engine/calculate'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

const SECTION_ORDER = ['Tier One', 'Tier Two', 'ASF', 'IMTA', 'Other Programs']

const STEP_TAGS = new Set(['Per-Campus (Step)', 'Step-Threshold'])

interface Props {
  result: FundingResult
}

export function ResultsBreakdown({ result }: Props) {
  const bySection = SECTION_ORDER.map((section) => ({
    section,
    items: result.lineItems.filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="results">
      <div className="results-total">
        <div className="total-label">Total M&amp;O Funding</div>
        <div className="total-value">{currency.format(result.totalMO)}</div>
        <div className="subtotal-row">
          {Object.entries(result.subtotals).map(([key, value]) => (
            <span key={key} className="subtotal-chip">
              {key}: {currency.format(value)}
            </span>
          ))}
        </div>
      </div>

      {result.warnings.length > 0 ? (
        <div className="warnings">
          {result.warnings.map((w) => (
            <div key={w} className="warning-row">
              ⚠ {w}
            </div>
          ))}
        </div>
      ) : null}

      <div className="intermediates">
        <span>ADA_ref: {number.format(result.intermediates.ADA_ref)}</span>
        <span>ADA_reg: {number.format(result.intermediates.ADA_reg)}</span>
        <span>FTE_sped_agg: {number.format(result.intermediates.FTE_sped_agg)}</span>
        <span>FTE_cte_agg: {number.format(result.intermediates.FTE_cte_agg)}</span>
        <span>WADA: {number.format(result.intermediates.WADA)}</span>
        <span>BA_adj: {currency.format(result.intermediates.BA_adj)}</span>
        {result.intermediates.compressionFactor < 1 ? <span>Compression factor: {(result.intermediates.compressionFactor * 100).toFixed(1)}%</span> : null}
      </div>

      {bySection.map(({ section, items }) => {
        const sectionTotal = items.reduce((sum, item) => sum + item.amount, 0)
        const byCategory = new Map<string, typeof items>()
        for (const item of items) {
          const arr = byCategory.get(item.category) ?? []
          arr.push(item)
          byCategory.set(item.category, arr)
        }
        return (
          <details key={section} open className="result-section">
            <summary>
              {section} <span className="section-total">{currency.format(sectionTotal)}</span>
            </summary>
            <table>
              <tbody>
                {[...byCategory.entries()].map(([category, catItems]) => (
                  <Fragment key={category}>
                    <tr className="category-row">
                      <td colSpan={2}>{category}</td>
                    </tr>
                    {catItems.map((item) => (
                      <tr key={item.symbol} className={STEP_TAGS.has(item.costBehaviorTag) ? 'line-item step-cost' : 'line-item'}>
                        <td>
                          {item.name}
                          {STEP_TAGS.has(item.costBehaviorTag) ? <span className="tag tag-step-inline">step</span> : null}
                          {item.note ? <div className="line-note">{item.note}</div> : null}
                        </td>
                        <td className={item.amount < 0 ? 'amount negative' : 'amount'}>{currency.format(item.amount)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </details>
        )
      })}
    </div>
  )
}
