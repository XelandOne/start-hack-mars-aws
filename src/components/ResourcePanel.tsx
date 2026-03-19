/**
 * ResourcePanel - Display resource levels with warnings
 * Requirements: 4.2, 4.4
 */

import { ResourceStatus, ResourceType } from '../game/types';
import './ResourcePanel.css';

interface ResourcePanelProps {
  resources: Record<ResourceType, ResourceStatus>;
}

const resourceConfig = {
  water: { label: 'Water', icon: '💧', unit: 'L', color: '#4fc3f7' },
  energy: { label: 'Energy', icon: '⚡', unit: 'kWh', color: '#ffd54f' },
  nutrients: { label: 'Nutrients', icon: '🧪', unit: 'kg', color: '#81c784' },
  co2: { label: 'CO₂', icon: '🌫️', unit: 'kg', color: '#9575cd' },
};

export default function ResourcePanel({ resources }: ResourcePanelProps) {
  return (
    <div className="resource-panel">
      <h3 className="panel-title">Resource Status</h3>
      <div className="resource-grid">
        {(Object.keys(resourceConfig) as ResourceType[]).map(type => {
          const config = resourceConfig[type];
          const status = resources[type];
          const percentage = Math.round(status.percentage * 100);

          return (
            <div key={type} className={`resource-card ${status.status}`}>
              <div className="resource-header">
                <span className="resource-icon">{config.icon}</span>
                <span className="resource-label">{config.label}</span>
              </div>

              <div className="resource-value">
                {Math.round(status.level)} {config.unit}
              </div>

              <div className="resource-bar-container">
                <div
                  className="resource-bar"
                  style={{
                    width: `${percentage}%`,
                    background: config.color,
                  }}
                />
              </div>

              <div className="resource-stats">
                <span className="resource-percentage">{percentage}%</span>
                {status.daysRemaining !== Infinity && (
                  <span className="resource-days">
                    {Math.round(status.daysRemaining)} Sols left
                  </span>
                )}
              </div>

              {status.status === 'warning' && (
                <div className="resource-warning">⚠️ Low</div>
              )}
              {status.status === 'critical' && (
                <div className="resource-critical">🚨 Depleted</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
