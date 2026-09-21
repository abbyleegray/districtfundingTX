import type { SyntheticDistrictProfile } from '../engine/synthetic'
import { AttendanceOverride, NumberField, PercentSlider } from './fields'

interface Props {
  profile: SyntheticDistrictProfile
  onChange: (updater: (prev: SyntheticDistrictProfile) => SyntheticDistrictProfile) => void
}

export function DistrictInputForm({ profile, onChange }: Props) {
  function set<K extends keyof SyntheticDistrictProfile>(key: K, value: SyntheticDistrictProfile[K]) {
    onChange((prev) => ({ ...prev, [key]: value }))
  }
  function setIn<K extends keyof SyntheticDistrictProfile>(
    key: K,
    patch: Partial<Extract<SyntheticDistrictProfile[K], object>>,
  ) {
    onChange((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...patch } }))
  }

  const { districtAttendanceRatePct: districtRate } = profile

  return (
    <div className="input-form">
      <details open>
        <summary>District basics</summary>
        <div className="section-body">
          <NumberField label="Total enrollment" value={profile.enrollment} min={0} step={50} unit="students" onChange={(v) => set('enrollment', v)} />
          <PercentSlider
            label="District-wide attendance rate"
            value={districtRate}
            onChange={(v) => set('districtAttendanceRatePct', v)}
            help={`Implied district ADA_ref ≈ ${Math.round((profile.enrollment * districtRate) / 100).toLocaleString()}`}
          />
        </div>
      </details>

      <details>
        <summary>Special Education <span className="tag tag-carveout">carve-out — subtracts from ADA_reg</span></summary>
        <div className="section-body">
          <div className="model-toggle">
            <label>
              <input
                type="radio"
                checked={profile.specialEd.model === 'legacy'}
                onChange={() => setIn('specialEd', { model: 'legacy' })}
              />
              Legacy Model (current law through SY 2025-26)
            </label>
            <label>
              <input
                type="radio"
                checked={profile.specialEd.model === 'newExploratory'}
                onChange={() => setIn('specialEd', { model: 'newExploratory' })}
              />
              New Model — Exploratory (HB2/SB568 service intensity, illustrative weights only)
            </label>
          </div>
          <AttendanceOverride value={profile.specialEd.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('specialEd', { attendanceRatePct: v })} />

          {profile.specialEd.model === 'legacy' ? (
            <>
              <p className="section-note">9 instructional-arrangement FTEs, each as % of enrollment. Shares a 100% cap with CTE below.</p>
              {(
                [
                  ['homebound', 'Homebound'],
                  ['hospital', 'Hospital Class'],
                  ['speech', 'Speech Therapy'],
                  ['resource', 'Resource Room'],
                  ['selfContained', 'Self-Contained'],
                  ['offCampus', 'Off Home Campus'],
                  ['vocAdj', 'Vocational Adjustment Class'],
                  ['stateSchools', 'State Schools'],
                  ['residential', 'Residential Care and Treatment'],
                ] as const
              ).map(([key, label]) => (
                <PercentSlider
                  key={key}
                  label={label}
                  value={profile.specialEd.legacyPct[key]}
                  max={20}
                  onChange={(v) => setIn('specialEd', { legacyPct: { ...profile.specialEd.legacyPct, [key]: v } })}
                />
              ))}
              <p className="section-note">Additive-only ADA-based lines (do not reduce ADA_reg):</p>
              <PercentSlider label="Non-Public Contracts" value={profile.specialEd.legacyPct.nonpublic} max={20} onChange={(v) => setIn('specialEd', { legacyPct: { ...profile.specialEd.legacyPct, nonpublic: v } })} />
              <PercentSlider label="Mainstream" value={profile.specialEd.legacyPct.mainstream} max={20} onChange={(v) => setIn('specialEd', { legacyPct: { ...profile.specialEd.legacyPct, mainstream: v } })} />
              <NumberField label="ECI Set-Aside deduction" value={profile.specialEd.eciSetAsideDollars} unit="$" onChange={(v) => setIn('specialEd', { eciSetAsideDollars: v })} />
            </>
          ) : (
            <>
              <p className="section-note tag-warning">
                Structurally real (7 tiers, tier 7 = residential placement) but no dollar weight is finalized in statute. Weights default to the
                2022 SpEd Funding Commission's never-enacted draft ranges — illustrative only, not current law.
              </p>
              {(
                [
                  ['tier1', 'Tier 1 (least intensive)'],
                  ['tier2', 'Tier 2'],
                  ['tier3', 'Tier 3'],
                  ['tier4', 'Tier 4'],
                  ['tier5', 'Tier 5'],
                  ['tier6', 'Tier 6'],
                  ['tier7Residential', 'Tier 7 (residential placement)'],
                ] as const
              ).map(([key, label]) => (
                <div className="tier-row" key={key}>
                  <PercentSlider
                    label={`${label} — population`}
                    value={profile.specialEd.newModelPct[key]}
                    max={20}
                    onChange={(v) => setIn('specialEd', { newModelPct: { ...profile.specialEd.newModelPct, [key]: v } })}
                  />
                  <NumberField
                    label={`${label} — $ weight (x BA_adj)`}
                    value={profile.specialEd.newModelWeights[key]}
                    step={0.05}
                    onChange={(v) => setIn('specialEd', { newModelWeights: { ...profile.specialEd.newModelWeights, [key]: v } })}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </details>

      <details>
        <summary>CTE <span className="tag tag-carveout">carve-out — subtracts from ADA_reg</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.cte.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('cte', { attendanceRatePct: v })} />
          <PercentSlider label="Not in approved program" value={profile.cte.tier1Pct} max={30} onChange={(v) => setIn('cte', { tier1Pct: v })} />
          <PercentSlider label="Approved program, levels 1-2" value={profile.cte.tier2Pct} max={30} onChange={(v) => setIn('cte', { tier2Pct: v })} />
          <PercentSlider label="Approved program, levels 3-4" value={profile.cte.tier3Pct} max={30} onChange={(v) => setIn('cte', { tier3Pct: v })} />
        </div>
      </details>

      <details>
        <summary>Dyslexia <span className="tag tag-overlay">overlay — enrollment-based, no attendance multiplier</span></summary>
        <div className="section-body">
          <PercentSlider label="Non-Special-Ed (PIC 37)" value={profile.dyslexia.pic37Pct} onChange={(v) => setIn('dyslexia', { pic37Pct: v })} />
          <PercentSlider label="Special-Ed (PIC 43)" value={profile.dyslexia.pic43Pct} onChange={(v) => setIn('dyslexia', { pic43Pct: v })} />
        </div>
      </details>

      <details>
        <summary>Compensatory Ed <span className="tag tag-overlay">overlay — enrollment-based</span></summary>
        <div className="section-body">
          <PercentSlider
            label="Economically disadvantaged concentration"
            value={profile.compEd.concentrationPct}
            onChange={(v) => setIn('compEd', { concentrationPct: v })}
            help="Drives both the SCE population share and its 0.225–0.275 sliding weight."
          />
          <PercentSlider label="Pregnancy-related" value={profile.compEd.pregnantPct} max={10} onChange={(v) => setIn('compEd', { pregnantPct: v })} />
          <PercentSlider label="Residential treatment (non ed-disadv.)" value={profile.compEd.residTreatmentPct} max={10} onChange={(v) => setIn('compEd', { residTreatmentPct: v })} />
        </div>
      </details>

      <details>
        <summary>Bilingual / ESL <span className="tag tag-overlay">overlay — ADA-based</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.bilingual.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('bilingual', { attendanceRatePct: v })} />
          <PercentSlider label="Emergent Bilingual (base)" value={profile.bilingual.ebBasePct} max={60} onChange={(v) => setIn('bilingual', { ebBasePct: v })} />
          <PercentSlider label="EB Dual Language" value={profile.bilingual.ebDlPct} max={60} onChange={(v) => setIn('bilingual', { ebDlPct: v })} />
          <PercentSlider label="Non-EB Dual Language (two-way)" value={profile.bilingual.nonEbDlPct} max={60} onChange={(v) => setIn('bilingual', { nonEbDlPct: v })} />
        </div>
      </details>

      <details>
        <summary>Early Education <span className="tag tag-overlay">overlay — ADA-based</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.earlyEd.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('earlyEd', { attendanceRatePct: v })} />
          <PercentSlider label="K-3 pre-pre-K (Ed-Disadv + EB)" value={profile.earlyEd.k3PrePrekPct} max={40} onChange={(v) => setIn('earlyEd', { k3PrePrekPct: v })} />
          <PercentSlider
            label="Full-day Pre-K (carve-out of the pool above)"
            value={profile.earlyEd.prekPct}
            max={40}
            onChange={(v) => setIn('earlyEd', { prekPct: v })}
            help="Zero-sum against the K-3 pre-pre-K line for the same students — don't double count."
          />
          <PercentSlider label="K-3 all students" value={profile.earlyEd.k3AllPct} max={100} onChange={(v) => setIn('earlyEd', { k3AllPct: v })} />
        </div>
      </details>

      <details>
        <summary>Gifted &amp; Talented <span className="tag tag-overlay">overlay — ADA-based, capped at 5%</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.giftedTalented.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('giftedTalented', { attendanceRatePct: v })} />
          <PercentSlider label="G/T identified" value={profile.giftedTalented.identifiedPct} max={20} onChange={(v) => setIn('giftedTalented', { identifiedPct: v })} />
          <NumberField label="Performance Standards / MATHCOUNTS set-aside" value={profile.specialEd.gtSetAsideDollars} unit="$" onChange={(v) => setIn('specialEd', { gtSetAsideDollars: v })} />
        </div>
      </details>

      <details>
        <summary>R-PEP <span className="tag tag-overlay">overlay — small/rural CTE partnership, ADA-based</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.rpep.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('rpep', { attendanceRatePct: v })} />
          <PercentSlider label="Ed-Disadvantaged" value={profile.rpep.edDisadvPct} max={30} onChange={(v) => setIn('rpep', { edDisadvPct: v })} />
          <PercentSlider label="Non-Ed-Disadvantaged" value={profile.rpep.nonEdDisadvPct} max={30} onChange={(v) => setIn('rpep', { nonEdDisadvPct: v })} />
          <NumberField label="R-PEP graduates (Ed-Disadv.)" value={profile.rpep.gradEd} onChange={(v) => setIn('rpep', { gradEd: v })} />
          <NumberField label="R-PEP graduates (Not Ed-Disadv.)" value={profile.rpep.gradNoted} onChange={(v) => setIn('rpep', { gradNoted: v })} />
          <NumberField label="R-PEP graduates (SpEd)" value={profile.rpep.gradSped} onChange={(v) => setIn('rpep', { gradSped: v })} />
        </div>
      </details>

      <details>
        <summary>Dropout Recovery &amp; Residential Placement <span className="tag tag-overlay">overlay — ADA-based</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.dropoutRecovery.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('dropoutRecovery', { attendanceRatePct: v })} />
          <PercentSlider label="Dropout Recovery School" value={profile.dropoutRecovery.pct} max={10} onChange={(v) => setIn('dropoutRecovery', { pct: v })} />
          <PercentSlider label="Residential Placement Facility" value={profile.residentialPlacement.pct} max={10} onChange={(v) => setIn('residentialPlacement', { pct: v })} />
        </div>
      </details>

      <details>
        <summary>Fast Growth &amp; Support Staff Retention <span className="tag tag-overlay">overlay</span></summary>
        <div className="section-body">
          <AttendanceOverride value={profile.fastGrowth.attendanceRatePct} districtDefault={districtRate} onChange={(v) => setIn('fastGrowth', { attendanceRatePct: v })} />
          <PercentSlider label="Fast Growth eligible" value={profile.fastGrowth.eligiblePct} max={30} onChange={(v) => setIn('fastGrowth', { eligiblePct: v })} />
          <PercentSlider label="Virtual / non-resident (excluded from retention base)" value={profile.supportStaffRetention.virtualNonResPct} max={30} onChange={(v) => setIn('supportStaffRetention', { virtualNonResPct: v })} />
        </div>
      </details>

      <details>
        <summary>CCMR graduation outcomes</summary>
        <div className="section-body">
          <NumberField label="Ed-Disadvantaged graduates" value={profile.graduates.edDisadv} onChange={(v) => setIn('graduates', { edDisadv: v })} />
          <NumberField label="Not Ed-Disadvantaged graduates" value={profile.graduates.notEdDisadv} onChange={(v) => setIn('graduates', { notEdDisadv: v })} />
          <NumberField label="Special Education graduates" value={profile.graduates.sped} onChange={(v) => setIn('graduates', { sped: v })} />
        </div>
      </details>

      <details>
        <summary>Staffing allotments (TIA, Mentor, FIIE, Teacher Retention)</summary>
        <div className="section-body">
          <NumberField label="TIA — Master Teachers" value={profile.staffing.tiaMaster} onChange={(v) => setIn('staffing', { tiaMaster: v })} />
          <NumberField label="TIA — Exemplary Teachers" value={profile.staffing.tiaExemplary} onChange={(v) => setIn('staffing', { tiaExemplary: v })} />
          <NumberField label="TIA — Recognized Teachers" value={profile.staffing.tiaRecognized} onChange={(v) => setIn('staffing', { tiaRecognized: v })} />
          <NumberField label="Mentor pairs" value={profile.staffing.mentorPairs} onChange={(v) => setIn('staffing', { mentorPairs: v })} />
          <NumberField label="Mentor $ per pair (unpublished — enter if known)" value={profile.staffing.mentorRate} unit="$" onChange={(v) => setIn('staffing', { mentorRate: v })} />
          <NumberField label="FIIE evaluations completed" value={profile.staffing.fiieEvaluations} onChange={(v) => setIn('staffing', { fiieEvaluations: v })} />
          <NumberField
            label="Retention-eligible teachers, 3-4 yrs exp."
            value={profile.staffing.tra3to4yrs}
            onChange={(v) => setIn('staffing', { tra3to4yrs: v })}
            help={`District enrollment ${profile.enrollment >= 5000 ? '≥' : '<'} 5,000 → ${profile.enrollment >= 5000 ? 'large' : 'small'}-district rate applies.`}
          />
          <NumberField label="Retention-eligible teachers, 5+ yrs exp." value={profile.staffing.tra5plusYrs} onChange={(v) => setIn('staffing', { tra5plusYrs: v })} />
        </div>
      </details>

      <details>
        <summary>Facilities <span className="tag tag-step">step costs — School Safety per-campus</span></summary>
        <div className="section-body">
          <NumberField label="Campus count" value={profile.facilities.campusCount} onChange={(v) => setIn('facilities', { campusCount: v })} help="Each campus adds $33,540 flat — a lumpy step, not a smooth per-student line." />
          <NumberField label="Regular route mileage" value={profile.facilities.milesRegular} unit="miles/yr" onChange={(v) => setIn('facilities', { milesRegular: v })} />
          <NumberField label="SpEd route mileage" value={profile.facilities.milesSped} unit="miles/yr" onChange={(v) => setIn('facilities', { milesSped: v })} />
          <NumberField label="NIFA (facility-triggered, one-time)" value={profile.facilities.nifaDollars} unit="$" onChange={(v) => setIn('facilities', { nifaDollars: v })} />
        </div>
      </details>

      <details>
        <summary>RDSPD, ASF &amp; IMTA</summary>
        <div className="section-body">
          <NumberField label="RDSPD student count" value={profile.rdspd.studentCount} onChange={(v) => setIn('rdspd', { studentCount: v })} />
          <NumberField label="ASF prior-year ADA" value={profile.asf.priorYearAda} onChange={(v) => setIn('asf', { priorYearAda: v })} help="Different figure than ADA_ref — a different year." />
          <PercentSlider label="IMTA — Emergent Bilingual share of enrollment" value={profile.imta.emergentBilingualPct} onChange={(v) => setIn('imta', { emergentBilingualPct: v })} />
        </div>
      </details>

      <details>
        <summary>Property value &amp; tax rate (Tier Two inputs)</summary>
        <div className="section-body">
          <NumberField label="Prior-year certified property value" value={profile.propertyTax.priorYearPropertyValue} unit="$" step={1_000_000} onChange={(v) => setIn('propertyTax', { priorYearPropertyValue: v })} />
          <NumberField label="Adopted M&O tax rate" value={profile.propertyTax.adoptedTaxRate} step={0.0001} onChange={(v) => setIn('propertyTax', { adoptedTaxRate: v })} />
          <NumberField label="Tier One M&O tax rate (compressed)" value={profile.propertyTax.tier1TaxRate} step={0.0001} onChange={(v) => setIn('propertyTax', { tier1TaxRate: v })} />
          <NumberField label="IFA lease-purchase adjustment" value={profile.propertyTax.ifaLeasePurchaseAdj} unit="$" onChange={(v) => setIn('propertyTax', { ifaLeasePurchaseAdj: v })} />
          <NumberField label="TIF payment adjustment" value={profile.propertyTax.tifPaymentAdj} unit="$" onChange={(v) => setIn('propertyTax', { tifPaymentAdj: v })} />
          <NumberField label="Sec. 26.1115(c) tax refund add-back" value={profile.propertyTax.taxRefundAdj} unit="$" onChange={(v) => setIn('propertyTax', { taxRefundAdj: v })} />
        </div>
      </details>
    </div>
  )
}
