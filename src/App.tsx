import { useState, useEffect } from "react"
import "./App.css"
import AgentChat from "./AgentChat"
import MissionSim from "./MissionSim"

type Tab = "dashboard" | "sim"

interface SensorAgent {
  id: string; label: string; unit: string; base: number; range: number
  drift: number; current: number; status: "ok" | "warn" | "crit"; target: string
}

function makeSensors(): SensorAgent[] {
  return [
    { id: "temp",     label: "Temperature",  unit: "C",         base: 19.5, range: 0.4,  drift: 0, current: 19.5, status: "ok",   target: "18 - 22 C" },
    { id: "humid",    label: "Humidity",     unit: "%",         base: 63.0, range: 1.5,  drift: 0, current: 63.0, status: "ok",   target: "55 - 70 %" },
    { id: "co2",      label: "CO2 Level",    unit: "ppm",       base: 1240, range: 15,   drift: 0, current: 1240, status: "ok",   target: "1000 - 1500 ppm" },
    { id: "par",      label: "Light PAR",    unit: "umol/m2/s", base: 218,  range: 5,    drift: 0, current: 218,  status: "ok",   target: "150 - 250" },
    { id: "ph",       label: "Water pH",     unit: "pH",        base: 6.10, range: 0.05, drift: 0, current: 6.10, status: "ok",   target: "5.8 - 6.5 pH" },
    { id: "power",    label: "Power Usage",  unit: "kW",        base: 4.20, range: 0.15, drift: 0, current: 4.20, status: "warn", target: "3.5 - 5.0 kW" },
    { id: "nutrient", label: "Nutrient EC",  unit: "mS/cm",     base: 2.10, range: 0.08, drift: 0, current: 2.10, status: "ok",   target: "1.8 - 2.4 mS/cm" },
    { id: "o2",       label: "O2 Level",     unit: "%",         base: 20.9, range: 0.1,  drift: 0, current: 20.9, status: "ok",   target: "20.5 - 21.5 %" },
  ]
}

function tickSensors(sensors: SensorAgent[]): SensorAgent[] {
  return sensors.map(s => {
    const noise = (Math.random() + Math.random() + Math.random() - 1.5) * s.range * 0.4
    const newDrift = s.drift * 0.92 + noise * 0.08
    const raw = s.base + newDrift + noise
    const decimals = (s.unit === "pH" || s.unit === "mS/cm") ? 2 : 1
    const val = parseFloat(raw.toFixed(decimals))
    const dev = Math.abs(raw - s.base) / s.range
    const status: "ok" | "warn" | "crit" = dev > 3.5 ? "crit" : dev > 2.0 ? "warn" : "ok"
    return { ...s, current: val, drift: newDrift, status }
  })
}

function fmtSensor(s: SensorAgent): string {
  const decimals = (s.unit === "pH" || s.unit === "mS/cm") ? 2 : 1
  return s.current.toFixed(decimals)
}

const decisions = [
  { text: "Increased LED intensity in Zone B by 12% - lettuce showing suboptimal PAR absorption", type: "ok", service: "Bedrock AgentCore", time: "2 min ago" },
  { text: "Nutrient solution pH adjusted from 6.4 to 6.1 - potato zone nitrogen uptake optimized", type: "ok", service: "Bedrock AgentCore", time: "18 min ago" },
  { text: "Water recycling efficiency dropped to 81% - pump anomaly flagged", type: "warn", service: "Lookout for Equipment", time: "34 min ago" },
  { text: "SageMaker forecast: lettuce yield +8% above baseline this cycle", type: "info", service: "SageMaker", time: "1h ago" },
]

const anomalies = [
  { text: "Water pump P-02: vibration pattern normal", status: "ok" },
  { text: "LED array Zone B: slight power fluctuation detected", status: "warn" },
  { text: "CO2 injector: operating within parameters", status: "ok" },
  { text: "Nutrient dosing pump: flow rate nominal", status: "ok" },
]

