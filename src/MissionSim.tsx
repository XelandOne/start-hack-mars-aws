import { useState, useMemo } from 'react'

const CREW = 4
const DAYS = 450

// Per m² per cycle yields (kg) and cycle days
const CROP_DATA = {
  lettuce:  { yieldKg: 4,  cycleDays: 37,  kcalPer100g: 15,  proteinPer100g: 1.4, waterLPerKg: 25 },
  potato:   { yieldKg: 6,  cycleDays: 95,  kcalPer100g: 77,  proteinPer100g: 2.0, waterLPerKg: 100 },
  radish:   { yieldKg: 3,  cycleDays: 25,  kcalPer100g: 16,  proteinPer100g: 0.7, waterLPerKg: 20 },
  beans:    { yieldKg: 3,  cycleDays: 60,  kcalPer100g: 100, proteinPer100g: 7.0, waterLPerKg: 80 },
  herbs:    { yieldKg: 1,  cycleDays: 30,  kcalPer100g: 40,  proteinPer100g: 2.0, waterLPerKg: 15 },
}

type CropKey = keyof typeof CROP_DATA

interface Allocation {
  lettuce: number
  potato: number
  radish: number
  beans: number
  herbs: number
}

function calcOutput(alloc: Allocation) {
  let totalKcal = 0
  let totalProteinG = 0
  let totalWaterL = 0

  for (const [key, m2] of Object.entries(alloc) as [CropKey, number][]) {
    const c = CROP_DATA[key]
    const cyclesPerMission = DAYS / c.cycleDays
    const totalKg = m2 * c.yieldKg * cyclesPerMission
    totalKcal += (totalKg * 1000 / 100) * c.kcalPer100g
    totalProteinG += (totalKg * 1000 / 100) * c.proteinPer100g
    totalWaterL += totalKg * c.waterLPerKg
  }

  return { totalKcal, totalProteinG, totalWaterL }
}

function calcScores(alloc: Allocation, energyStore: number, waterRecycle: number) {
  const { totalKcal, totalProteinG, totalWaterL } = calcOutput(alloc)

  const targetKcal = CREW * 3000 * DAYS
  const targetProtein = CREW * 450 * DAYS // g
  const targetWater = CREW * 9 * DAYS * 1000 // ml → use L: CREW*9*DAYS

  const kcalFromGreenhouse = totalKcal
  const kcalTotal = kcalFromGreenhouse + energyStore * 1000 * DAYS // stored food kcal/day
  const nutrientScore = Math.min(100, Math.round((kcalTotal / targetKcal) * 100))

  const proteinScore = Math.min(100, Math.round((totalProteinG / targetProtein) * 100))
  const dietaryBalance = Math.round((nutrientScore * 0.5 + proteinScore * 0.5))

  const waterNeeded = CREW * 9 * DAYS // L
  const waterAvail = totalWaterL * (waterRecycle / 100) + waterNeeded * 0.3
  const resourceScore = Math.min(100, Math.round((waterAvail / waterNeeded) * 100))

  const overall = Math.round(nutrientScore * 0.4 + dietaryBalance * 0.35 + resourceScore * 0.25)

  return {
    nutrientScore,
    dietaryBalance,
    resourceScore,
    overall,
    totalKcal: Math.round(kcalTotal),
    targetKcal,
    totalProteinG: Math.round(totalProteinG),
    targetProtein,
    waterAvail: Math.round(waterAvail),
    waterNeeded,
    kcalPerDay: Math.round(kcalTotal / DAYS / CREW),
    proteinPerDay: Math.round(totalProteinG / DAYS / CREW),
  }
}

function ScoreBar({ label, score, unit }: { label: string; score: number; unit?: string }) {
  const color = score >= 80 ? '#27ae60' : score >= 50 ? '#f39c12' : '#c0392b'
  return (
    <div className="score-row">
      <div className="score-label">{label}</div>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="score-pct" style={{ color }}>{score}{unit ?? '%'}</div>
    </div>
  )
}

