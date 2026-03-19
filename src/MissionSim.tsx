import { useState, useEffect, useRef, useCallback } from "react"

const AGENT_API = 'http://127.0.0.1:8000'

// Returns an inline background style that fills the track up to the current value
function trackFill(value: number, min: number, max: number, color = "#a83210"): React.CSSProperties {
  const pct = ((value - min) / (max - min)) * 100
  return { background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #ddd ${pct}%, #ddd 100%)` }
}

interface PlanetConfig {
  name: string; gravity: number; solarFlux: number; dustStorm: number
  radiation: string; waterIce: boolean; tempExt: number; co2Atm: boolean
  yieldMod: number; waterRecycle: number
}

const DEFAULT_PLANETS: Record<string, PlanetConfig> = {
  earth: { name: "Earth (baseline)",gravity: 1.00, solarFlux: 1.00, dustStorm: 0.00, radiation: "low",     waterIce: true,  tempExt: 15,   co2Atm: false, yieldMod: 1.00, waterRecycle: 80 },
  moon:  { name: "Moon",            gravity: 0.17, solarFlux: 1.00, dustStorm: 0.02, radiation: "extreme", waterIce: true,  tempExt: -173, co2Atm: false, yieldMod: 0.80, waterRecycle: 92 },
  mars:  { name: "Mars",            gravity: 0.38, solarFlux: 0.43, dustStorm: 0.08, radiation: "high",    waterIce: true,  tempExt: -60,  co2Atm: true,  yieldMod: 0.85, waterRecycle: 88 },
  pluto: { name: "Pluto",           gravity: 0.06, solarFlux: 0.001,dustStorm: 0.00, radiation: "extreme", waterIce: true,  tempExt: -229, co2Atm: false, yieldMod: 0.45, waterRecycle: 97 },
}

const PLANET_COLORS: Record<string, string> = {
  earth: "#2980b9",
  moon:  "#888888",
  mars:  "#c0392b",
  pluto: "#7b68a0",
}

const CROPS = {
  lettuce: { label: "Lettuce", emoji: "🥬", cycleDays: 37,  yieldKg: 4.0, kcal: 15,  protein: 1.4, waterL: 25,  color: "#27ae60", failRate: 0.03 },
  potato:  { label: "Potato",  emoji: "🥔", cycleDays: 95,  yieldKg: 6.0, kcal: 77,  protein: 2.0, waterL: 100, color: "#c0392b", failRate: 0.02 },
  radish:  { label: "Radish",  emoji: "🌱", cycleDays: 25,  yieldKg: 3.0, kcal: 16,  protein: 0.7, waterL: 20,  color: "#e67e22", failRate: 0.04 },
  beans:   { label: "Beans",   emoji: "🫘", cycleDays: 60,  yieldKg: 3.0, kcal: 100, protein: 7.0, waterL: 80,  color: "#f39c12", failRate: 0.02 },
  herbs:   { label: "Herbs",   emoji: "🌿", cycleDays: 30,  yieldKg: 1.0, kcal: 40,  protein: 2.0, waterL: 15,  color: "#1abc9c", failRate: 0.04 },
}
type CropKey = keyof typeof CROPS
const CROP_KEYS = Object.keys(CROPS) as CropKey[]

const CREW = 4
const MISSION_DAYS = 450
const GRID_COLS = 20
const GRID_ROWS = 10
const TOTAL_CELLS = GRID_COLS * GRID_ROWS

interface Cell {
  crop: CropKey; plantedDay: number; cycleDays: number; failed: boolean; harvested: number
}
interface SimEvent { day: number; text: string; type: "ok" | "warn" | "info" }
interface SimState {
  day: number; cells: Cell[]
  totalKcal: number; totalProteinG: number
  waterUsedL: number; waterRecycledL: number
  pantryKcal: number  // food store — surplus accumulates, drawn down on lean days
  pantryByCrop: Record<CropKey, number>  // kg stored per crop type
  events: SimEvent[]; kcalPerDay: number[]; proteinPerDay: number[]
  cumulKcal: number[]  // cumulative total kcal consumed at each day
  waterEffPerDay: number[] // recycled / (recycled + net used) * 100 per day
  failRatePerDay: number[] // % of active cells in failed state each day
  pantryPerDay: number[]   // food store level at end of each day
}

// alloc = % share per crop (0-100); areaM2 = total greenhouse floor area
interface Alloc { lettuce: number; potato: number; radish: number; beans: number; herbs: number }

function buildCells(alloc: Alloc, areaM2: number, yieldMod: number, enabled: Record<CropKey, boolean>): Cell[] {
  const activeCrops = CROP_KEYS.filter(k => enabled[k])
  const totalPct = activeCrops.reduce((a, k) => a + alloc[k], 0) || 1
  const cells: Cell[] = []
  let assigned = 0
  activeCrops.forEach((k, i) => {
    const share = alloc[k] / totalPct
    const n = i === activeCrops.length - 1 ? TOTAL_CELLS - assigned : Math.round(share * TOTAL_CELLS)
    const count = Math.max(0, n)
    assigned += count
    const cd = Math.round(CROPS[k].cycleDays / yieldMod)
    for (let j = 0; j < count; j++) {
      // all cells planted at day 0 — no stagger so growth starts at 0%
      cells.push({ crop: k, plantedDay: 0, cycleDays: cd, failed: Math.random() < CROPS[k].failRate, harvested: 0 })
    }
  })
  void areaM2
  return cells
}

function stepSim(prev: SimState, yieldMod: number, waterRecyclePct: number, stormChance: number, areaM2: number): SimState {
  const cellAreaM2 = areaM2 / TOTAL_CELLS  // each cell represents this many m²
  const day = prev.day + 1
  const cells = prev.cells.map(c => ({ ...c }))
  const events = [...prev.events]
  let dayKcal = 0, dayProtein = 0, dayWaterUsed = 0
  const dayKgByCrop: Record<CropKey, number> = { lettuce: 0, potato: 0, radish: 0, beans: 0, herbs: 0 }

  let stormPenalty = 1.0
  if (stormChance > 0 && Math.random() < stormChance / MISSION_DAYS * 2) {
    stormPenalty = 0.65
    events.push({ day, text: `Sol ${day}: Dust storm - light reduced 35%, AgentCore compensating with LED boost`, type: "warn" })
  }

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    const age = day - c.plantedDay
    if (age >= c.cycleDays) {
      if (!c.failed) {
        const kg = CROPS[c.crop].yieldKg * yieldMod * stormPenalty * cellAreaM2
        dayKcal += (kg * 1000 / 100) * CROPS[c.crop].kcal
        dayProtein += (kg * 1000 / 100) * CROPS[c.crop].protein
        dayWaterUsed += kg * CROPS[c.crop].waterL
        dayKgByCrop[c.crop] += kg
        cells[i].harvested += 1
        if (cells[i].harvested === 1 && Math.random() < 0.08) {
          events.push({ day, text: `Sol ${day}: ${CROPS[c.crop].label} harvested - ${kg.toFixed(1)}kg, cycle complete`, type: "ok" })
        }
      } else if (cells[i].harvested === 0) {
        events.push({ day, text: `Sol ${day}: ${CROPS[c.crop].label} cell failed germination - AgentCore replanting`, type: "warn" })
      }
      cells[i] = { ...c, plantedDay: day, failed: Math.random() < CROPS[c.crop].failRate * 0.4, harvested: cells[i].harvested }
    }
  }

  const waterRecycled = dayWaterUsed * (waterRecyclePct / 100)
  const totalWaterUsed = prev.waterUsedL + (dayWaterUsed - waterRecycled)
  const totalWaterRecycled = prev.waterRecycledL + waterRecycled
  const dayWaterEff = dayWaterUsed > 0 ? Math.round(waterRecycled / dayWaterUsed * 100) : waterRecyclePct
  const failedCount = cells.filter(c => c.failed && (day - c.plantedDay) < c.cycleDays).length
  const dayFailRate = Math.round(failedCount / cells.length * 100)

  // Pantry logic: harvest goes into store, crew consumes to hit overall mission calorie goal.
  // If they've been underfed, they eat a bit more to catch up (up to 1.5x daily target),
  // but once caught up they stick to the 3000 kcal/person/day goal.
  // Storage is capped at 90 days of crew supply to save space — excess is discarded.
  const dailyTarget = CREW * 3000
  const pantryMax = dailyTarget * 90
  const missionKcalGoal = dailyTarget * day  // what total consumed should be by this day
  const deficit = Math.max(0, missionKcalGoal - prev.totalKcal)  // how many kcal behind
  // Allow catch-up eating: base target + up to 50% extra to recover deficit, capped at 1.5x
  const catchUpTarget = Math.min(dailyTarget * 1.5, dailyTarget + deficit)
  const pantryAfterHarvest = Math.min(prev.pantryKcal + dayKcal, pantryMax)
  const consumed = Math.min(pantryAfterHarvest, catchUpTarget)
  const newPantry = pantryAfterHarvest - consumed
  const newTotalKcal = prev.totalKcal + consumed

  // Update per-crop kg in storage: add today's harvest, then scale down proportionally by consumption
  const prevByCrop = prev.pantryByCrop
  const newByCropAfterHarvest: Record<CropKey, number> = { ...prevByCrop }
  for (const k of CROP_KEYS) newByCropAfterHarvest[k] += dayKgByCrop[k]
  // Scale down by consumption ratio (consume proportionally from all crops)
  const consumeRatio = pantryAfterHarvest > 0 ? consumed / pantryAfterHarvest : 0
  const newPantryByCrop: Record<CropKey, number> = { lettuce: 0, potato: 0, radish: 0, beans: 0, herbs: 0 }
  for (const k of CROP_KEYS) newPantryByCrop[k] = newByCropAfterHarvest[k] * (1 - consumeRatio)

  return {
    day, cells,
    totalKcal: newTotalKcal,
    totalProteinG: prev.totalProteinG + dayProtein,
    waterUsedL: totalWaterUsed,
    waterRecycledL: totalWaterRecycled,
    pantryKcal: newPantry,
    pantryByCrop: newPantryByCrop,
    events: events.slice(-40),
    kcalPerDay: [...prev.kcalPerDay, Math.round(consumed / CREW)],
    proteinPerDay: [...prev.proteinPerDay, Math.round(dayProtein / CREW)],
    cumulKcal: [...prev.cumulKcal, Math.round(newTotalKcal)],
    waterEffPerDay: [...prev.waterEffPerDay, dayWaterEff],
    failRatePerDay: [...prev.failRatePerDay, dayFailRate],
    pantryPerDay: [...prev.pantryPerDay, Math.round(newPantry)],
  }
}