const blockLog = [
  { hash: "0x4f2a...c891", action: "Agent adjusted Zone B light intensity", time: "02:14" },
  { hash: "0x8b1e...f203", action: "pH correction applied - potato zone", time: "01:58" },
  { hash: "0x2d9c...a445", action: "Crop allocation rebalanced by AgentCore", time: "01:22" },
  { hash: "0xf7a3...b667", action: "Mission day 127 snapshot stored to S3", time: "00:00" },
]

// Static mission snapshot data (Sol 127)
const MISSION_STORAGE = {
  totalKcal: 187400,
  pantryDays: 15,
  capacityPct: 17,
  byCrop: [
    { name: "Potato",  emoji: "🥔", kg: 312, pct: 58, color: "#c0392b" },
    { name: "Beans",   emoji: "🫘", kg: 124, pct: 23, color: "#f39c12" },
    { name: "Lettuce", emoji: "🥬", kg: 68,  pct: 13, color: "#27ae60" },
    { name: "Radish",  emoji: "🌱", kg: 22,  pct: 4,  color: "#e67e22" },
    { name: "Herbs",   emoji: "🌿", kg: 11,  pct: 2,  color: "#1abc9c" },
  ],
}

const NEAR_HARVEST = [
  { name: "Radish",  emoji: "🌱", cells: 18, pct: 94, daysLeft: 2,  color: "#e67e22" },
  { name: "Lettuce", emoji: "🥬", cells: 32, pct: 88, daysLeft: 4,  color: "#27ae60" },
  { name: "Herbs",   emoji: "🌿", cells: 9,  pct: 83, daysLeft: 5,  color: "#1abc9c" },
]

const AGENT_API = 'http://127.0.0.1:8000'

