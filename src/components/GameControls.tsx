/**
 * GameControls - Time acceleration and simulation controls
 * Requirements: 1.2, 1.4
 */

import { useState, useEffect } from 'react';
import './GameControls.css';

interface GameControlsProps {
  currentSol: number;
  timeAcceleration: 1 | 5 | 10 | 30;
  isPaused: boolean;
  onPlayPause: () => void;
  onTimeAccelerationChange: (rate: 1 | 5 | 10 | 30) => void;
}

export default function GameControls({
  currentSol,
  timeAcceleration,
  isPaused,
  onPlayPause,
  onTimeAccelerationChange,
}: GameControlsProps) {
  const [earthTime, setEarthTime] = useState('');

  useEffect(() => {
    // Calculate Earth time equivalent (1 Sol ≈ 24.6 hours)
    const totalHours = currentSol * 24.6;
    const days = Math.floor(totalHours / 24);
    const hours = Math.floor(totalHours % 24);
    setEarthTime(`${days}d ${hours}h`);
  }, [currentSol]);

  const accelerationRates: (1 | 5 | 10 | 30)[] = [1, 5, 10, 30];

  return (
    <div className="game-controls">
      <div className="time-display">
        <div className="time-stat">
          <span className="time-label">Sol</span>
          <span className="time-value">{currentSol}</span>
        </div>
        <div className="time-stat">
          <span className="time-label">Mission Day</span>
          <span className="time-value">{currentSol + 1}</span>
        </div>
        <div className="time-stat">
          <span className="time-label">Earth Time</span>
          <span className="time-value">{earthTime}</span>
        </div>
      </div>

      <div className="control-buttons">
        <button
          className={`control-btn ${isPaused ? 'play' : 'pause'}`}
          onClick={onPlayPause}
          title={isPaused ? 'Start Simulation' : 'Pause Simulation'}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>

        <div className="acceleration-controls">
          <span className="acceleration-label">Speed:</span>
          {accelerationRates.map(rate => (
            <button
              key={rate}
              className={`acceleration-btn ${timeAcceleration === rate ? 'active' : ''}`}
              onClick={() => onTimeAccelerationChange(rate)}
              disabled={isPaused}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
