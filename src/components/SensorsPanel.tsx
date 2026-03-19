import './SensorsPanel.css';

const zones = ['A', 'B', 'C', 'D'];

const sensorData = {
  A: { temp: 22.1, humidity: 71, co2: 1180, light: 8200, water: 94, soil: 68 },
  B: { temp: 23.4, humidity: 58, co2: 1240, light: 7900, water: 71, soil: 52 },
  C: { temp: 21.8, humidity: 74, co2: 1150, light: 8500, water: 88, soil: 72 },
  D: { temp: 24.2, humidity: 65, co2: 1300, light: 7600, water: 95, soil: 61 },
};

function getStatus(key: string, value: number): string {
  const ranges: Record<string, [number, number, number, number]> = {
    temp:     [18, 20, 26, 28],
    humidity: [55, 60, 80, 85],
    co2:      [800, 1000, 1500, 2000],
    light:    [5000, 6000, 10000, 12000],
    water:    [60, 70, 100, 100],
    soil:     [50, 60, 80, 90],
  };
  const [cLow, wLow, wHigh, cHigh] = ranges[key] ?? [0, 0, 9999, 9999];
  if (value < cLow || value > cHigh) return 'status-crit';
  if (value < wLow || value > wHigh) return 'status-warn';
  return 'status-ok';
}

const sensors = [
  { key: 'temp', label: 'Temperature', unit: '°C', icon: '🌡️' },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: '💦' },
  { key: 'co2', label: 'CO₂', unit: 'ppm', icon: '🫧' },
  { key: 'light', label: 'Light', unit: 'lux', icon: '💡' },
  { key: 'water', label: 'Water Tank', unit: '%', icon: '💧' },
  { key: 'soil', label: 'Soil Moisture', unit: '%', icon: '🌍' },
];

export default function SensorsPanel() {
  return (
    <div className="sensors-panel">
      <h2 className="section-title">Environmental Monitoring</h2>
      <div className="zones-grid">
        {zones.map(zone => {
          const data = sensorData[zone as keyof typeof sensorData];
          return (
            <div className="card zone-card" key={zone}>
              <div className="zone-header">
                <span className="zone-label">Zone {zone}</span>
              </div>
              <div className="sensors-list">
                {sensors.map(s => {
                  const val = data[s.key as keyof typeof data];
                  const status = getStatus(s.key, val);
                  return (
                    <div className="sensor-row" key={s.key}>
                      <span className="sensor-icon">{s.icon}</span>
                      <span className="sensor-label">{s.label}</span>
                      <span className={`sensor-value ${status}`}>
                        {val}<span className="sensor-unit">{s.unit}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
