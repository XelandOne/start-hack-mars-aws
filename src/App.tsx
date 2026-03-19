import { useState } from 'react'
import './App.css'
import AgentChat from './AgentChat'
import MissionSim from './MissionSim'

type Tab = 'crops' | 'environment' | 'crew' | 'sim' | 'agent'

const crops = [
  { name: 'Lettuce', cycle: '30-45 days', yieldStr: '3-5 kg/m2', tempMin: 15, tempMax: 22, tempStress: 25, humidity: '50-70%', light: '150-250 umol/m2/s', water: 'High', role: 'Micronutrient stabilizer', calories: '~15 kcal/100g', protein: '~1.4g/100g', notes: 'Risk of bolting above 25C.' },
  { name: 'Potato', cycle: '70-120 days', yieldStr: '4-8 kg/m2', tempMin: 16, tempMax: 20, tempStress: 28, humidity: 'Moderate', light: '200-400 umol/m2/s', water: 'Moderate-High', role: 'Primary energy backbone', calories: '~77 kcal/100g', protein: '~2g/100g', notes: 'High potassium demand. Sensitive to waterlogging.' },
  { name: 'Radish', cycle: '21-30 days', yieldStr: '2-4 kg/m2', tempMin: 15, tempMax: 22, tempStress: 28, humidity: 'Moderate', light: 'Moderate', water: 'Moderate', role: 'Fast buffer', calories: '~16 kcal/100g', protein: '~0.7g/100g', notes: 'High sensitivity to water inconsistency.' },
  { name: 'Beans & Peas', cycle: '50-70 days', yieldStr: '2-4 kg/m2', tempMin: 18, tempMax: 25, tempStress: 30, humidity: 'Moderate', light: 'Moderate', water: 'Moderate', role: 'Primary protein source', calories: '~80-120 kcal/100g', protein: '5-9g/100g', notes: 'Nitrogen fixation capability.' },
  { name: 'Herbs', cycle: 'Short', yieldStr: 'Low', tempMin: 18, tempMax: 24, tempStress: 30, humidity: 'Moderate', light: 'Low-Moderate', water: 'Low', role: 'Crew morale', calories: 'Minimal', protein: 'Minimal', notes: 'Psychological well-being enhancer.' },
]

const marsEnv = [
  { label: 'External Temp', value: '-140C to +21C', status: 'danger' },
  { label: 'Atmospheric Pressure', value: '6-7 mbar', status: 'danger' },
  { label: 'CO2 Concentration', value: '95.32%', status: 'warning' },
  { label: 'Solar Irradiance', value: '~590 W/m2 (43% of Earth)', status: 'warning' },
  { label: 'Gravity', value: '3.72 m/s2 (38% of Earth)', status: 'warning' },
  { label: 'O2 Availability', value: '0.13%', status: 'danger' },
]

const crewNeeds = { calories: '~12,000 kcal/day (4 crew)', protein: '360-540 g/day', water: '8-10 L/day', mission: '450 days' }
const allocation = [
  { crop: 'Potatoes', pct: 45, color: '#c0392b' },
  { crop: 'Legumes', pct: 25, color: '#27ae60' },
  { crop: 'Leafy Greens', pct: 17, color: '#2ecc71' },
  { crop: 'Radishes & Herbs', pct: 13, color: '#f39c12' },
]

export default function App() {
  const [selected, setSelected] = useState(crops[0])
  const [activeTab, setActiveTab] = useState<Tab>('crops')

  return (
    <div className="mars-app">
      <header className="mars-header">
        <div className="header-content">
          <span className="mars-icon">M</span>
          <div><h1>Mars Greenhouse Control</h1><p>Autonomous Agriculture Management System</p></div>
          <div className="status-badge">ONLINE</div>
        </div>
      </header>
      <nav className="mars-nav">
        {(['crops', 'environment', 'crew', 'sim', 'agent'] as Tab[]).map(tab => (
          <button key={tab} className={`nav-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'crops' ? 'Crops' : tab === 'environment' ? 'Environment' : tab === 'crew' ? 'Crew Needs' : tab === 'sim' ? 'Simulation' : 'AI Agent'}
          </button>
        ))}
      </nav>
      <main className="mars-main">
        {activeTab === 'crops' && (
          <div className="crops-view">
            <div className="crop-list">
              {crops.map(c => (
                <button key={c.name} className={`crop-card ${selected.name === c.name ? 'active' : ''}`} onClick={() => setSelected(c)}>
                  <span className="crop-name">{c.name}</span>
                  <span className="crop-cycle">{c.cycle}</span>
                </button>
              ))}
            </div>
            <div className="crop-detail">
              <h2>{selected.name}</h2>
              <p className="crop-role">{selected.role}</p>
              <div className="detail-grid">
                <div className="detail-item"><span>Growth Cycle</span><strong>{selected.cycle}</strong></div>
                <div className="detail-item"><span>Yield</span><strong>{selected.yieldStr}</strong></div>
                <div className="detail-item"><span>Temp Range</span><strong>{selected.tempMin}-{selected.tempMax}C</strong></div>
                <div className="detail-item"><span>Stress Threshold</span><strong>&gt;{selected.tempStress}C</strong></div>
                <div className="detail-item"><span>Humidity</span><strong>{selected.humidity}</strong></div>
                <div className="detail-item"><span>Light</span><strong>{selected.light}</strong></div>
                <div className="detail-item"><span>Water</span><strong>{selected.water}</strong></div>
                <div className="detail-item"><span>Calories</span><strong>{selected.calories}</strong></div>
                <div className="detail-item"><span>Protein</span><strong>{selected.protein}</strong></div>
              </div>
              <div className="crop-notes">{selected.notes}</div>
            </div>
          </div>
        )}
        {activeTab === 'environment' && (
          <div className="env-view">
            <h2>Mars External Conditions</h2>
            <div className="env-grid">
              {marsEnv.map(e => (
                <div key={e.label} className={`env-card ${e.status}`}>
                  <span className="env-label">{e.label}</span>
                  <span className="env-value">{e.value}</span>
                  <span className={`env-badge ${e.status}`}>{e.status === 'danger' ? 'Critical' : 'Monitor'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'crew' && (
          <div className="crew-view">
            <h2>4-Astronaut Crew Nutritional Needs</h2>
            <div className="crew-grid">
              <div className="crew-card"><span>Daily Calories</span><strong>{crewNeeds.calories}</strong></div>
              <div className="crew-card"><span>Daily Protein</span><strong>{crewNeeds.protein}</strong></div>
              <div className="crew-card"><span>Daily Water</span><strong>{crewNeeds.water}</strong></div>
              <div className="crew-card"><span>Mission Duration</span><strong>{crewNeeds.mission}</strong></div>
            </div>
            <div className="allocation-list">
              {allocation.map(a => (
                <div key={a.crop} className="allocation-row">
                  <span className="alloc-label">{a.crop}</span>
                  <div className="alloc-bar-bg"><div className="alloc-bar" style={{ width: `${a.pct}%`, background: a.color }} /></div>
                  <span className="alloc-pct">{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'sim' && <MissionSim />}
        {activeTab === 'agent' && <AgentChat />}
      </main>
    </div>
  )
}