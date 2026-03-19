/**
 * RocketStatus - Display rocket missions and status
 * Requirements: 2.2, 2.5
 */

import { RocketMission } from '../game/types';
import './RocketStatus.css';

interface RocketStatusProps {
  missions: RocketMission[];
  currentSol: number;
}

export default function RocketStatus({ missions, currentSol }: RocketStatusProps) {
  const activeMissions = missions.filter(m => m.status !== 'delivered');

  return (
    <div className="rocket-status">
      <h3 className="panel-title">🚀 Resupply Missions</h3>
      
      {activeMissions.length === 0 ? (
        <div className="no-missions">No active missions</div>
      ) : (
        <div className="missions-list">
          {activeMissions.map(mission => {
            const progress = mission.status === 'scheduled' 
              ? 0 
              : Math.min(100, ((currentSol - mission.launchSol) / (mission.arrivalSol - mission.launchSol)) * 100);
            
            const eta = mission.arrivalSol - currentSol;

            return (
              <div key={mission.id} className={`mission-card ${mission.status}`}>
                <div className="mission-header">
                  <span className="mission-id">{mission.id}</span>
                  <span className={`mission-status-badge ${mission.status}`}>
                    {mission.status === 'scheduled' && '📅 Scheduled'}
                    {mission.status === 'in-transit' && '🚀 In Transit'}
                    {mission.status === 'arrived' && '✅ Arrived'}
                  </span>
                </div>

                <div className="mission-timeline">
                  <div className="timeline-point">
                    <span className="timeline-label">Launch</span>
                    <span className="timeline-value">Sol {mission.launchSol}</span>
                  </div>
                  <div className="timeline-progress">
                    <div 
                      className="timeline-bar" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="timeline-point">
                    <span className="timeline-label">Arrival</span>
                    <span className="timeline-value">Sol {mission.arrivalSol}</span>
                  </div>
                </div>

                {mission.status === 'in-transit' && (
                  <div className="mission-eta">
                    ETA: {eta} Sols
                  </div>
                )}

                <div className="mission-cargo">
                  <span className="cargo-label">Cargo:</span>
                  <div className="cargo-items">
                    <span>💧 {mission.cargo.water}L</span>
                    <span>⚡ {mission.cargo.energy}kWh</span>
                    <span>🧪 {mission.cargo.nutrients}kg</span>
                    <span>🌫️ {mission.cargo.co2}kg</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
