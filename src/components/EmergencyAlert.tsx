/**
 * EmergencyAlert - Display critical alerts when resources are depleted
 */

import { ResourceType } from '../game/types';
import './EmergencyAlert.css';

interface EmergencyAlertProps {
  depletedResources: ResourceType[];
  isEmergency: boolean;
}

const resourceLabels: Record<ResourceType, string> = {
  water: '💧 Water',
  energy: '⚡ Energy',
  nutrients: '🧪 Nutrients',
  co2: '🌫️ CO₂',
};

export default function EmergencyAlert({ depletedResources, isEmergency }: EmergencyAlertProps) {
  if (!isEmergency || depletedResources.length === 0) {
    return null;
  }

  return (
    <div className="emergency-alert">
      <div className="alert-header">
        <span className="alert-icon">🚨</span>
        <h3>EMERGENCY MODE ACTIVATED</h3>
      </div>
      <div className="alert-body">
        <p className="alert-message">
          Critical resource depletion detected. Operations reduced to conserve remaining resources.
        </p>
        <div className="depleted-resources">
          <strong>Depleted Resources:</strong>
          <div className="resource-list">
            {depletedResources.map(resource => (
              <span key={resource} className="depleted-badge">
                {resourceLabels[resource]}
              </span>
            ))}
          </div>
        </div>
        <div className="alert-action">
          <p>⏳ Waiting for resupply mission arrival...</p>
        </div>
      </div>
    </div>
  );
}