function MissionOverview() {
  const [briefing, setBriefing] = useState<{
    assessment: string
    risks: { label: string; detail: string; severity: string }[]
    todos: { priority: number; action: string; detail: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pantryColor = MISSION_STORAGE.pantryDays >= 14 ? "#27ae60"
    : MISSION_STORAGE.pantryDays >= 5 ? "#f39c12" : "#c0392b"
  const supplyStatus = MISSION_STORAGE.pantryDays >= 14
    ? { label: "Food Supply Sorted", color: "#27ae60", icon: "✓" }
    : MISSION_STORAGE.pantryDays >= 5
    ? { label: "Reserves Running Low", color: "#f39c12", icon: "⚠" }
    : { label: "Food Supply Critical", color: "#c0392b", icon: "✕" }

  async function requestBriefing() {
    setLoading(true)
    setError(null)
    setBriefing(null)
    const prompt = `You are the Mars greenhouse AI. Analyse this mission snapshot and respond with ONLY a single JSON object — no markdown, no extra text.

DATA: Sol 127/450 | Mars | 4 crew | 500m² greenhouse | Storage: 187k kcal (15d supply, 17% capacity) | Potato 312kg, Beans 124kg, Lettuce 68kg, Radish 22kg, Herbs 11kg | Allocation: Potato 45%, Beans 25%, Lettuce 17%, Radish 8%, Herbs 5% | Near harvest: Radish 94% (2d), Lettuce 88% (4d), Herbs 83% (5d) | Output: 3240 kcal/crew/day, 94g protein/crew/day | Cells: 187/200 active, 13 failed | Sensors: all OK except power 4.2kW (elevated) | Anomalies: LED Zone B power fluctuation, water recycling at 81% (expected 88%)

Respond with this exact JSON structure:
{"assessment":"2-3 sentence overall status","risks":[{"label":"short label","detail":"one sentence","severity":"high|medium|low"},{"label":"...","detail":"...","severity":"..."},{"label":"...","detail":"...","severity":"..."}],"todos":[{"priority":1,"action":"short action title","detail":"one sentence"},{"priority":2,"action":"...","detail":"..."},{"priority":3,"action":"...","detail":"..."},{"priority":4,"action":"...","detail":"..."}]}`

    try {
      const res = await fetch(`${AGENT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
      const text: string = data.response ?? ''
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('No JSON in response')
      setBriefing(JSON.parse(text.slice(start, end + 1)))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('fetch') || msg.includes('Failed') ? 'Agent offline — is it running on port 8000?' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dash-card full mission-overview-card">
      <h3>
        Mission Overview — Sol 127
        <span className="mission-ov-status" style={{ color: supplyStatus.color, borderColor: supplyStatus.color + "44", background: supplyStatus.color + "11" }}>
          {supplyStatus.icon} {supplyStatus.label}
        </span>
        <button
          className="mission-briefing-btn"
          onClick={requestBriefing}
          disabled={loading}
        >
          {loading ? 'Analysing...' : 'AI Mission Briefing'}
        </button>
      </h3>
      <div className="mission-ov-grid">

        {/* Storage Allocations */}
        <div className="mission-ov-section">
          <div className="mission-ov-section-title">Storage Allocations</div>
          <div className="mission-ov-storage-header">
            <span className="mission-ov-big" style={{ color: pantryColor }}>
              {(MISSION_STORAGE.totalKcal / 1000).toFixed(0)}k kcal
            </span>
            <span className="mission-ov-sub" style={{ color: pantryColor }}>
              ~{MISSION_STORAGE.pantryDays}d supply
            </span>
          </div>
          <div className="mission-ov-bar-bg">
            <div className="mission-ov-bar-fill" style={{ width: `${MISSION_STORAGE.capacityPct}%`, background: pantryColor }} />
          </div>
          <div className="mission-ov-cap">{MISSION_STORAGE.capacityPct}% of 90-day capacity</div>
          <div className="mission-ov-crop-list">
            {MISSION_STORAGE.byCrop.map(c => (
              <div key={c.name} className="mission-ov-crop-row">
                <span className="mission-ov-crop-dot" style={{ background: c.color }} />
                <span className="mission-ov-crop-name">{c.emoji} {c.name}</span>
                <div className="mission-ov-crop-bar-bg">
                  <div className="mission-ov-crop-bar-fill" style={{ width: `${c.pct}%`, background: c.color + "88" }} />
                </div>
                <span className="mission-ov-crop-kg" style={{ color: c.color }}>{c.kg}kg</span>
              </div>
            ))}
          </div>
        </div>

        {/* Near Harvest */}
        <div className="mission-ov-section">
          <div className="mission-ov-section-title">Crops Near Harvest</div>
          <div className="mission-ov-harvest-list">
            {NEAR_HARVEST.map(c => (
              <div key={c.name} className="mission-ov-harvest-row">
                <div className="mission-ov-harvest-top">
                  <span className="mission-ov-crop-dot" style={{ background: c.color }} />
                  <span className="mission-ov-harvest-name">{c.emoji} {c.name}</span>
                  <span className="mission-ov-harvest-badge" style={{ color: c.color, borderColor: c.color + "55", background: c.color + "11" }}>
                    {c.cells} cells · {c.daysLeft}d left
                  </span>
                </div>
                <div className="mission-ov-harvest-bar-bg">
                  <div className="mission-ov-harvest-bar-fill" style={{ width: `${c.pct}%`, background: c.color + "99" }} />
                  <span className="mission-ov-harvest-pct" style={{ color: c.color }}>{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Status */}
        <div className="mission-ov-section">
          <div className="mission-ov-section-title">Quick Status</div>
          <div className="mission-ov-status-list">
            <div className="mission-ov-stat">
              <span className="mission-ov-stat-label">Daily Calorie Output</span>
              <span className="mission-ov-stat-val" style={{ color: "#27ae60" }}>3,240 kcal/crew</span>
            </div>
            <div className="mission-ov-stat">
              <span className="mission-ov-stat-label">Protein per Crew</span>
              <span className="mission-ov-stat-val" style={{ color: "#27ae60" }}>94g / day</span>
            </div>
            <div className="mission-ov-stat">
              <span className="mission-ov-stat-label">Active Crop Cells</span>
              <span className="mission-ov-stat-val" style={{ color: "#ccc" }}>187 / 200</span>
            </div>
            <div className="mission-ov-stat">
              <span className="mission-ov-stat-label">Failed Cells</span>
              <span className="mission-ov-stat-val" style={{ color: "#f39c12" }}>13 — replanting</span>
            </div>
            <div className="mission-ov-stat">
              <span className="mission-ov-stat-label">Next Harvest</span>
              <span className="mission-ov-stat-val" style={{ color: "#e67e22" }}>Radish in ~2 sols</span>
            </div>
            <div className="mission-ov-stat">
              <span className="mission-ov-stat-label">Mission Progress</span>
              <span className="mission-ov-stat-val" style={{ color: "#3498db" }}>28% (Sol 127/450)</span>
            </div>
          </div>
        </div>

      </div>

      {/* AI Briefing Response */}
      {(briefing || loading || error) && (
        <div className="mission-briefing-panel">
          {loading && <div className="mission-briefing-loading"><span className="briefing-pulse" />Analysing mission data...</div>}
          {error && <div className="mission-briefing-error">{error}</div>}
          {briefing && (
            <div className="mission-briefing-sections">
              <div className="mbf-section">
                <div className="mbf-section-title">Situation Assessment</div>
                <p className="mbf-assessment">{briefing.assessment}</p>
              </div>
              <div className="mbf-section">
                <div className="mbf-section-title">Risks to Monitor</div>
                <div className="mbf-risks">
                  {briefing.risks.map((r, i) => (
                    <div key={i} className="mbf-risk-row">
                      <span className={`mbf-severity mbf-sev-${r.severity}`}>{r.severity}</span>
                      <div className="mbf-risk-content">
                        <span className="mbf-risk-label">{r.label}</span>
                        <span className="mbf-risk-detail">{r.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mbf-section">
                <div className="mbf-section-title">Upcoming To-Dos</div>
                <div className="mbf-todos">
                  {briefing.todos.map((t) => (
                    <div key={t.priority} className="mbf-todo-row">
                      <span className="mbf-todo-num">{t.priority}</span>
                      <div className="mbf-todo-content">
                        <span className="mbf-todo-action">{t.action}</span>
                        <span className="mbf-todo-detail">{t.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CROP_INFO = [
  { name: "Lettuce", cycle: "30-45 days", yieldStr: "3-5 kg/m2", tempMin: 15, tempMax: 22, tempStress: 25, humidity: "50-70%", light: "150-250 umol/m2/s", water: "High", role: "Micronutrient stabilizer", calories: "~15 kcal/100g", protein: "~1.4g/100g", notes: "Risk of bolting above 25C.", forecast: { next: "4.3 kg/m2", conf: "91%", rec: "Maintain current light schedule. Increase N by 5%." }, color: "#27ae60", growthPct: 65 },
  { name: "Potato",  cycle: "70-120 days", yieldStr: "4-8 kg/m2", tempMin: 16, tempMax: 20, tempStress: 28, humidity: "Moderate", light: "200-400 umol/m2/s", water: "Moderate-High", role: "Primary energy backbone", calories: "~77 kcal/100g", protein: "~2g/100g", notes: "High potassium demand. Sensitive to waterlogging.", forecast: { next: "6.8 kg/m2", conf: "87%", rec: "Reduce irrigation by 8%. Potassium levels optimal." }, color: "#c0392b", growthPct: 78 },
  { name: "Radish",  cycle: "21-30 days", yieldStr: "2-4 kg/m2", tempMin: 15, tempMax: 22, tempStress: 28, humidity: "Moderate", light: "Moderate", water: "Moderate", role: "Fast buffer", calories: "~16 kcal/100g", protein: "~0.7g/100g", notes: "High sensitivity to water inconsistency.", forecast: { next: "3.1 kg/m2", conf: "83%", rec: "Increase watering consistency. Yield below baseline." }, color: "#e67e22", growthPct: 90 },
  { name: "Beans",   cycle: "50-70 days", yieldStr: "2-4 kg/m2", tempMin: 18, tempMax: 25, tempStress: 30, humidity: "Moderate", light: "Moderate", water: "Moderate", role: "Primary protein source", calories: "~80-120 kcal/100g", protein: "5-9g/100g", notes: "Nitrogen fixation capability.", forecast: { next: "2.9 kg/m2", conf: "79%", rec: "Extend photoperiod by 1h. Flowering stage needs support." }, color: "#f39c12", growthPct: 52 },
  { name: "Herbs",   cycle: "Short", yieldStr: "Low", tempMin: 18, tempMax: 24, tempStress: 30, humidity: "Moderate", light: "Low-Moderate", water: "Low", role: "Crew morale", calories: "Minimal", protein: "Minimal", notes: "Psychological well-being enhancer.", forecast: { next: "1.2 kg/m2", conf: "94%", rec: "No changes needed. Performing above average." }, color: "#1abc9c", growthPct: 71 },
]

type CropDetail = typeof CROP_INFO[0] | null

function CropDetailPanel({ crop, onClose }: { crop: NonNullable<CropDetail>; onClose: () => void }) {
  return (
    <div className="crop-detail-overlay" onClick={onClose}>
      <div className="crop-detail-panel" onClick={e => e.stopPropagation()}>
        <button className="crop-detail-close" onClick={onClose}>close</button>
        <h2 style={{ marginBottom: 4 }}>{crop.name}</h2>
        <p className="crop-role">{crop.role}</p>
        <div className="detail-grid">
          <div className="detail-item"><span>Growth Cycle</span><strong>{crop.cycle}</strong></div>
          <div className="detail-item"><span>Yield</span><strong>{crop.yieldStr}</strong></div>
          <div className="detail-item"><span>Temp Range</span><strong>{crop.tempMin}-{crop.tempMax}C</strong></div>
          <div className="detail-item"><span>Stress Threshold</span><strong>&gt;{crop.tempStress}C</strong></div>
          <div className="detail-item"><span>Humidity</span><strong>{crop.humidity}</strong></div>
          <div className="detail-item"><span>Light PAR</span><strong>{crop.light}</strong></div>
          <div className="detail-item"><span>Water Demand</span><strong>{crop.water}</strong></div>
          <div className="detail-item"><span>Calories</span><strong>{crop.calories}</strong></div>
          <div className="detail-item"><span>Protein</span><strong>{crop.protein}</strong></div>
        </div>
        <div className="crop-notes">{crop.notes}</div>
        <div className="crop-forecast">
          <div className="forecast-row"><span>Next Cycle Forecast</span><strong>{crop.forecast.next}</strong></div>
          <div className="forecast-row"><span>Model Confidence</span><strong>{crop.forecast.conf}</strong></div>
          <div className="forecast-row"><span>Recommendation</span><strong style={{ color: "#27ae60" }}>{crop.forecast.rec}</strong></div>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [sensors, setSensors] = useState<SensorAgent[]>(makeSensors)
  const [lastTick, setLastTick] = useState<Date>(new Date())
  const [selectedCrop, setSelectedCrop] = useState<CropDetail>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setSensors(s => tickSensors(s))
      setLastTick(new Date())
    }, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="dashboard">

      {/* Mission Overview */}
      <MissionOverview />

      {/* Live Sensors */}
      <div className="dash-card full">
        <h3>
          Live Greenhouse Sensors
          <span className="sensor-live-badge">
            <span className="sap-pulse" />
            live &middot; {lastTick.toLocaleTimeString()}
          </span>
        </h3>
        <div className="sensor-agents-grid-dash">
          {sensors.map(s => (
            <div key={s.id} className={"sensor-agent-card " + s.status}>
              <div className="sa-label">{s.label}</div>
              <div className={"sa-value " + s.status}>
                {fmtSensor(s)}<span className="sa-unit"> {s.unit}</span>
              </div>
              <div className="sa-target">{s.target}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Agent Ã¢â‚¬â€ compact, no sidebar */}
      <div className="dash-card full agent-compact-card">
        <h3>AI Greenhouse Agent</h3>
        <AgentChat />
      </div>

      {/* Autonomous Decisions */}
      <div className="dash-card">
        <h3>Autonomous Decisions</h3>
        <div className="decision-list">
          {decisions.map((d, i) => (
            <div key={i} className={"decision " + d.type}>
              <div className="decision-text">{d.text}</div>
              <div className="decision-meta"><span className="decision-service">{d.service}</span><span>{d.time}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Twin + Crop Intelligence */}
      <div className="dash-card wide">
        <h3>
          Digital Twin - Greenhouse Zones
          <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "#444" }}>click for details</span>
        </h3>
        <div className="crop-zone-grid">
          {CROP_INFO.map(c => (
            <div key={c.name} className="crop-zone-card" onClick={() => setSelectedCrop(c)}
              style={{ borderColor: selectedCrop?.name === c.name ? c.color + "88" : undefined }}>
              <div className="czc-header">
                <div className="czc-dot" style={{ background: c.color }} />
                <div className="czc-name">{c.name}</div>
                <div className="czc-pct" style={{ color: c.color }}>{c.growthPct}%</div>
              </div>
              <div className="czc-bar-bg">
                <div className="czc-bar-fill" style={{ width: c.growthPct + "%", background: c.color }} />
              </div>
              <div className="czc-meta">
                <span>{c.cycle}</span>
                <span>{c.yieldStr}</span>
              </div>
              <div className="czc-role">{c.role}</div>
              <div className="czc-stats">
                <span>{c.calories}</span>
                <span>{c.protein}</span>
              </div>
              <div className="czc-forecast">
                {c.forecast.next} &middot; {c.forecast.conf}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Health */}
      <div className="dash-card">
        <h3>Equipment Health</h3>
        <div className="anomaly-list">
          {anomalies.map((a, i) => (
            <div key={i} className="anomaly">
              <div className={"anomaly-dot " + a.status} />
              <div className="anomaly-text">{a.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      <div className="dash-card">
        <h3>Audit Log</h3>
        <div className="blockchain-list">
          {blockLog.map((b, i) => (
            <div key={i} className="block-entry">
              <span className="block-hash">{b.hash}</span>
              <span className="block-action">{b.action}</span>
              <span className="block-time">{b.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Status */}
      <div className="dash-card">
        <h3>Mission Status</h3>
        <div className="mission-status-list">
          <div className="sensor"><div className="sensor-label">Earth Uplink</div><div className="sensor-value ok">ACTIVE</div></div>
          <div className="sensor"><div className="sensor-label">Crew Health Score</div><div className="sensor-value ok">94/100</div></div>
          <div className="sensor"><div className="sensor-label">Quantum Opt. Jobs</div><div className="sensor-value ok">3 queued</div></div>
          <div className="sensor"><div className="sensor-label">Blockchain Blocks</div><div className="sensor-value ok">1,847</div></div>
        </div>
      </div>

      {selectedCrop && <CropDetailPanel crop={selectedCrop} onClose={() => setSelectedCrop(null)} />}
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-logo">M</div>
          <div className="header-title">
            <h1>MARS GREENHOUSE CONTROL</h1>
            <p>Autonomous Agriculture Management System - Mission Sol 127</p>
          </div>
          <div className="header-right">
            <div className="mission-clock"><span>Mission Day</span><strong>127 / 450</strong></div>
            <div className="aws-pill">Powered by AWS</div>
          </div>
        </div>
        <nav className="app-nav">
          {(["dashboard", "sim"] as Tab[]).map(tab => (
            <button key={tab} className={"nav-btn " + (activeTab === tab ? "active" : "")} onClick={() => setActiveTab(tab)}>
              {tab === "dashboard" ? "Control Center" : "Mission Simulation"}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "sim" && <MissionSim />}
      </main>
    </div>
  )
}