import type { ExpenditureResult } from '../engine/expenditure'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

interface Props {
  result: ExpenditureResult
}

export function ExpenditureBreakdown({ result }: Props) {
  const staffByFunc = new Map(result.staffingPrintouts.map((p) => [p.category.func, p]))

  return (
    <div className="results expenditure-results">
      <div className="results-total expenditure-total">
        <div className="total-label">Total Expenditures (estimated)</div>
        <div className="total-value">{currency.format(result.total)}</div>
        {result.studentsPerTeacher != null ? (
          <div className="subtotal-row">
            <span className="subtotal-chip">Students per teacher: {result.studentsPerTeacher.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      <details className="result-section expenditure-section">
        <summary>
          Comprehensive expenditure breakdown <span className="section-total">{currency.format(result.total)}</span>
        </summary>
        <table>
          <tbody>
            {result.lines.map((line) => {
              const staff = staffByFunc.get(line.category.func)
              return (
                <tr key={line.category.func} className="line-item">
                  <td>
                    {line.category.label}
                    <div className="line-note">{line.methodologyNote}</div>
                    {staff ? (
                      <div className="line-note">
                        {line.category.staffingLabel}: {number.format(staff.fteCount)} FTE, avg. salary {currency.format(staff.avgSalary)}
                        {staff.studentsPerStaff ? ` (${staff.studentsPerStaff.toFixed(1)} students/staff)` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td className="amount">{currency.format(line.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </details>
    </div>
  )
}
