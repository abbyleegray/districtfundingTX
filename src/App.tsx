import { useMemo, useState } from 'react'
import './App.css'
import { DistrictInputForm } from './components/DistrictInputForm'
import { ExpenditureBreakdown } from './components/ExpenditureBreakdown'
import { ExpenditureInputForm } from './components/ExpenditureInputForm'
import { MarginalCostChart } from './components/MarginalCostChart'
import { ResultsBreakdown } from './components/ResultsBreakdown'
import { calculateFunding } from './engine/calculate'
import { calculateExpenditures, type ExpenditureContext } from './engine/expenditure'
import { defaultExpenditureProfile, type ExpenditureProfile } from './engine/expenditureProfile'
import { buildEngineInputsFromSynthetic, defaultSyntheticProfile, type SyntheticDistrictProfile } from './engine/synthetic'

function App() {
  const [profile, setProfile] = useState<SyntheticDistrictProfile>(defaultSyntheticProfile)
  const [expenditureProfile, setExpenditureProfile] = useState<ExpenditureProfile>(defaultExpenditureProfile)
  const [tab, setTab] = useState<'results' | 'chart'>('results')
  const [headerTab, setHeaderTab] = useState<'simulator' | 'placeholder'>('simulator')

  const result = useMemo(() => calculateFunding(buildEngineInputsFromSynthetic(profile)), [profile])

  const expenditureContext: ExpenditureContext = useMemo(
    () => ({
      enrollment: profile.enrollment,
      campusCount: profile.facilities.campusCount,
      totalMileage: profile.facilities.milesRegular + profile.facilities.milesSped,
      officerCostAssumption: expenditureProfile.officerCostAssumption,
    }),
    [profile.enrollment, profile.facilities.campusCount, profile.facilities.milesRegular, profile.facilities.milesSped, expenditureProfile.officerCostAssumption],
  )
  const expenditureResult = useMemo(
    () => calculateExpenditures(expenditureContext, expenditureProfile.overrides),
    [expenditureContext, expenditureProfile.overrides],
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-tabs">
          <button type="button" className={headerTab === 'simulator' ? 'header-tab active' : 'header-tab'} onClick={() => setHeaderTab('simulator')}>
            Texas Public School Funding Simulator
          </button>
          <button type="button" className={headerTab === 'placeholder' ? 'header-tab active' : 'header-tab'} onClick={() => setHeaderTab('placeholder')}>
            Placeholder
          </button>
        </div>
        <h1>Texas Public School Funding Simulator</h1>
        <p>
          This simulator models how revenue is calculated and spent in Texas public school districts for maintenance and
          operations (i.e., salaries, curriculum, and all other day-to-day expenses).
        </p>
        <p className="header-note">
          Note: This simulator does not model "Interest and Sinking" revenue, which is used to pay bond and other
          long-term debt. The simulator will also not accurately predict public charter school revenue since the
          funding formula for charters differs.
        </p>
      </header>
      {headerTab === 'placeholder' ? (
        <main className="app-main">
          <section className="panel">
            <h2>Placeholder</h2>
            <p>Real-district budget lookup — coming in a future build.</p>
          </section>
        </main>
      ) : (
        <main className="app-main">
          <section className="panel panel-form">
            <h2>District builder</h2>
            <DistrictInputForm profile={profile} onChange={setProfile} />
            <h2 className="expenditure-heading">Expenditure builder</h2>
            <ExpenditureInputForm profile={expenditureProfile} context={expenditureContext} onChange={setExpenditureProfile} />
          </section>
          <section className="panel panel-results">
            <div className="panel-tabs">
              <button type="button" className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>
                Funding breakdown
              </button>
              <button type="button" className={tab === 'chart' ? 'viz-tab active' : 'viz-tab'} onClick={() => setTab('chart')}>
                Visual Breakdown
              </button>
            </div>
            {tab === 'results' ? (
              <>
                <ResultsBreakdown result={result} />
                <ExpenditureBreakdown result={expenditureResult} />
              </>
            ) : (
              <MarginalCostChart profile={profile} />
            )}
          </section>
        </main>
      )}
    </div>
  )
}

export default App