export default function MissionSim() {
  const [alloc, setAlloc] = useState<Allocation>({ lettuce: 17, potato: 45, radish: 8, beans: 25, herbs: 5 })
  const [energyStore, setEnergyStore] = useState(500) // kcal/day from stored food
  const [waterRecycle, setWaterRecycle] = useState(85) // % recycling efficiency

  const totalM2 = Object.values(alloc).reduce((a, b) => a + b, 0)
  const scores = useMemo(() => calcScores(alloc, energyStore, waterRecycle), [alloc, energyStore, waterRecycle])

  function setAlloc1(key: CropKey, val: number) {
    setAlloc(a => ({ ...a, [key]: Math.max(0, val) }))
  }

  const verdict = scores.overall >= 80 ? { text: 'Mission Viable', color: '#27ae60', icon: '✅' }
    : scores.overall >= 55 ? { text: 'Marginal — Adjust Parameters', color: '#f39c12', icon: '⚠️' }
    : { text: 'Mission at Risk', color: '#c0392b', icon: '🔴' }

  return (
    <div className="sim-view">
      <h2>🚀 Mission Simulation — 4 Crew, 450 Days</h2>
      <p className="sim-sub">Adjust greenhouse allocation and resources to meet mission requirements</p>

      <div className="sim-grid">
        {/* Controls */}
        <div className="sim-controls">
          <h3>Greenhouse Allocation (m²)</h3>
          {(Object.keys(alloc) as CropKey[]).map(key => (
            <div key={key} className="sim-slider-row">
              <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                type="range" min={0} max={100} value={alloc[key]}
                onChange={e => setAlloc1(key, +e.target.value)}
              />
              <span>{alloc[key]} m²</span>
            </div>
          ))}
          <div className="sim-total">Total: <strong>{totalM2} m²</strong></div>

          <h3 style={{ marginTop: 20 }}>Resources</h3>
          <div className="sim-slider-row">
            <label>Stored Food</label>
            <input type="range" min={0} max={2000} step={50} value={energyStore}
              onChange={e => setEnergyStore(+e.target.value)} />
            <span>{energyStore} kcal/day</span>
          </div>
          <div className="sim-slider-row">
            <label>Water Recycling</label>
            <input type="range" min={0} max={100} value={waterRecycle}
              onChange={e => setWaterRecycle(+e.target.value)} />
            <span>{waterRecycle}%</span>
          </div>
        </div>

        {/* Scores */}
        <div className="sim-scores">
          <div className="verdict-card" style={{ borderColor: verdict.color }}>
            <span className="verdict-icon">{verdict.icon}</span>
            <span className="verdict-text" style={{ color: verdict.color }}>{verdict.text}</span>
            <span className="verdict-score" style={{ color: verdict.color }}>{scores.overall}/100</span>
          </div>

          <h3>Score Breakdown</h3>
          <ScoreBar label="Nutrient Output" score={scores.nutrientScore} />
          <ScoreBar label="Dietary Balance" score={scores.dietaryBalance} />
          <ScoreBar label="Resource Consumption" score={scores.resourceScore} />

          <h3 style={{ marginTop: 20 }}>Daily Per Astronaut</h3>
          <div className="stat-grid">
            <div className="stat-card">
              <span>Calories</span>
              <strong style={{ color: scores.kcalPerDay >= 3000 ? '#27ae60' : '#c0392b' }}>
                {scores.kcalPerDay.toLocaleString()} kcal
              </strong>
              <small>target: 3,000</small>
            </div>
            <div className="stat-card">
              <span>Protein</span>
              <strong style={{ color: scores.proteinPerDay >= 90 ? '#27ae60' : '#c0392b' }}>
                {scores.proteinPerDay} g
              </strong>
              <small>target: 90–135g</small>
            </div>
            <div className="stat-card">
              <span>Water Supply</span>
              <strong style={{ color: scores.waterAvail >= scores.waterNeeded ? '#27ae60' : '#c0392b' }}>
                {Math.round(scores.waterAvail / scores.waterNeeded * 100)}%
              </strong>
              <small>of {scores.waterNeeded.toLocaleString()}L needed</small>
            </div>
            <div className="stat-card">
              <span>Greenhouse Area</span>
              <strong>{totalM2} m²</strong>
              <small>total allocated</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
