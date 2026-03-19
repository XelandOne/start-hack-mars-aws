import './MissionTimeline.css';

const TOTAL_DAYS = 450;
const CURRENT_DAY = 127;

const phases = [
  { name: 'Setup & Germination', start: 1, end: 30, color: '#4fc3f7' },
  { name: 'Early Growth', start: 31, end: 150, color: '#00ff88' },
  { name: 'Peak Production', start: 151, end: 320, color: '#ffd700' },
  { name: 'Late Mission', start: 321, end: 450, color: '#ff6b35' },
];

const milestones = [
  { day: 30, label: 'First Harvest', icon: '🌾' },
  { day: 85, label: 'Lettuce Cycle 2', icon: '🥬' },
  { day: 127, label: 'Today', icon: '📍', current: true },
  { day: 160, label: 'Potato Harvest', icon: '🥔' },
  { day: 200, label: 'Full Capacity', icon: '🚀' },
  { day: 320, label: 'Wind-Down Begins', icon: '⏳' },
  { day: 450, label: 'Mission End', icon: '🏁' },
];

const nutritionData = [
  { label: 'Lettuce', kcal: 520, color: '#00ff88' },
  { label: 'Potatoes', kcal: 840, color: '#ffd700' },
  { label: 'Beans', kcal: 310, color: '#ff6b35' },
  { label: 'Radishes', kcal: 95, color: '#4fc3f7' },
  { label: 'Herbs', kcal: 75, color: '#c084fc' },
];

const totalKcal = nutritionData.reduce((s, n) => s + n.kcal, 0);
const crewTarget = 2000 * 4; // 4 astronauts × 2000 kcal

export default function MissionTimeline() {
  return (
    <div className="mission-panel">
      <h2 className="section-title">Mission Timeline — 450 Days</h2>

      {/* Phase bar */}
      <div className="card timeline-card">
        <div className="phase-track">
          {phases.map(p => (
            <div
              key={p.name}
              className="phase-segment"
              style={{
                left: `${((p.start - 1) / TOTAL_DAYS) * 100}%`,
                width: `${((p.end - p.start + 1) / TOTAL_DAYS) * 100}%`,
                background: p.color + '33',
                borderTop: `3px solid ${p.color}`,
              }}
            >
              <span className="phase-name" style={{ color: p.color }}>{p.name}</span>
            </div>
          ))}
          {/* Current day marker */}
          <div
            className="day-marker"
            style={{ left: `${((CURRENT_DAY - 1) / TOTAL_DAYS) * 100}%` }}
          />
        </div>

        {/* Milestones */}
        <div className="milestones-track">
          {milestones.map(m => (
            <div
              key={m.day}
              className={`milestone ${m.current ? 'current' : ''}`}
              style={{ left: `${((m.day - 1) / TOTAL_DAYS) * 100}%` }}
            >
              <span className="milestone-icon">{m.icon}</span>
              <span className="milestone-label">{m.label}</span>
              <span className="milestone-day">Day {m.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mission-bottom">
        {/* Nutrition breakdown */}
        <div className="card nutrition-card">
          <div className="section-title" style={{ fontSize: '1rem' }}>Daily Calorie Production</div>
          <div className="nutrition-bars">
            {nutritionData.map(n => (
              <div className="nutrition-row" key={n.label}>
                <span className="nutrition-label">{n.label}</span>
                <div className="nutrition-track">
                  <div
                    className="nutrition-fill"
                    style={{ width: `${(n.kcal / crewTarget) * 100}%`, background: n.color }}
                  />
                </div>
                <span className="nutrition-val">{n.kcal} kcal</span>
              </div>
            ))}
          </div>
          <div className="nutrition-total">
            <span>Total: {totalKcal.toLocaleString()} kcal</span>
            <span className={totalKcal >= crewTarget ? 'status-ok' : 'status-warn'}>
              {totalKcal >= crewTarget ? '✓ Crew target met' : `⚠ ${crewTarget - totalKcal} kcal short`}
            </span>
          </div>
        </div>

        {/* Key stats */}
        <div className="card mission-stats-card">
          <div className="section-title" style={{ fontSize: '1rem' }}>Mission Stats</div>
          <div className="mission-stats-list">
            {[
              { label: 'Days Remaining', value: `${TOTAL_DAYS - CURRENT_DAY}`, unit: 'days' },
              { label: 'Crew Size', value: '4', unit: 'astronauts' },
              { label: 'Total Harvests', value: '7', unit: 'completed' },
              { label: 'Water Recycled', value: '94', unit: '%' },
              { label: 'Power Efficiency', value: '87', unit: '%' },
              { label: 'Crop Success Rate', value: '89', unit: '%' },
            ].map(s => (
              <div className="mission-stat-row" key={s.label}>
                <span className="mission-stat-label">{s.label}</span>
                <span className="mission-stat-value">{s.value} <span className="card-unit">{s.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
