import { DEFAULT_FEDERAL_RATES, calculateFederalRevenue, type FederalRevenueInputs, type FederalRevenueRates } from '../engine/federal'
import { NumberField } from './fields'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

interface Props {
  inputs: FederalRevenueInputs
  rates: FederalRevenueRates
  onRatesChange: (updater: (prev: FederalRevenueRates) => FederalRevenueRates) => void
  onImpactAidChange: (eligible: boolean) => void
}

export function FederalRevenueInputForm({ inputs, rates, onRatesChange, onImpactAidChange }: Props) {
  function set<K extends keyof FederalRevenueRates>(key: K, value: number) {
    onRatesChange((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="input-form">
      <div className="section-note tag-warning">
        Estimated, not a precise formula. Unlike TEC's self-contained weight x count formulas, Title I
        and Perkins depend on national-level data (every other district's numbers) that a standalone
        simulator can't reproduce exactly, and all three federal rates reset with annual congressional
        appropriations. Every rate below is a rough, openly-adjustable planning figure — replace it
        with your district's actual award letter when you have one.
      </div>

      <details>
        <summary>Title I, Part A (ESEA/ESSA)</summary>
        <div className="section-body">
          <div className="section-note">Aid to low-income students — reuses your Compensatory Ed economically-disadvantaged % above.</div>
          <NumberField label="$ per economically-disadvantaged student" value={rates.titleIPerPovertyPoint} unit="$" onChange={(v) => set('titleIPerPovertyPoint', v)} />
        </div>
      </details>

      <details>
        <summary>IDEA, Part B §611</summary>
        <div className="section-body">
          <div className="section-note">Federal special-education funding — reuses your Special Education FTE total from the Revenue section.</div>
          <NumberField label="$ per special-education FTE" value={rates.ideaPerSpedStudent} unit="$" onChange={(v) => set('ideaPerSpedStudent', v)} />
        </div>
      </details>

      <details>
        <summary>Perkins V</summary>
        <div className="section-body">
          <div className="section-note">Federal CTE funding — population/poverty-driven, not CTE-enrollment-driven.</div>
          <NumberField label="$ per economically-disadvantaged student" value={rates.perkinsPerPovertyPoint} unit="$" onChange={(v) => set('perkinsPerPovertyPoint', v)} />
        </div>
      </details>

      <details>
        <summary>Impact Aid</summary>
        <div className="section-body">
          <label className="field">
            <span className="field-label">
              <input type="checkbox" checked={inputs.impactAidEligible} onChange={(e) => onImpactAidChange(e.target.checked)} /> Is your district
              adjacent to significant federal/military land?
            </span>
          </label>
          <NumberField label="Flat bonus if eligible" value={rates.impactAidFlatBonus} unit="$" onChange={(v) => set('impactAidFlatBonus', v)} />
        </div>
      </details>
    </div>
  )
}

export function FederalRevenueBreakdown({ inputs, rates }: { inputs: FederalRevenueInputs; rates: FederalRevenueRates }) {
  const result = calculateFederalRevenue(inputs, rates)
  return (
    <div className="results">
      <div className="results-total federal-total">
        <div className="total-label">Total Federal Revenue (Estimated)</div>
        <div className="total-value">{currency.format(result.total)}</div>
      </div>
      <details className="result-section expenditure-section">
        <summary>
          Federal revenue breakdown <span className="section-total">{currency.format(result.total)}</span>
        </summary>
        <table>
          <tbody>
            <tr className="line-item">
              <td>Title I, Part A</td>
              <td className="amount">{currency.format(result.titleI)}</td>
            </tr>
            <tr className="line-item">
              <td>IDEA, Part B §611</td>
              <td className="amount">{currency.format(result.idea)}</td>
            </tr>
            <tr className="line-item">
              <td>Perkins V</td>
              <td className="amount">{currency.format(result.perkins)}</td>
            </tr>
            <tr className="line-item">
              <td>Impact Aid</td>
              <td className="amount">{currency.format(result.impactAid)}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  )
}

export { DEFAULT_FEDERAL_RATES }