function fastForward(cells: Cell[], targetDay: number, yieldMod: number, waterRecycle: number, areaM2: number): SimState {
  let state: SimState = {
    day: 0, cells: cells.map(c => ({ ...c })),
    totalKcal: 0, totalProteinG: 0, waterUsedL: 0, waterRecycledL: 0,
    pantryKcal: 0,
    pantryByCrop: { lettuce: 0, potato: 0, radish: 0, beans: 0, herbs: 0 },
    events: [], kcalPerDay: [], proteinPerDay: [],
    cumulKcal: [], waterEffPerDay: [], failRatePerDay: [], pantryPerDay: [],
  }
  for (let d = 1; d <= targetDay; d++) {
    state = stepSim(state, yieldMod, waterRecycle, 0.0, areaM2)
  }
  return state
}

function cellColor(c: Cell, day: number): string {
  if (c.failed && (day - c.plantedDay) < c.cycleDays) return "#1e0808"
  const pct = Math.min(1, (day - c.plantedDay) / c.cycleDays)
  const alpha = Math.round((0.12 + pct * 0.88) * 255).toString(16).padStart(2, "0")
  return CROPS[c.crop].color + alpha
}

function getAssessment(scores: { nutrient: number; protein: number; water: number; overall: number }, day: number, planet: PlanetConfig): { text: string; recs: string[] } {
  const phase = day < 90 ? "early" : day < 270 ? "mid" : "late"
  const lines: string[] = []
  const recs: string[] = []
  if (phase === "early") lines.push(`Sol ${day}: Greenhouse systems nominal. Crop establishment phase underway on ${planet.name}.`)
  else if (phase === "mid") lines.push(`Sol ${day}: Mission at ${Math.round(day / MISSION_DAYS * 100)}% completion. Autonomous systems operating continuously.`)
  else lines.push(`Sol ${day}: Final mission phase. Crew nutrition reserves building toward landing day.`)
  if (scores.nutrient < 60) { lines.push("Caloric output is below target."); recs.push("Increase potato allocation - highest kcal/m2 ratio.") }
  else if (scores.nutrient >= 90) lines.push("Caloric output exceeds mission requirements.")
  else lines.push("Caloric output on track.")
  if (scores.protein < 65) { lines.push("Protein intake is insufficient."); recs.push("Expand bean zone - primary protein source at 7g/100g.") }
  else lines.push("Protein levels adequate.")
  if (scores.water < 70) { lines.push("Water recycling efficiency needs attention."); recs.push("Check recycling system - " + planet.waterRecycle + "% efficiency expected.") }
  else lines.push("Water recycling system performing at " + planet.waterRecycle + "%.")
  if (recs.length === 0) recs.push("All systems nominal. No adjustments required.")
  return { text: lines.join(" "), recs }
}

