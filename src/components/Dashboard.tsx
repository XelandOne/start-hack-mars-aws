import './Dashboard.css';

const stats = [
  { label: 'Mission Day', value: '127', unit: '/ 450', icon: '🚀', color: 'var(--accent-blue)' },
  { label: 'Active Crops', value: '8', unit: 'zones', icon: '🌱', color: 'var(--accent-green)' },
  { label: 'Calories Today', value: '1,840', unit: 'kcal', icon: '⚡', color: 'var(--accent-yellow)' },
  { label: 'Water Used', value: '42.3', unit: 'L/day', icon: '💧', color: 'var(--accent-blue)' },
  { label: 'Avg Temp', value: '22.4', unit: '°C', icon: '🌡️', color: 'var(--accent-orange)' },
  { label: 'CO₂ Level', value: '1,200', unit: 'ppm', icon: '🫧', color: 'var(--accent-green)' },
  { label: 'Humidity', value: '68', unit: '%', icon: '💦', color: 'var(--accent-blue)' },
  { label: 'Power Used', value: '18.7', unit: 'kWh', icon: '🔋', color: 'var(--accent-yellow)' },
];

const alerts = [
  { severity: 'warn', message: 'Zone B humidity dropping — check irrigation valve', time: '12 min ago' },
  { severity: 'info', message: 'Lettuce batch #3 ready for harvest in 4 days', time: '1 hr ago' },
  { severity: 'ok', message: 'AI agent optimized water schedule — saving 8% today', time: '3 hr ago' },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {stats.map(s => (
          <div className="card stat-card" key={s.label}>
            <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
            <div className="card-title">{s.label}</div>
            <div className="card-value">
              {s.value}
              <span className="card-unit">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-bottom">
        <div className="card alerts-card">
          <div className="section-title">Recent Alerts</div>
          <div className="alerts-list">
            {alerts.map((a, i) => (
              <div className="alert-item" key={i}>
                <span className={`status-badge status-${a.severity}`}>{a.severity}</span>
                <span className="alert-msg">{a.message}</span>
                <span className="alert-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card mission-progress-card">
          <div className="section-title">Mission Progress</div>
          <div className="progress-bar-wrap">
            <div className="progress-label">
              <span>Day 127</span><span>Day 450</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(127 / 450) * 100}%` }} />
            </div>
            <div className="progress-pct">{((127 / 450) * 100).toFixed(1)}% complete</div>
          </div>
          <div className="phase-badge">
            <span className="status-badge status-info">Early Growth Phase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
