import { useMemo, useState } from 'react'
import './App.css'
import { DistrictInputForm } from './components/DistrictInputForm'
import { MarginalCostChart } from './components/MarginalCostChart'
import { ResultsBreakdown } from './components/ResultsBreakdown'
import { calculateFunding } from './engine/calculate'
import { buildEngineInputsFromSynthetic, defaultSyntheticProfile, type SyntheticDistrictProfile } from './engine/synthetic'

function App() {
  const [profile, setProfile] = useState<SyntheticDistrictProfile>(defaultSyntheticProfile)
  const [tab, setTab] = useState<'results' | 'chart'>('results')

  const result = useMemo(() => calculateFunding(buildEngineInputsFromSynthetic(profile)), [profile])

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Texas M&amp;O Funding Simulator</h1>
        <p>Foundation School Program Tier One + Tier Two + ASF + IMTA, for a single synthetic Texas district.</p>
      </header>
      <main className="app-main">
        <section className="panel panel-form">
          <h2>District builder</h2>
          <DistrictInputForm profile={profile} onChange={setProfile} />
        </section>
        <section className="panel panel-results">
          <div className="panel-tabs">
            <button type="button" className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>
              Funding breakdown
            </button>
            <button type="button" className={tab === 'chart' ? 'active' : ''} onClick={() => setTab('chart')}>
              Funding by district size
            </button>
          </div>
          {tab === 'results' ? <ResultsBreakdown result={result} /> : <MarginalCostChart profile={profile} />}
        </section>
      </main>
    </div>
  )
}

export default App