function LiveCharts({ sim }: { sim: SimState }) {
  const W = 600, H = 80
  const days = sim.cumulKcal.length
  if (days < 2) return null

  // Chart 1: cumulative kcal consumed vs goal
  // Goal is a fixed straight line: 0 at Sol 0 → totalGoal at Sol MISSION_DAYS
  // Both lines share the same x-scale (days mapped to W) and y-scale (totalGoal mapped to H)
  const totalGoal = CREW * 3000 * MISSION_DAYS
  const kcalPoints = sim.cumulKcal.map((v, i) =>
    `${(i / (days - 1)) * W},${H - (v / totalGoal) * H}`).join(" ")
  // Goal line: two fixed points — start and the proportional end for current day count
  const goalEndX = W
  const goalEndY = H - (CREW * 3000 * MISSION_DAYS / totalGoal) * H  // always 0 (top)
  const goalStartY = H  // always bottom
  const lastKcal = sim.cumulKcal[days - 1]
  const goalNow = CREW * 3000 * days
  const kcalPct = Math.round(lastKcal / goalNow * 100)
  const kcalColor = kcalPct >= 100 ? "#27ae60" : kcalPct >= 70 ? "#f39c12" : "#c0392b"

  // Chart 2: crop failure rate per day (7-day rolling avg)
  const failData = sim.failRatePerDay
  const smoothedFail = failData.map((_, i) => {
    const w = failData.slice(Math.max(0, i - 6), i + 1)
    return w.reduce((a, b) => a + b, 0) / w.length
  })
  const maxFail = Math.max(10, ...smoothedFail) * 1.1
  const failPoints = smoothedFail.map((v, i) =>
    `${(i / (days - 1)) * W},${H - (v / maxFail) * H}`).join(" ")
  const healthyThreshold = 3
  const thresholdY = H - (healthyThreshold / maxFail) * H
  const lastFail = smoothedFail[smoothedFail.length - 1]

  // Chart 3: calories in storage (pantry level over time) — shown as days of supply
  const dailyNeed = CREW * 3000
  const pantryData = sim.pantryPerDay
  const maxSupplyDays = 60  // fixed scale: 0–60 days of supply
  const pantryPoints = pantryData.map((v, i) =>
    `${(i / (days - 1)) * W},${H - (Math.min(v / dailyNeed, maxSupplyDays) / maxSupplyDays) * H}`).join(" ")
  const lastPantry = pantryData[pantryData.length - 1]
  const pantryDays = Math.floor(lastPantry / dailyNeed)
  const pantryColor = pantryDays >= 7 ? "#27ae60" : pantryDays >= 1 ? "#f39c12" : "#c0392b"
  // reference lines at 7d and 30d
  const line7Y = H - (7 / maxSupplyDays) * H
  const line30Y = H - (30 / maxSupplyDays) * H

  return (
    <div className="live-charts-row">
      {/* Chart 1: Cumulative Calories vs Goal */}
      <div className="live-chart-card">
        <div className="live-chart-header">
          <span className="live-chart-title">Cumulative Calories vs Goal</span>
          <span className="live-chart-badge" style={{ color: kcalColor }}>{kcalPct}% of target</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="live-chart-svg">
          <line x1="0" y1={goalStartY} x2={goalEndX} y2={goalEndY} stroke="rgba(30,122,74,0.33)" strokeWidth="1.5" strokeDasharray="6 4" />
          <polygon points={`0,${H} ${kcalPoints} ${W},${H}`} fill={`${kcalColor}18`} />
          <polyline fill="none" stroke={kcalColor} strokeWidth="2" points={kcalPoints} />
        </svg>
        <div className="live-chart-legend">
          <span className="lc-leg-item"><span className="lc-leg-line" style={{ borderTop: "2px dashed #27ae6055", background: "transparent" }} />Goal</span>
          <span className="lc-leg-item"><span className="lc-leg-line" style={{ background: kcalColor }} />Consumed</span>
          <span className="lc-leg-right">{Math.round(lastKcal / 1000).toLocaleString()}k / {Math.round(goalNow / 1000).toLocaleString()}k kcal</span>
        </div>
      </div>

      {/* Chart 2: Crop Failure Rate */}
      <div className="live-chart-card">
        <div className="live-chart-header">
          <span className="live-chart-title">Crop Failure Rate</span>
          <span className="live-chart-badge" style={{ color: "var(--crit)" }}>{lastFail.toFixed(1)}% failing</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="live-chart-svg">
          <line x1="0" y1={thresholdY} x2={W} y2={thresholdY} stroke="rgba(30,122,74,0.27)" strokeWidth="1.5" strokeDasharray="6 4" />
          <polygon points={`0,${H} ${failPoints} ${W},${H}`} fill="rgba(192,57,43,0.09)" />
          <polyline fill="none" stroke="#c0392b" strokeWidth="2" points={failPoints} />
        </svg>
        <div className="live-chart-legend">
          <span className="lc-leg-item"><span className="lc-leg-line" style={{ borderTop: "2px dashed rgba(30,122,74,0.4)", background: "transparent" }} />Healthy (&le;{healthyThreshold}%)</span>
          <span className="lc-leg-item"><span className="lc-leg-line" style={{ background: "var(--crit)" }} />7-day avg</span>
          <span className="lc-leg-right">{lastFail <= healthyThreshold ? "System nominal" : lastFail <= 8 ? "AgentCore replanting" : "High failure — check allocation"}</span>
        </div>
      </div>

      {/* Chart 3: Calories in Storage */}
      <div className="live-chart-card">
        <div className="live-chart-header">
          <span className="live-chart-title">Calories in Storage</span>
          <span className="live-chart-badge" style={{ color: pantryColor }}>
            {pantryDays}d supply ({Math.round(lastPantry / 1000).toLocaleString()}k kcal)
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="live-chart-svg">
          <line x1="0" y1={line30Y} x2={W} y2={line30Y} stroke="rgba(30,122,74,0.2)" strokeWidth="1" strokeDasharray="4 3" />
          <line x1="0" y1={line7Y} x2={W} y2={line7Y} stroke="rgba(184,106,0,0.27)" strokeWidth="1" strokeDasharray="4 3" />
          <polygon points={`0,${H} ${pantryPoints} ${W},${H}`} fill={`${pantryColor}18`} />
          <polyline fill="none" stroke={pantryColor} strokeWidth="2" points={pantryPoints} />
        </svg>
        <div className="live-chart-legend">
          <span className="lc-leg-item"><span className="lc-leg-line" style={{ background: pantryColor }} />Days of supply (0–60d scale)</span>
          <span className="lc-leg-right">{pantryDays >= 7 ? "Reserves healthy" : pantryDays >= 1 ? "Low reserves" : "Storage empty"}</span>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#27ae60" : score >= 50 ? "#f39c12" : "#c0392b"
  return (
    <div className="score-row">
      <div className="score-label">{label}</div>
      <div className="score-bar-bg"><div className="score-bar-fill" style={{ width: `${score}%`, background: color }} /></div>
      <div className="score-pct" style={{ color }}>{score}%</div>
    </div>
  )
}

function PlanetVisual({ planetKey }: { planetKey: string }) {
  const id = planetKey.startsWith("custom") ? "custom" : planetKey
  if (id === "mars") return (
    <svg viewBox="0 0 120 120" className="planet-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mars-grad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#e8724a" />
          <stop offset="55%" stopColor="#c0392b" />
          <stop offset="100%" stopColor="#6b1a0a" />
        </radialGradient>
        <radialGradient id="mars-atm" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="transparent" />
          <stop offset="100%" stopColor="#e8724a33" />
        </radialGradient>
        <clipPath id="mars-clip"><circle cx="60" cy="60" r="46" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="50" fill="#e8724a22" className="planet-glow" />
      <circle cx="60" cy="60" r="46" fill="url(#mars-grad)" />
      <g clipPath="url(#mars-clip)" className="planet-surface">
        <ellipse cx="45" cy="52" rx="18" ry="7" fill="#a0300f44" transform="rotate(-15 45 52)" />
        <ellipse cx="72" cy="68" rx="12" ry="5" fill="#a0300f33" transform="rotate(10 72 68)" />
        <ellipse cx="55" cy="38" rx="8" ry="3" fill="#d4603044" transform="rotate(-5 55 38)" />
        <circle cx="60" cy="20" r="8" fill="#f0f0f044" opacity="0.6" />
        <circle cx="60" cy="100" r="6" fill="#f0f0f033" opacity="0.5" />
      </g>
      <circle cx="60" cy="60" r="46" fill="url(#mars-atm)" />
      <g className="dust-swirl" clipPath="url(#mars-clip)">
        <ellipse cx="60" cy="60" rx="30" ry="8" fill="none" stroke="#e8724a55" strokeWidth="2" />
        <ellipse cx="60" cy="60" rx="22" ry="5" fill="none" stroke="#c0392b44" strokeWidth="1.5" />
      </g>
    </svg>
  )
  if (id === "moon") return (
    <svg viewBox="0 0 120 120" className="planet-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moon-grad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#c8c8c8" />
          <stop offset="60%" stopColor="#888" />
          <stop offset="100%" stopColor="#3a3a3a" />
        </radialGradient>
        <clipPath id="moon-clip"><circle cx="60" cy="60" r="46" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="50" fill="#88888811" className="planet-glow" />
      <circle cx="60" cy="60" r="46" fill="url(#moon-grad)" />
      <g clipPath="url(#moon-clip)" className="planet-surface">
        <circle cx="42" cy="48" r="9" fill="#55555566" />
        <circle cx="72" cy="65" r="6" fill="#44444455" />
        <circle cx="55" cy="75" r="4" fill="#44444444" />
        <circle cx="78" cy="42" r="5" fill="#55555544" />
        <circle cx="38" cy="70" r="3" fill="#44444433" />
        <circle cx="65" cy="35" r="3" fill="#55555533" />
      </g>
    </svg>
  )
  if (id === "pluto") return (
    <svg viewBox="0 0 120 120" className="planet-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pluto-grad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#b8a8d0" />
          <stop offset="50%" stopColor="#7b68a0" />
          <stop offset="100%" stopColor="#2e1f4a" />
        </radialGradient>
        <radialGradient id="pluto-atm" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor="transparent" />
          <stop offset="100%" stopColor="#b8a8d022" />
        </radialGradient>
        <clipPath id="pluto-clip"><circle cx="60" cy="60" r="46" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="50" fill="#7b68a011" className="planet-glow" />
      <circle cx="60" cy="60" r="46" fill="url(#pluto-grad)" />
      <g clipPath="url(#pluto-clip)" className="planet-surface">
        <ellipse cx="58" cy="62" rx="22" ry="14" fill="#c8b8e044" transform="rotate(-8 58 62)" />
        <ellipse cx="42" cy="45" rx="8" ry="5" fill="#55446644" />
        <ellipse cx="75" cy="70" rx="6" ry="4" fill="#44335533" />
        <circle cx="60" cy="18" r="7" fill="#e8e0f044" opacity="0.7" />
        <circle cx="60" cy="102" r="5" fill="#e8e0f033" opacity="0.5" />
      </g>
      <circle cx="60" cy="60" r="46" fill="url(#pluto-atm)" />
    </svg>
  )
  if (id === "earth") return (
    <svg viewBox="0 0 120 120" className="planet-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="earth-grad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#4fc3f7" />
          <stop offset="45%" stopColor="#1565c0" />
          <stop offset="100%" stopColor="#0a2a5a" />
        </radialGradient>
        <radialGradient id="earth-atm" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor="transparent" />
          <stop offset="100%" stopColor="#4fc3f733" />
        </radialGradient>
        <clipPath id="earth-clip"><circle cx="60" cy="60" r="46" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="50" fill="#4fc3f722" className="planet-glow" />
      <circle cx="60" cy="60" r="46" fill="url(#earth-grad)" />
      <g clipPath="url(#earth-clip)" className="planet-surface">
        <ellipse cx="50" cy="55" rx="14" ry="18" fill="#27ae6077" transform="rotate(-10 50 55)" />
        <ellipse cx="72" cy="52" rx="10" ry="14" fill="#27ae6066" transform="rotate(15 72 52)" />
        <ellipse cx="60" cy="75" rx="16" ry="8" fill="#27ae6055" />
        <ellipse cx="60" cy="22" r="8" fill="#f0f0f055" />
        <ellipse cx="60" cy="98" r="6" fill="#f0f0f044" />
      </g>
      <circle cx="60" cy="60" r="46" fill="url(#earth-atm)" />
    </svg>
  )
  // custom / fallback
  return (
    <svg viewBox="0 0 120 120" className="planet-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="custom-grad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#9b59b6" />
          <stop offset="55%" stopColor="#6c3483" />
          <stop offset="100%" stopColor="#2c1654" />
        </radialGradient>
        <clipPath id="custom-clip"><circle cx="60" cy="60" r="46" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="50" fill="#9b59b622" className="planet-glow" />
      <circle cx="60" cy="60" r="46" fill="url(#custom-grad)" />
      <g clipPath="url(#custom-clip)" className="planet-surface">
        <ellipse cx="55" cy="55" rx="20" ry="6" fill="#9b59b633" transform="rotate(-20 55 55)" />
        <ellipse cx="65" cy="70" rx="14" ry="4" fill="#6c348333" transform="rotate(10 65 70)" />
      </g>
    </svg>
  )
}

function computeRecommendedM2(areaM2: number, yieldMod: number): Record<CropKey, number> {
  const kcalPerM2: Record<CropKey, number> = {
    potato:  (6000/100*77)  / 95  * yieldMod,
    beans:   (3000/100*100) / 60  * yieldMod,
    lettuce: (4000/100*15)  / 37  * yieldMod,
    radish:  (3000/100*16)  / 25  * yieldMod,
    herbs:   (1000/100*40)  / 30  * yieldMod,
  }
  const proteinPerM2: Record<CropKey, number> = {
    potato:  (6000/100*2)   / 95  * yieldMod,
    beans:   (3000/100*7)   / 60  * yieldMod,
    lettuce: (4000/100*1.4) / 37  * yieldMod,
    radish:  (3000/100*0.7) / 25  * yieldMod,
    herbs:   (1000/100*2)   / 30  * yieldMod,
  }
  const kcalTarget = CREW * 3000
  const proteinTarget = CREW * 56
  const minProtein = CREW * 30
  const maxKcal = areaM2 * kcalPerM2.potato
  if (maxKcal < kcalTarget) {
    const beansM2 = Math.round(areaM2 * 0.15)
    return { potato: areaM2 - beansM2, beans: beansM2, lettuce: 0, radish: 0, herbs: 0 }
  }
  const potatoForKcal = Math.ceil(kcalTarget / kcalPerM2.potato)
  const surplus = areaM2 - potatoForKcal
  const proteinFromPotato = (m2: number) => m2 * proteinPerM2.potato
  const beansForFullProtein = Math.max(0, Math.ceil((proteinTarget - proteinFromPotato(potatoForKcal)) / proteinPerM2.beans))
  const beansForMinProtein  = Math.max(0, Math.ceil((minProtein  - proteinFromPotato(potatoForKcal)) / proteinPerM2.beans))
  if (surplus <= 0 || surplus < beansForMinProtein) {
    const beansM2 = Math.min(Math.round(areaM2 * 0.12), beansForMinProtein)
    return { potato: areaM2 - beansM2, beans: beansM2, lettuce: 0, radish: 0, herbs: 0 }
  }
  if (surplus < beansForFullProtein + Math.round(areaM2 * 0.15)) {
    const beansM2 = Math.min(surplus, beansForFullProtein)
    return { potato: areaM2 - beansM2, beans: beansM2, lettuce: 0, radish: 0, herbs: 0 }
  }
  const minBeansM2 = Math.max(beansForFullProtein, Math.round(areaM2 * 0.12))
  const beansM2 = Math.min(minBeansM2, surplus)
  const remainingAfterBeans = surplus - beansM2
  const lettuceM2 = Math.round(remainingAfterBeans * 0.50)
  const radishM2  = Math.round(remainingAfterBeans * 0.30)
  const herbsM2   = remainingAfterBeans - lettuceM2 - radishM2
  return { potato: potatoForKcal, beans: beansM2, lettuce: lettuceM2, radish: radishM2, herbs: herbsM2 }
}

export default function MissionSim() {
  const planets = DEFAULT_PLANETS
  const [planetKey, setPlanetKey] = useState("mars")
  // alloc = % share per crop (independent sliders, don't need to sum to 100)
  const [alloc, setAlloc] = useState<Alloc>({ lettuce: 17, potato: 45, radish: 8, beans: 25, herbs: 5 })
  const [cropEnabled, setCropEnabled] = useState<Record<CropKey, boolean>>({ lettuce: true, potato: true, radish: true, beans: true, herbs: true })
  const [areaM2, setAreaM2] = useState(500)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(3)
  const [sim, setSim] = useState<SimState | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [startMode, setStartMode] = useState<"new" | "join" | null>(null)
  const [allocLoading, setAllocLoading] = useState(false)
  const [allocError, setAllocError] = useState<string | null>(null)
  const [allocReasoning, setAllocReasoning] = useState<string | null>(null)
  const [recommendedM2, setRecommendedM2] = useState<Record<CropKey, number> | null>(null)


  // Recompute recommended areas whenever area or planet changes
  useEffect(() => {
    setRecommendedM2(computeRecommendedM2(areaM2, planets[planetKey]?.yieldMod ?? 0.85))
  }, [areaM2, planetKey, planets])

  async function fetchRecommendedAlloc() {
    setAllocLoading(true)
    setAllocError(null)
    setAllocReasoning(null)
    try {
      // Daily yield per m² (kcal and protein)
      const kcalPerM2: Record<CropKey, number> = {
        potato:  (6000/100*77)  / 95  * p.yieldMod,
        beans:   (3000/100*100) / 60  * p.yieldMod,
        lettuce: (4000/100*15)  / 37  * p.yieldMod,
        radish:  (3000/100*16)  / 25  * p.yieldMod,
        herbs:   (1000/100*40)  / 30  * p.yieldMod,
      }
      const proteinPerM2: Record<CropKey, number> = {
        potato:  (6000/100*2)   / 95  * p.yieldMod,
        beans:   (3000/100*7)   / 60  * p.yieldMod,
        lettuce: (4000/100*1.4) / 37  * p.yieldMod,
        radish:  (3000/100*0.7) / 25  * p.yieldMod,
        herbs:   (1000/100*2)   / 30  * p.yieldMod,
      }
      const kcalTarget = 4 * 3000       // 12000 kcal/day
      const proteinTarget = 4 * 56      // 224g/day
      const minProtein = 4 * 30         // 120g/day — survival floor

      // Tier 1: can we even hit calories? Maximize kcal (all potato)
      const maxKcal = areaM2 * kcalPerM2.potato
      const kcalConstrained = maxKcal < kcalTarget

      let allotment: Record<CropKey, number>
      let tier: number
      let tierNote: string

      if (kcalConstrained) {
        // TIER 1: area too small to hit calorie goal — maximize calories, minimal protein
        // Give 85% to potato, 15% to beans (best protein/m²)
        const beansM2 = Math.round(areaM2 * 0.15)
        allotment = { potato: areaM2 - beansM2, beans: beansM2, lettuce: 0, radish: 0, herbs: 0 }
        tier = 1
        tierNote = `Area is too small to meet the ${kcalTarget} kcal/day target (max possible: ${Math.round(maxKcal)} kcal/day). Maximizing calories with minimal protein support.`
      } else {
        // How much potato needed to hit calorie target alone?
        const potatoForKcal = Math.ceil(kcalTarget / kcalPerM2.potato)
        const surplus = areaM2 - potatoForKcal

        // How much beans needed to hit protein target (potato contributes some protein too)?
        const proteinFromPotato = (m2: number) => m2 * proteinPerM2.potato
        const beansForFullProtein = Math.max(0,
          Math.ceil((proteinTarget - proteinFromPotato(potatoForKcal)) / proteinPerM2.beans)
        )
        const beansForMinProtein = Math.max(0,
          Math.ceil((minProtein - proteinFromPotato(potatoForKcal)) / proteinPerM2.beans)
        )

        if (surplus <= 0 || surplus < beansForMinProtein) {
          // TIER 1: barely enough for calories, squeeze in minimum protein beans
          const beansM2 = Math.min(Math.round(areaM2 * 0.12), beansForMinProtein)
          const potatoM2 = areaM2 - beansM2
          allotment = { potato: potatoM2, beans: beansM2, lettuce: 0, radish: 0, herbs: 0 }
          tier = 1
          tierNote = `Tight area — prioritizing calorie target with minimum viable protein (${Math.round(minProtein)}g/day floor).`
        } else if (surplus < beansForFullProtein + Math.round(areaM2 * 0.15)) {
          // TIER 2: hit calories + enough protein, no room for variety
          const beansM2 = Math.min(surplus, beansForFullProtein)
          const potatoM2 = areaM2 - beansM2
          allotment = { potato: potatoM2, beans: beansM2, lettuce: 0, radish: 0, herbs: 0 }
          tier = 2
          tierNote = `Sufficient area to meet calorie and protein targets. No surplus for variety crops.`
        } else {
          // TIER 3: calories + full protein + variety
          // Always keep a minimum beans allocation for protein diversity even if potatoes cover protein
          const minBeansM2 = Math.max(beansForFullProtein, Math.round(areaM2 * 0.12))
          const beansM2 = Math.min(minBeansM2, surplus)
          const remainingAfterBeans = surplus - beansM2
          // Variety split from remaining surplus: 50% lettuce, 30% radish, 20% herbs
          const lettuceM2 = Math.round(remainingAfterBeans * 0.50)
          const radishM2  = Math.round(remainingAfterBeans * 0.30)
          const herbsM2   = remainingAfterBeans - lettuceM2 - radishM2
          const potatoM2  = potatoForKcal
          allotment = { potato: potatoM2, beans: beansM2, lettuce: lettuceM2, radish: radishM2, herbs: herbsM2 }
          tier = 3
          tierNote = `Ample area — calorie and protein targets met, surplus allocated to beans, lettuce, radish, and herbs for dietary variety and micronutrients.`
        }
      }

      const achievedKcal    = CROP_KEYS.reduce((s, k) => s + allotment[k] * kcalPerM2[k], 0)
      const achievedProtein = CROP_KEYS.reduce((s, k) => s + allotment[k] * proteinPerM2[k], 0)
      const kcalCoverage    = Math.round(achievedKcal / kcalTarget * 100)
      const proteinCoverage = Math.round(achievedProtein / proteinTarget * 100)

      const prompt =
        `You are explaining a Tier ${tier} crop allocation for a ${areaM2} m² greenhouse on ${p.name} (yield modifier ${p.yieldMod}, radiation: ${p.radiation}). ` +
        `Allocation: potato=${allotment.potato}m², beans=${allotment.beans}m², lettuce=${allotment.lettuce}m², radish=${allotment.radish}m², herbs=${allotment.herbs}m². ` +
        `Achieves ${kcalCoverage}% of calorie target and ${proteinCoverage}% of protein target. Context: ${tierNote} ` +
        `Respond with ONLY a single line of valid JSON. Keys: lettuce, potato, radish, beans, herbs (use exact values above), reasoning (2-3 sentences mentioning the tier, area, and coverage). No markdown, no code block. ` +
        `Example: {"lettuce":${allotment.lettuce},"potato":${allotment.potato},"radish":${allotment.radish},"beans":${allotment.beans},"herbs":${allotment.herbs},"reasoning":"${tierNote} Covers ${kcalCoverage}% kcal and ${proteinCoverage}% protein."}`
      const res = await fetch(`${AGENT_API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.detail ?? `HTTP ${res.status}`
        throw new Error(detail)
      }
      const text: string = data.response ?? ''
      // find the last } to get the full JSON object (non-greedy regex cuts short)
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in agent response')
      const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<Alloc & { reasoning: string }>
      // Model returns m² — normalize to % for sliders, but use mathAlloc as ground truth
      const next: Alloc = {
        lettuce: Math.round(allotment.lettuce / areaM2 * 100),
        potato:  Math.round(allotment.potato  / areaM2 * 100),
        radish:  Math.round(allotment.radish  / areaM2 * 100),
        beans:   Math.round(allotment.beans   / areaM2 * 100),
        herbs:   Math.round(allotment.herbs   / areaM2 * 100),
      }
      if (typeof parsed.reasoning === 'string' && parsed.reasoning.trim()) {
        setAllocReasoning(parsed.reasoning.trim())
      }
      setAlloc(next)
      setSim(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        setAllocError('Agent unavailable. Is it running on port 8000?')
      } else {
        setAllocError(msg || 'Agent returned unexpected format. Try again.')
      }
    } finally {
      setAllocLoading(false)
    }
  }

  const p = planets[planetKey]
  const activeCropKeys = CROP_KEYS.filter(k => cropEnabled[k])
  const totalPct = activeCropKeys.reduce((a, k) => a + alloc[k], 0) || 1

  function initSim(startDay = 0) {
    const cells = buildCells(alloc, areaM2, p.yieldMod, cropEnabled)
    if (startDay === 0) {
      setSim({
        day: 0, cells, totalKcal: 0, totalProteinG: 0, waterUsedL: 0, waterRecycledL: 0,
        events: [{ day: 0, text: `Mission initialized on ${p.name} - all crops at 0% growth, autonomous greenhouse online`, type: "info" }],
        kcalPerDay: [], proteinPerDay: [],
        cumulKcal: [], waterEffPerDay: [], failRatePerDay: [],
        pantryKcal: 0, pantryByCrop: { lettuce: 0, potato: 0, radish: 0, beans: 0, herbs: 0 }, pantryPerDay: [],
      })
    } else {
      // fast-forward from Sol 0 using current planet + alloc config
      const ff = fastForward(cells, startDay, p.yieldMod, p.waterRecycle, areaM2)
      ff.events = [
        { day: startDay, text: `Joined at Sol ${startDay} on ${p.name} - simulated from Sol 0 with current config`, type: "info" },
        ...ff.events.slice(-8)
      ]
      setSim(ff)
    }
    setRunning(false)
  }

  const tick = useCallback(() => {
    setSim(prev => {
      if (!prev || prev.day >= MISSION_DAYS) { setRunning(false); return prev }
      let s = prev
      for (let i = 0; i < speed; i++) {
        if (s.day < MISSION_DAYS) s = stepSim(s, p.yieldMod, p.waterRecycle, p.dustStorm, areaM2)
      }
      return s
    })
  }, [p.yieldMod, p.waterRecycle, p.dustStorm, speed, areaM2])

  useEffect(() => {
    if (running) { timerRef.current = setInterval(tick, 80) }
    else { if (timerRef.current) clearInterval(timerRef.current) }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, tick])

  const scores = sim && sim.day > 0 ? (() => {
    const tKcal = CREW * 3000 * sim.day
    const tProt = CREW * 56 * sim.day  // 0.8g/kg for ~70kg crew member (RDA)
    const tWater = CREW * 9 * sim.day
    const nutrient = Math.min(100, Math.round(sim.totalKcal / tKcal * 100))
    const protein = Math.min(100, Math.round(sim.totalProteinG / tProt * 100))
    const water = Math.min(100, Math.round(sim.waterRecycledL / tWater * 100 + 28))
    const overall = Math.round(nutrient * 0.4 + protein * 0.35 + water * 0.25)
    const kcalDaysHit = sim.kcalPerDay.filter(v => v >= 3000).length
    const kcalDaysMissed = sim.kcalPerDay.length - kcalDaysHit
    const proteinDaysHit = sim.proteinPerDay.filter(v => v >= 56).length
    const proteinDaysMissed = sim.proteinPerDay.length - proteinDaysHit
    return { nutrient, protein, water, overall,
      kcalPerDay: Math.round(sim.totalKcal / sim.day / CREW),
      proteinPerDay: Math.round(sim.totalProteinG / sim.day / CREW),
      kcalDaysHit, kcalDaysMissed, proteinDaysHit, proteinDaysMissed }
  })() : null

  const verdict = scores
    ? scores.overall >= 80 ? { text: "Mission Viable",  color: "var(--ok)" }
      : scores.overall >= 55 ? { text: "Marginal",       color: "var(--warn)" }
      : { text: "Mission at Risk", color: "var(--crit)" }
    : null

  const assessment = scores && sim ? getAssessment(scores, sim.day, p) : null

  return (
    <div className="sim-view">
      <div className="sim-config-panel" style={{ '--planet-color': PLANET_COLORS[planetKey] ?? '#a83210' } as React.CSSProperties}>

        {/* 1. Planet */}
        <div className="config-section config-section-planet">
          <div className="config-section-title">Planet / Environment</div>
          <div className="config-section-hint">Select the target environment. Each planet changes yield, water recycling, and hazard rates.</div>
          <div className="planet-selector">
            {Object.entries(planets).map(([k, pl]) => (
              <button key={k} className={"planet-btn" + (planetKey === k ? " active" : "")}
                onClick={() => { setPlanetKey(k); setSim(null); setRunning(false) }}>
                {pl.name}
              </button>
            ))}
          </div>
          <div className="planet-visual-wrap">
            <PlanetVisual planetKey={planetKey} />
          </div>
          <div className="planet-bar">
            <span className="pbar-item">Gravity <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{p.gravity}g</strong></span>
            <span className="pbar-item">Solar <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{(p.solarFlux * 100).toFixed(0)}%</strong></span>
            <span className="pbar-item">Dust storms <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{p.dustStorm > 0 ? (p.dustStorm * 100).toFixed(0) + "%/yr" : "none"}</strong></span>
            <span className="pbar-item">Radiation <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{p.radiation}</strong></span>
            <span className="pbar-item">Water ice <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{p.waterIce ? "yes" : "no"}</strong></span>
            <span className="pbar-item">Yield mod <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{(p.yieldMod * 100).toFixed(0)}%</strong></span>
            <span className="pbar-item">Recycling <strong style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{p.waterRecycle}%</strong></span>
          </div>
        </div>

        {/* 2. Crop allocation — % share sliders + area size */}
        <div className="config-section">
          <div className="config-section-title">Crop Allocation</div>
          <div className="config-section-hint">Set the % share of greenhouse area per crop. Potatoes = calories, Beans = protein, Lettuce/Radish = micronutrients, Herbs = morale. Set total area below.</div>

          {/* Area size slider */}
          <div className="alloc-area-row">
            <span className="alloc-area-label">Total Area</span>
            <input type="range" min={100} max={800} step={10} value={Math.min(areaM2, 800)}
              style={trackFill(Math.min(areaM2, 800), 100, 800, PLANET_COLORS[planetKey] ?? '#a83210')}
              onChange={e => { setAreaM2(+e.target.value); setSim(null) }} />
            <input
              type="number" min={100} max={800} step={10}
              className="alloc-area-input"
              value={areaM2}
              onChange={e => {
                const v = Math.max(100, Math.min(800, +e.target.value))
                setAreaM2(v)
                setSim(null)
              }}
            />
            <span className="alloc-area-unit" style={{ fontWeight: 700, fontSize: "0.95rem", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>m²</span>
          </div>

          <div className="alloc-ai-row">
            <button
              className="sim-btn sim-btn-ai"
              onClick={fetchRecommendedAlloc}
              disabled={allocLoading}
              title="Ask the AI agent for the optimal crop distribution for this area"
            >
              {allocLoading ? '⏳ Asking agent...' : '🤖 AI Recommend'}
            </button>
            {allocError && <span className="alloc-ai-error">{allocError}</span>}
            {allocReasoning && !allocError && (
              <span className="alloc-ai-reasoning" title={allocReasoning}>
                💡 <span className="alloc-ai-reasoning-text">{allocReasoning}</span>
              </span>
            )}
          </div>

          <div className="alloc-grid">
            {CROP_KEYS.map(k => {
              const enabled = cropEnabled[k]
              const sharePct = enabled ? Math.round((alloc[k] / totalPct) * 100) : 0
              const m2 = enabled ? Math.round((alloc[k] / totalPct) * areaM2) : 0
              return (
                <div key={k} className={"alloc-item" + (enabled ? "" : " alloc-disabled")}>
                  <div className="alloc-header">
                    <span className="crop-dot" style={{ background: enabled ? CROPS[k].color : "#333" }} />
                    <span className="alloc-label" style={{ color: enabled ? "var(--text)" : "var(--text-muted)" }}>{CROPS[k].label}</span>
                    <span className="alloc-val" style={{ color: enabled ? "var(--text-dim)" : "var(--text-muted)" }}>
                      {enabled ? (
                        <>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>{sharePct}%</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginLeft: 4 }}>({m2} m²)</span>
                        </>
                      ) : "disabled"}
                    </span>
                    <button
                      className={"crop-toggle " + (enabled ? "crop-toggle-on" : "crop-toggle-off")}
                      onClick={() => { setCropEnabled(e => ({ ...e, [k]: !e[k] })); setSim(null) }}
                      title={enabled ? "Disable crop" : "Enable crop"}
                    >{enabled ? "ON" : "OFF"}</button>
                  </div>
                  <div className="alloc-meta" style={{ color: enabled ? "var(--text-dim)" : "var(--text-muted)" }}>
                    {CROPS[k].cycleDays}d cycle &middot; {CROPS[k].yieldKg}kg/m2 &middot; {CROPS[k].kcal} kcal/100g
                    {recommendedM2 && enabled && (
                      <span className="alloc-rec-hint" title="Recommended area based on REAP agent knowledge">
                        &nbsp;· rec: <span style={{ color: CROPS[k].color }}>{recommendedM2[k]} m²</span>
                      </span>
                    )}
                  </div>
                  <input type="range" min={0} max={100} value={alloc[k]} disabled={!enabled}
                    style={{ opacity: enabled ? 1 : 0.25, ...trackFill(alloc[k], 0, 100, CROPS[k].color + "cc") }}
                    onChange={e => { setAlloc(a => ({ ...a, [k]: +e.target.value })); setSim(null) }} />
                </div>
              )
            })}
          </div>
          <div className="sim-total">
            Effective area: <strong>{areaM2} m2</strong> &nbsp;|&nbsp;
            Active crops: <strong>{activeCropKeys.length}</strong>
          </div>
        </div>

        {/* 3. Mission Control — moved outside config panel below */}
      </div>

      {/* Mission Control — standalone box */}
      <div className="mission-control-box">
        <div className="config-section-title">Mission Control</div>
        <div className="config-section-hint">Start from Sol 0 or jump to the current mission day (Sol 127) to evaluate the live greenhouse state.</div>

        {/* Dashboard — always visible, shows live data when sim is running */}
        {(() => {
          const pantryMax = CREW * 3000 * 90 // 90-day cap from sim logic
          if (!sim) {
            // Pre-sim placeholder
            return (
              <div className="mc-dashboard">
                <div className="mc-dash-card mc-dash-storage">
                  <div className="mc-dash-card-title">🗄 SILO — Food Storage</div>
                  <div className="mc-dash-empty">—</div>
                  <div className="mc-dash-bar-bg"><div className="mc-dash-bar-fill" style={{ width: "0%", background: "var(--border-lt)" }} /></div>
                  <div className="mc-dash-meta">0% capacity · 0d supply · 0 kcal</div>
                </div>
                <div className="mc-dash-card mc-dash-growing">
                  <div className="mc-dash-card-title">🌱 BLOOM — Crops Growing</div>
                  <div className="mc-dash-empty">Start simulation to see live crop data</div>
                </div>
                <div className="mc-dash-card mc-dash-harvest">
                  <div className="mc-dash-card-title">🌾 Near Harvest</div>
                  <div className="mc-dash-empty">—</div>
                </div>
              </div>
            )
          }

          const activeCells = sim.cells.filter(c => !c.failed)
          const growingByCrop = CROP_KEYS.map(k => {
            const cells = activeCells.filter(c => c.crop === k)
            const growing = cells.filter(c => {
              const age = sim.day - c.plantedDay
              return age < c.cycleDays
            })
            const nearHarvest = cells.filter(c => {
              const age = sim.day - c.plantedDay
              const pct = age / c.cycleDays
              return pct >= 0.8 && pct < 1
            })
            // avg growth % for this crop
            const avgPct = growing.length > 0
              ? Math.round(growing.reduce((a, c) => a + Math.min(1, (sim.day - c.plantedDay) / c.cycleDays), 0) / growing.length * 100)
              : 0
            return { k, growing: growing.length, nearHarvest: nearHarvest.length, total: cells.length, avgPct }
          }).filter(x => x.total > 0)

          const pantryDays = sim.pantryKcal > 0 ? Math.floor(sim.pantryKcal / (CREW * 3000)) : 0
          const pantryCapPct = Math.min(100, Math.round((sim.pantryKcal / pantryMax) * 100))
          const pantryColor = pantryDays >= 14 ? "#27ae60" : pantryDays >= 5 ? "#f39c12" : "#c0392b"
          const totalNearHarvest = growingByCrop.reduce((a, x) => a + x.nearHarvest, 0)
          const totalGrowing = growingByCrop.reduce((a, x) => a + x.growing, 0)
          const failedCells = sim.cells.filter(c => c.failed && (sim.day - c.plantedDay) < c.cycleDays).length

          return (
            <div className="mc-dashboard">
              {/* SILO — Storage */}
              <div className="mc-dash-card mc-dash-storage">
                <div className="mc-dash-card-title">🗄 SILO — Food Storage</div>
                <div className="mc-dash-value" style={{ color: pantryColor }}>
                  {Math.round(sim.pantryKcal / 1000).toLocaleString()}k kcal
                </div>
                <div className="mc-dash-bar-bg">
                  <div className="mc-dash-bar-fill" style={{ width: `${pantryCapPct}%`, background: pantryColor }} />
                </div>
                <div className="mc-dash-meta">
                  <span style={{ color: pantryColor }}>{pantryCapPct}% capacity</span>
                  <span className="mc-dash-sep">·</span>
                  <span style={{ color: pantryColor }}>{pantryDays > 0 ? `~${pantryDays}d supply` : "reserves empty"}</span>
                </div>
                {/* Per-crop breakdown */}
                <div className="mc-dash-silo-crops">
                  {CROP_KEYS.filter(k => sim.pantryByCrop[k] > 0.05).map(k => {
                    const kg = sim.pantryByCrop[k]
                    const totalKg = CROP_KEYS.reduce((a, ck) => a + sim.pantryByCrop[ck], 0)
                    const pct = totalKg > 0 ? Math.round((kg / totalKg) * 100) : 0
                    return (
                      <div key={k} className="mc-dash-silo-row">
                        <span className="mc-dash-crop-dot" style={{ background: CROPS[k].color }} />
                        <span className="mc-dash-silo-name">{CROPS[k].emoji} {CROPS[k].label}</span>
                        <div className="mc-dash-silo-bar-bg">
                          <div className="mc-dash-silo-bar-fill" style={{ width: `${pct}%`, background: CROPS[k].color + "88" }} />
                        </div>
                        <span className="mc-dash-silo-kg" style={{ color: CROPS[k].color }}>{kg >= 1 ? `${Math.round(kg)}kg` : `${Math.round(kg * 1000)}g`}</span>
                      </div>
                    )
                  })}
                  {CROP_KEYS.every(k => sim.pantryByCrop[k] <= 0.05) && (
                    <div className="mc-dash-meta" style={{ marginTop: 4 }}>no food in storage yet</div>
                  )}
                </div>
              </div>

              {/* BLOOM — Crops Growing */}
              <div className="mc-dash-card mc-dash-growing">
                <div className="mc-dash-card-title">🌱 BLOOM — Crops Growing</div>
                <div className="mc-dash-value" style={{ color: totalGrowing > 0 ? "#27ae60" : "#555" }}>
                  {totalGrowing} <span className="mc-dash-value-sub">/ {TOTAL_CELLS} cells active</span>
                </div>
                {failedCells > 0 && (
                  <div className="mc-dash-failed">⚠ {failedCells} cells failed — AgentCore replanting</div>
                )}
                <div className="mc-dash-crop-list">
                  {growingByCrop.map(({ k, growing, total, avgPct }) => (
                    <div key={k} className="mc-dash-crop-row">
                      <span className="mc-dash-crop-dot" style={{ background: CROPS[k].color }} />
                      <span className="mc-dash-crop-name">{CROPS[k].emoji} {CROPS[k].label}</span>
                      <div className="mc-dash-crop-bar-bg">
                        <div className="mc-dash-crop-bar-fill" style={{ width: `${avgPct}%`, background: CROPS[k].color + "99" }} />
                      </div>
                      <span className="mc-dash-crop-pct" style={{ color: CROPS[k].color }}>{avgPct}%</span>
                      <span className="mc-dash-crop-count">{growing}<span className="mc-dash-crop-total">/{total}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Near Harvest */}
              <div className="mc-dash-card mc-dash-harvest">
                <div className="mc-dash-card-title">🌾 Near Harvest (≥80%)</div>
                <div className="mc-dash-value" style={{ color: totalNearHarvest > 0 ? "#f39c12" : "#444" }}>
                  {totalNearHarvest} cells
                </div>
                {totalNearHarvest > 0 ? (
                  <div className="mc-dash-harvest-list">
                    {growingByCrop.filter(x => x.nearHarvest > 0).map(({ k, nearHarvest }) => (
                      <div key={k} className="mc-dash-harvest-row">
                        <span className="mc-dash-crop-dot" style={{ background: CROPS[k].color }} />
                        <span className="mc-dash-crop-name">{CROPS[k].emoji} {CROPS[k].label}</span>
                        <span className="mc-dash-harvest-badge" style={{ background: CROPS[k].color + "22", color: CROPS[k].color, borderColor: CROPS[k].color + "55" }}>
                          {nearHarvest} cells ready
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mc-dash-meta" style={{ marginTop: 8 }}>No crops approaching harvest</div>
                )}
              </div>
            </div>
          )
        })()}
        <div className="mission-ctrl-grid">
          <div className="ctrl-block">
            <div className="ctrl-block-label">Start Mode</div>
            <div className="sim-btn-row">
              <button
                className={"sim-btn" + (startMode === "new" ? " sim-btn-new-active" : "")}
                onClick={() => { setStartMode("new"); initSim(0) }}
              >New Mission (Sol 0)</button>
              <button
                className={"sim-btn" + (startMode === "join" ? " sim-btn-join-active" : "")}
                onClick={() => { setStartMode("join"); initSim(127) }}
              >Join Current (Sol 127)</button>
            </div>
          </div>
          <div className="ctrl-block">
            <div className="ctrl-block-label">Simulation Speed</div>
            <div className="sim-slider-row">
              <input type="range" min={1} max={15} value={speed} onChange={e => setSpeed(+e.target.value)} style={trackFill(speed, 1, 15, PLANET_COLORS[planetKey] ?? '#a83210')} />
              <span style={{ fontWeight: 700, fontSize: "1rem", minWidth: 36, background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>{speed}x</span>
            </div>
          </div>
          <div className="ctrl-block">
            <div className="ctrl-block-label">Playback</div>
            <div className="sim-btn-row">
              {sim && sim.day < MISSION_DAYS && (
                <button
                  className={"sim-btn" + (running ? " sim-btn-pause" : " sim-btn-run")}
                  onClick={() => setRunning(r => !r)}
                >{running ? "Pause" : "Run"}</button>
              )}
              {sim && !running && sim.day < MISSION_DAYS && (
                <button className="sim-btn" onClick={tick}>+{speed}d</button>
              )}
              {sim && <button className="sim-btn sim-btn-reset" onClick={() => { setSim(null); setRunning(false); setStartMode(null) }}>Reset</button>}
            </div>
          </div>
        </div>
        {sim && (
          <div className="sim-day-display">
            <span>Sol {sim.day} / {MISSION_DAYS}</span>
            <div className="day-bar-bg"><div className="day-bar-fill" style={{ width: `${(sim.day / MISSION_DAYS) * 100}%` }} /></div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{Math.round(sim.day / MISSION_DAYS * 100)}% complete</span>
          </div>
        )}
      </div>

      {/* Main sim area */}
      {sim ? (
        <>
          <div className="sim-main-grid">
          <div className="sim-field-wrap">
            <div className="sim-field-label">
              <span className="aws-tag aws-tag-sm">IoT TwinMaker</span>
              Live Field - {TOTAL_CELLS} cells &middot; Sol {sim.day} &middot; {areaM2} m2
            </div>
            <div className="sim-field-grid">
              {sim.cells.map((c, i) => {
                const age = sim.day - c.plantedDay
                const pct = Math.min(1, age / c.cycleDays)
                const failed = c.failed && age < c.cycleDays
                return (
                  <div key={i} className="field-cell" style={{ background: cellColor(c, sim.day) }}
                    title={`${CROPS[c.crop].label} | ${failed ? "FAILED" : Math.round(pct * 100) + "% grown"} | age ${age}d`}>
                    <span className="cell-emoji">
                      {failed ? "💀" : pct >= 0.5 ? CROPS[c.crop].emoji : "🌱"}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="field-legend-row">
              {CROP_KEYS.map(k => (
                <span key={k} className="legend-item">
                  <span className="legend-dot" style={{ background: CROPS[k].color }} />{CROPS[k].label}
                </span>
              ))}
              <span className="legend-item"><span className="legend-dot" style={{ background: "var(--crit)" }} />Failed</span>
            </div>
            {sim.kcalPerDay.length > 2 && (
              <div className="kcal-chart">
                <div className="kcal-chart-label">kcal / crew member / day (target: 3000)</div>
                <svg width="100%" height="56" viewBox={`0 0 ${sim.kcalPerDay.length} 56`} preserveAspectRatio="none">
                  <line x1="0" y1={56 - 3000 / 90} x2={sim.kcalPerDay.length} y2={56 - 3000 / 90}
                    stroke="rgba(30,122,74,0.5)" strokeWidth="0.8" strokeDasharray="4 3" />
                  <polyline fill="none" stroke="#c0392b" strokeWidth="1.5"
                    points={sim.kcalPerDay.map((v, i) => `${i},${56 - Math.min(56, v / 90)}`).join(" ")} />
                </svg>
              </div>
            )}
          </div>

          <div className="sim-scores">
            {scores && verdict && (
              <>
                <div className="verdict-card" style={{ borderColor: verdict.color }}>
                  <span className="verdict-text" style={{ color: verdict.color }}>{verdict.text}</span>
                  <span className="verdict-score" style={{ color: verdict.color }}>{scores.overall}/100</span>
                </div>
                <ScoreBar label="Nutrient Output" score={scores.nutrient} />
                <ScoreBar label="Dietary Balance" score={scores.protein} />
                <ScoreBar label="Water Recycled" score={scores.water} />
                <div className="stat-grid">
                  <div className="stat-card"><span>kcal/crew/day</span><strong style={{ color: scores.kcalPerDay >= 3000 ? "var(--ok)" : "var(--crit)" }}>{scores.kcalPerDay.toLocaleString()}</strong><small>target 3,000</small></div>
                  <div className="stat-card"><span>protein/crew/day</span><strong style={{ color: scores.proteinPerDay >= 90 ? "var(--ok)" : "var(--crit)" }}>{scores.proteinPerDay}g</strong><small>target 90g</small></div>
                  <div className="stat-card"><span>Food reserve</span><strong style={{ color: sim.pantryKcal > CREW * 3000 * 7 ? "var(--ok)" : sim.pantryKcal > 0 ? "var(--warn)" : "var(--crit)" }}>{Math.round(sim.pantryKcal / 1000).toLocaleString()}k kcal</strong><small>{sim.pantryKcal > 0 ? `~${Math.floor(sim.pantryKcal / (CREW * 3000))}d supply` : "empty"}</small></div>
                  <div className="stat-card"><span>Water recycled</span><strong style={{ color: "var(--info)" }}>{Math.round(sim.waterRecycledL).toLocaleString()}L</strong><small>{p.waterRecycle}% efficiency</small></div>
                </div>
                {/* Calorie & Protein running counters */}
                <div className="running-counters">
                  <div className="counter-card">
                    <div className="counter-header">
                      <span className="counter-title">Total Calories Produced</span>
                      <span className="counter-value">{Math.round(sim.totalKcal).toLocaleString()} kcal</span>
                    </div>
                    <div className="counter-avg-row">
                      <span className="counter-avg-label">Avg / crew / day</span>
                      <span className="counter-avg-val" style={{ color: scores.kcalPerDay >= 3000 ? "var(--ok)" : "var(--crit)" }}>
                        {scores.kcalPerDay.toLocaleString()} kcal
                      </span>
                      <span className="counter-goal-label">goal: 3,000</span>
                    </div>
                    <div className="counter-bar-bg">
                      <div className="counter-bar-fill" style={{
                        width: `${Math.min(100, (scores.kcalPerDay / 3000) * 100)}%`,
                        background: scores.kcalPerDay >= 3000 ? "var(--ok)" : scores.kcalPerDay >= 2000 ? "var(--warn)" : "var(--crit)"
                      }} />
                      <div className="counter-bar-goal" style={{ left: "100%" }} />
                    </div>
                    <div className="counter-deficit" style={{ color: scores.kcalPerDay >= 3000 ? "var(--ok)" : "var(--crit)" }}>
                      {scores.kcalPerDay >= 3000
                        ? `+${(scores.kcalPerDay - 3000).toLocaleString()} kcal surplus`
                        : `${(3000 - scores.kcalPerDay).toLocaleString()} kcal deficit`}
                    </div>
                  </div>

                  <div className="counter-card">
                    <div className="counter-header">
                      <span className="counter-title">Total Protein Produced</span>
                      <span className="counter-value">{Math.round(sim.totalProteinG).toLocaleString()} g</span>
                    </div>
                    <div className="counter-avg-row">
                      <span className="counter-avg-label">Avg / crew / day</span>
                      <span className="counter-avg-val" style={{ color: scores.proteinPerDay >= 90 ? "var(--ok)" : "var(--crit)" }}>
                        {scores.proteinPerDay}g
                      </span>
                      <span className="counter-goal-label">goal: 90g</span>
                    </div>
                    <div className="counter-bar-bg">
                      <div className="counter-bar-fill" style={{
                        width: `${Math.min(100, (scores.proteinPerDay / 90) * 100)}%`,
                        background: scores.proteinPerDay >= 90 ? "var(--ok)" : scores.proteinPerDay >= 60 ? "var(--warn)" : "var(--crit)"
                      }} />
                    </div>
                    <div className="counter-deficit" style={{ color: scores.proteinPerDay >= 90 ? "var(--ok)" : "var(--crit)" }}>
                      {scores.proteinPerDay >= 90
                        ? `+${(scores.proteinPerDay - 90)}g surplus`
                        : `${(90 - scores.proteinPerDay)}g deficit`}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="event-log">
              <div className="event-log-title"><span className="aws-tag aws-tag-sm">AgentCore</span> Autonomous Log</div>
              {[...sim.events].reverse().map((e, i) => (
                <div key={i} className={"event-entry " + e.type}>
                  <span className="event-day">Sol {e.day}</span>
                  <span className="event-text">{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
          {sim.cumulKcal.length > 2 && <LiveCharts sim={sim} />}
        </>
      ) : (
        <div className="sim-idle">
          Configure planet and allocation above, then click "New Mission" or "Join Current" to start.
        </div>
      )}
    </div>
  )
}
