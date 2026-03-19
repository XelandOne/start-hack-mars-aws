import { useState, useEffect, useRef, useCallback } from "react"

const AGENT_API = 'http://127.0.0.1:8000'

interface PlanetConfig {
  name: string; gravity: number; solarFlux: number; dustStorm: number
  radiation: string; waterIce: boolean; tempExt: number; co2Atm: boolean
  yieldMod: number; waterRecycle: number; custom?: boolean
}

const DEFAULT_PLANETS: Record<string, PlanetConfig> = {
  mars:  { name: "Mars",            gravity: 0.38, solarFlux: 0.43, dustStorm: 0.08, radiation: "high",    waterIce: true,  tempExt: -60,  co2Atm: true,  yieldMod: 0.85, waterRecycle: 88 },
  moon:  { name: "Moon",            gravity: 0.17, solarFlux: 1.00, dustStorm: 0.02, radiation: "extreme", waterIce: true,  tempExt: -173, co2Atm: false, yieldMod: 0.80, waterRecycle: 92 },
  titan: { name: "Titan",           gravity: 0.14, solarFlux: 0.01, dustStorm: 0.01, radiation: "low",     waterIce: false, tempExt: -179, co2Atm: false, yieldMod: 0.70, waterRecycle: 95 },
  earth: { name: "Earth (baseline)",gravity: 1.00, solarFlux: 1.00, dustStorm: 0.00, radiation: "low",     waterIce: true,  tempExt: 15,   co2Atm: false, yieldMod: 1.00, waterRecycle: 80 },
}

const CROPS = {
  lettuce: { label: "Lettuce", cycleDays: 37,  yieldKg: 4.0, kcal: 15,  protein: 1.4, waterL: 25,  color: "#27ae60", failRate: 0.03 },
  potato:  { label: "Potato",  cycleDays: 95,  yieldKg: 6.0, kcal: 77,  protein: 2.0, waterL: 100, color: "#c0392b", failRate: 0.02 },
  radish:  { label: "Radish",  cycleDays: 25,  yieldKg: 3.0, kcal: 16,  protein: 0.7, waterL: 20,  color: "#e67e22", failRate: 0.04 },
  beans:   { label: "Beans",   cycleDays: 60,  yieldKg: 3.0, kcal: 100, protein: 7.0, waterL: 80,  color: "#f39c12", failRate: 0.02 },
  herbs:   { label: "Herbs",   cycleDays: 30,  yieldKg: 1.0, kcal: 40,  protein: 2.0, waterL: 15,  color: "#1abc9c", failRate: 0.04 },
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
  events: SimEvent[]; kcalPerDay: number[]
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
  const areaScale = areaM2 / 200
  const day = prev.day + 1
  const cells = prev.cells.map(c => ({ ...c }))
  const events = [...prev.events]
  let dayKcal = 0, dayProtein = 0, dayWaterUsed = 0

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
        const kg = CROPS[c.crop].yieldKg * yieldMod * stormPenalty * areaScale
        dayKcal += (kg * 1000 / 100) * CROPS[c.crop].kcal
        dayProtein += (kg * 1000 / 100) * CROPS[c.crop].protein
        dayWaterUsed += kg * CROPS[c.crop].waterL
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
  return {
    day, cells,
    totalKcal: prev.totalKcal + dayKcal,
    totalProteinG: prev.totalProteinG + dayProtein,
    waterUsedL: prev.waterUsedL + (dayWaterUsed - waterRecycled),
    waterRecycledL: prev.waterRecycledL + waterRecycled,
    events: events.slice(-40),
    kcalPerDay: [...prev.kcalPerDay, Math.round(dayKcal / CREW)],
  }
}

function fastForward(cells: Cell[], targetDay: number, yieldMod: number, waterRecycle: number, areaM2: number): SimState {
  let state: SimState = {
    day: 0, cells: cells.map(c => ({ ...c })),
    totalKcal: 0, totalProteinG: 0, waterUsedL: 0, waterRecycledL: 0,
    events: [], kcalPerDay: [],
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
  if (id === "titan") return (
    <svg viewBox="0 0 120 120" className="planet-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="titan-grad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#f0a040" />
          <stop offset="55%" stopColor="#c07020" />
          <stop offset="100%" stopColor="#5a2a00" />
        </radialGradient>
        <radialGradient id="titan-haze" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="#f0a04055" />
        </radialGradient>
        <clipPath id="titan-clip"><circle cx="60" cy="60" r="46" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="54" fill="#f0a04022" className="planet-glow-haze" />
      <circle cx="60" cy="60" r="50" fill="#f0a04011" />
      <circle cx="60" cy="60" r="46" fill="url(#titan-grad)" />
      <g clipPath="url(#titan-clip)" className="planet-surface">
        <ellipse cx="60" cy="55" rx="35" ry="6" fill="#c0702044" />
        <ellipse cx="60" cy="65" rx="28" ry="4" fill="#a0500033" />
        <ellipse cx="60" cy="45" rx="20" ry="3" fill="#d0803033" />
      </g>
      <circle cx="60" cy="60" r="46" fill="url(#titan-haze)" />
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

export default function MissionSim() {
  const [planets, setPlanets] = useState<Record<string, PlanetConfig>>(DEFAULT_PLANETS)
  const [planetKey, setPlanetKey] = useState("mars")
  // alloc = % share per crop (independent sliders, don't need to sum to 100)
  const [alloc, setAlloc] = useState<Alloc>({ lettuce: 17, potato: 45, radish: 8, beans: 25, herbs: 5 })
  const [cropEnabled, setCropEnabled] = useState<Record<CropKey, boolean>>({ lettuce: true, potato: true, radish: true, beans: true, herbs: true })
  const [areaM2, setAreaM2] = useState(100)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(3)
  const [sim, setSim] = useState<SimState | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customForm, setCustomForm] = useState<PlanetConfig>({
    name: "Custom", gravity: 0.5, solarFlux: 0.5, dustStorm: 0.03,
    radiation: "medium", waterIce: true, tempExt: -40, co2Atm: false,
    yieldMod: 0.80, waterRecycle: 85, custom: true,
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [allocLoading, setAllocLoading] = useState(false)
  const [allocError, setAllocError] = useState<string | null>(null)
  const [allocReasoning, setAllocReasoning] = useState<string | null>(null)

  async function fetchRecommendedAlloc() {
    setAllocLoading(true)
    setAllocError(null)
    setAllocReasoning(null)
    try {
      const prompt =
        `Given a greenhouse area of ${areaM2} m2 on ${p.name} (yield modifier ${p.yieldMod}, ` +
        `radiation: ${p.radiation}, solar flux: ${p.solarFlux}), recommend the optimal crop allocation. ` +
        `Respond with ONLY a single line of valid JSON, no explanation, no markdown, no code block. ` +
        `Keys must be exactly: lettuce, potato, radish, beans, herbs, reasoning. ` +
        `lettuce/potato/radish/beans/herbs are integers 0-100 representing the recommended % share of the area. ` +
        `reasoning is a 2-3 sentence string explaining why this specific allocation is optimal for the given area size and environment — focus on how the m2 is best utilized, which crops earn their space, and which were trimmed because the area doesn't justify them. ` +
        `Example output: {"lettuce":20,"potato":40,"radish":10,"beans":25,"herbs":5,"reasoning":"At 100 m2, potatoes and beans claim the bulk of the floor to hit caloric and protein targets for the crew. Lettuce earns a modest share for micronutrients without wasting space. Radish and herbs are trimmed — at this scale their output doesn't justify the m2."}`
      const res = await fetch(`${AGENT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })
      const data = await res.json()
      const text: string = data.response ?? ''
      // extract first {...} block, allowing whitespace/newlines inside
      const match = text.match(/\{[\s\S]*?\}/)
      if (!match) throw new Error('No JSON found in agent response')
      const parsed = JSON.parse(match[0]) as Partial<Alloc & { reasoning: string }>
      const next: Alloc = {
        lettuce: typeof parsed.lettuce === 'number' ? Math.max(0, Math.min(100, parsed.lettuce)) : alloc.lettuce,
        potato:  typeof parsed.potato  === 'number' ? Math.max(0, Math.min(100, parsed.potato))  : alloc.potato,
        radish:  typeof parsed.radish  === 'number' ? Math.max(0, Math.min(100, parsed.radish))  : alloc.radish,
        beans:   typeof parsed.beans   === 'number' ? Math.max(0, Math.min(100, parsed.beans))   : alloc.beans,
        herbs:   typeof parsed.herbs   === 'number' ? Math.max(0, Math.min(100, parsed.herbs))   : alloc.herbs,
      }
      if (typeof parsed.reasoning === 'string' && parsed.reasoning.trim()) {
        setAllocReasoning(parsed.reasoning.trim())
      }
      setAlloc(next)
      setSim(null)
    } catch (e) {
      setAllocError(e instanceof Error && e.message !== 'No JSON found in agent response'
        ? 'Agent unavailable. Is it running on port 8000?'
        : 'Agent returned unexpected format. Try again.')
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
        kcalPerDay: [],
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
    const tProt = CREW * 90 * sim.day
    const tWater = CREW * 9 * sim.day
    const nutrient = Math.min(100, Math.round(sim.totalKcal / tKcal * 100))
    const protein = Math.min(100, Math.round(sim.totalProteinG / tProt * 100))
    const water = Math.min(100, Math.round(sim.waterRecycledL / tWater * 100 + 28))
    const overall = Math.round(nutrient * 0.4 + protein * 0.35 + water * 0.25)
    return { nutrient, protein, water, overall,
      kcalPerDay: Math.round(sim.totalKcal / sim.day / CREW),
      proteinPerDay: Math.round(sim.totalProteinG / sim.day / CREW) }
  })() : null

  const verdict = scores
    ? scores.overall >= 80 ? { text: "Mission Viable", color: "#27ae60" }
      : scores.overall >= 55 ? { text: "Marginal", color: "#f39c12" }
      : { text: "Mission at Risk", color: "#c0392b" }
    : null

  const assessment = scores && sim ? getAssessment(scores, sim.day, p) : null

  function addCustomPlanet() {
    const key = "custom_" + Date.now()
    setPlanets(prev => ({ ...prev, [key]: { ...customForm } }))
    setPlanetKey(key)
    setSim(null)
    setShowCustom(false)
  }

  return (
    <div className="sim-view">
      <div className="sim-config-panel">

        {/* 1. Planet */}
        <div className="config-section">
          <div className="config-section-title">Planet / Environment</div>
          <div className="config-section-hint">Select the target environment. Each planet changes yield, water recycling, and hazard rates.</div>
          <div className="planet-selector">
            {Object.entries(planets).map(([k, pl]) => (
              <button key={k} className={"planet-btn" + (planetKey === k ? " active" : "")}
                onClick={() => { setPlanetKey(k); setSim(null); setRunning(false) }}>
                {pl.name}{pl.custom ? " *" : ""}
              </button>
            ))}
            <button className="planet-btn add-btn" onClick={() => setShowCustom(s => !s)}>+ Custom</button>
          </div>
          {showCustom && (
            <div className="custom-planet-form">
              <div className="cpf-title">New Planet Configuration</div>
              <div className="cpf-grid">
                <label>Name<input value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))} /></label>
                <label>Gravity (g)<input type="number" step="0.01" value={customForm.gravity} onChange={e => setCustomForm(f => ({ ...f, gravity: +e.target.value }))} /></label>
                <label>Solar Flux (0-1)<input type="number" step="0.01" value={customForm.solarFlux} onChange={e => setCustomForm(f => ({ ...f, solarFlux: +e.target.value }))} /></label>
                <label>Dust Storm (%/yr)<input type="number" step="0.01" value={customForm.dustStorm} onChange={e => setCustomForm(f => ({ ...f, dustStorm: +e.target.value }))} /></label>
                <label>Yield Modifier (0-1)<input type="number" step="0.01" value={customForm.yieldMod} onChange={e => setCustomForm(f => ({ ...f, yieldMod: +e.target.value }))} /></label>
                <label>Water Recycle (%)<input type="number" step="1" value={customForm.waterRecycle} onChange={e => setCustomForm(f => ({ ...f, waterRecycle: +e.target.value }))} /></label>
                <label>Ext. Temp (C)<input type="number" step="1" value={customForm.tempExt} onChange={e => setCustomForm(f => ({ ...f, tempExt: +e.target.value }))} /></label>
                <label>Radiation<input value={customForm.radiation} onChange={e => setCustomForm(f => ({ ...f, radiation: e.target.value }))} /></label>
              </div>
              <button className="sim-btn primary" onClick={addCustomPlanet}>Add Planet</button>
            </div>
          )}
          <div className="planet-visual-wrap">
            <PlanetVisual planetKey={planetKey} />
          </div>
          <div className="planet-bar">
            <span className="pbar-item">Gravity <strong>{p.gravity}g</strong></span>
            <span className="pbar-item">Solar <strong>{(p.solarFlux * 100).toFixed(0)}%</strong></span>
            <span className="pbar-item">Dust storms <strong>{p.dustStorm > 0 ? (p.dustStorm * 100).toFixed(0) + "%/yr" : "none"}</strong></span>
            <span className="pbar-item">Radiation <strong>{p.radiation}</strong></span>
            <span className="pbar-item">Water ice <strong>{p.waterIce ? "yes" : "no"}</strong></span>
            <span className="pbar-item">Yield mod <strong>{(p.yieldMod * 100).toFixed(0)}%</strong></span>
            <span className="pbar-item">Recycling <strong>{p.waterRecycle}%</strong></span>
          </div>
        </div>

        {/* 2. Crop allocation — % share sliders + area size */}
        <div className="config-section">
          <div className="config-section-title">Crop Allocation</div>
          <div className="config-section-hint">Set the % share of greenhouse area per crop. Potatoes = calories, Beans = protein, Lettuce/Radish = micronutrients, Herbs = morale. Set total area below.</div>

          {/* Area size slider */}
          <div className="alloc-area-row">
            <span className="alloc-area-label">Total Area</span>
            <input type="range" min={2} max={600} step={1} value={Math.min(areaM2, 600)}
              onChange={e => { setAreaM2(+e.target.value); setSim(null) }} />
            <input
              type="number" min={2} max={99999} step={1}
              className="alloc-area-input"
              value={areaM2}
              onChange={e => {
                const v = Math.max(2, +e.target.value)
                setAreaM2(v)
                setSim(null)
              }}
            />
            <span className="alloc-area-unit">m2</span>
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
                    <span className="alloc-label" style={{ color: enabled ? "#ccc" : "#444" }}>{CROPS[k].label}</span>
                    <span className="alloc-val" style={{ color: enabled ? "#888" : "#333" }}>
                      {enabled ? <>{sharePct}% <span style={{ color: "#444", fontSize: "0.7rem" }}>({m2} m2)</span></> : "disabled"}
                    </span>
                    <button
                      className={"crop-toggle " + (enabled ? "crop-toggle-on" : "crop-toggle-off")}
                      onClick={() => { setCropEnabled(e => ({ ...e, [k]: !e[k] })); setSim(null) }}
                      title={enabled ? "Disable crop" : "Enable crop"}
                    >{enabled ? "ON" : "OFF"}</button>
                  </div>
                  <div className="alloc-meta" style={{ color: enabled ? "#444" : "#2a2a2a" }}>{CROPS[k].cycleDays}d cycle &middot; {CROPS[k].yieldKg}kg/m2 &middot; {CROPS[k].kcal} kcal/100g</div>
                  <input type="range" min={0} max={100} value={alloc[k]} disabled={!enabled}
                    style={{ opacity: enabled ? 1 : 0.25 }}
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
        <div className="mission-ctrl-grid">
          <div className="ctrl-block">
            <div className="ctrl-block-label">Start Mode</div>
            <div className="sim-btn-row">
              <button
                className={"sim-btn" + (!sim ? " sim-btn-new-active" : " primary")}
                onClick={() => initSim(0)}
              >New Mission (Sol 0)</button>
              <button
                className={"sim-btn" + (sim ? " sim-btn-join-active" : "")}
                onClick={() => initSim(127)}
              >Join Current (Sol 127)</button>
            </div>
          </div>
          <div className="ctrl-block">
            <div className="ctrl-block-label">Simulation Speed</div>
            <div className="sim-slider-row">
              <input type="range" min={1} max={15} value={speed} onChange={e => setSpeed(+e.target.value)} />
              <span>{speed}x</span>
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
              {sim && <button className="sim-btn sim-btn-reset" onClick={() => { setSim(null); setRunning(false) }}>Reset</button>}
            </div>
          </div>
        </div>
        {sim && (
          <div className="sim-day-display">
            <span>Sol {sim.day} / {MISSION_DAYS}</span>
            <div className="day-bar-bg"><div className="day-bar-fill" style={{ width: `${(sim.day / MISSION_DAYS) * 100}%` }} /></div>
            <span style={{ fontSize: "0.7rem", color: "#555" }}>{Math.round(sim.day / MISSION_DAYS * 100)}% complete</span>
          </div>
        )}
      </div>

      {/* Main sim area */}
      {sim ? (
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
                return (
                  <div key={i} className="field-cell" style={{ background: cellColor(c, sim.day) }}
                    title={`${CROPS[c.crop].label} | ${c.failed && age < c.cycleDays ? "FAILED" : Math.round(pct * 100) + "% grown"} | age ${age}d`}>
                    {c.failed && age < c.cycleDays && <span className="cell-fail">x</span>}
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
              <span className="legend-item"><span className="legend-dot" style={{ background: "#1e0808" }} />Failed</span>
            </div>
            {sim.kcalPerDay.length > 2 && (
              <div className="kcal-chart">
                <div className="kcal-chart-label">kcal / crew member / day (target: 3000)</div>
                <svg width="100%" height="56" viewBox={`0 0 ${sim.kcalPerDay.length} 56`} preserveAspectRatio="none">
                  <line x1="0" y1={56 - 3000 / 90} x2={sim.kcalPerDay.length} y2={56 - 3000 / 90}
                    stroke="#27ae60" strokeWidth="0.8" strokeDasharray="4 3" />
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
                  <div className="stat-card"><span>kcal/crew/day</span><strong style={{ color: scores.kcalPerDay >= 3000 ? "#27ae60" : "#c0392b" }}>{scores.kcalPerDay.toLocaleString()}</strong><small>target 3,000</small></div>
                  <div className="stat-card"><span>protein/crew/day</span><strong style={{ color: scores.proteinPerDay >= 90 ? "#27ae60" : "#c0392b" }}>{scores.proteinPerDay}g</strong><small>target 90g</small></div>
                  <div className="stat-card"><span>Water recycled</span><strong style={{ color: "#3498db" }}>{Math.round(sim.waterRecycledL).toLocaleString()}L</strong><small>{p.waterRecycle}% efficiency</small></div>
                  <div className="stat-card"><span>Net water used</span><strong>{Math.round(sim.waterUsedL).toLocaleString()}L</strong><small>after recycling</small></div>
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
                      <span className="counter-avg-val" style={{ color: scores.kcalPerDay >= 3000 ? "#27ae60" : "#c0392b" }}>
                        {scores.kcalPerDay.toLocaleString()} kcal
                      </span>
                      <span className="counter-goal-label">goal: 3,000</span>
                    </div>
                    <div className="counter-bar-bg">
                      <div className="counter-bar-fill" style={{
                        width: `${Math.min(100, (scores.kcalPerDay / 3000) * 100)}%`,
                        background: scores.kcalPerDay >= 3000 ? "#27ae60" : scores.kcalPerDay >= 2000 ? "#f39c12" : "#c0392b"
                      }} />
                      <div className="counter-bar-goal" style={{ left: "100%" }} />
                    </div>
                    <div className="counter-deficit" style={{ color: scores.kcalPerDay >= 3000 ? "#27ae60" : "#c0392b" }}>
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
                      <span className="counter-avg-val" style={{ color: scores.proteinPerDay >= 90 ? "#27ae60" : "#c0392b" }}>
                        {scores.proteinPerDay}g
                      </span>
                      <span className="counter-goal-label">goal: 90g</span>
                    </div>
                    <div className="counter-bar-bg">
                      <div className="counter-bar-fill" style={{
                        width: `${Math.min(100, (scores.proteinPerDay / 90) * 100)}%`,
                        background: scores.proteinPerDay >= 90 ? "#27ae60" : scores.proteinPerDay >= 60 ? "#f39c12" : "#c0392b"
                      }} />
                    </div>
                    <div className="counter-deficit" style={{ color: scores.proteinPerDay >= 90 ? "#27ae60" : "#c0392b" }}>
                      {scores.proteinPerDay >= 90
                        ? `+${(scores.proteinPerDay - 90)}g surplus`
                        : `${(90 - scores.proteinPerDay)}g deficit`}
                    </div>
                  </div>
                </div>
              </>
            )}
            {assessment && (
              <div className="ai-assessment">
                <div className="ai-assessment-title">
                  <span className="aws-tag aws-tag-sm">Bedrock AgentCore</span> Mission Assessment
                </div>
                <p className="ai-assessment-text">{assessment.text}</p>
                <div className="ai-recs">
                  {assessment.recs.map((r, i) => <div key={i} className="ai-rec-item">{r}</div>)}
                </div>
              </div>
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
      ) : (
        <div className="sim-idle">
          Configure planet and allocation above, then click "New Mission" or "Join Current" to start.
        </div>
      )}
    </div>
  )
}
