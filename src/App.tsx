import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import CropsPanel from './components/CropsPanel';
import SensorsPanel from './components/SensorsPanel';
import AgentPanel from './components/AgentPanel';
import MissionTimeline from './components/MissionTimeline';
import GameControls from './components/GameControls';
import ResourcePanel from './components/ResourcePanel';
import RocketStatus from './components/RocketStatus';
import EmergencyAlert from './components/EmergencyAlert';
import { SimulationEngine, GreenhouseSystem } from './game';
import type { ResourceStatus, ResourceType } from './game/types';
import './App.css';

type Tab = 'dashboard' | 'crops' | 'sensors' | 'agent' | 'mission';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [gameMode, setGameMode] = useState(false);
  
  // Game state
  const engineRef = useRef<SimulationEngine | null>(null);
  const [currentSol, setCurrentSol] = useState(0);
  const [timeAcceleration, setTimeAcceleration] = useState<1 | 5 | 10 | 30>(1);
  const [isPaused, setIsPaused] = useState(true);
  const [resources, setResources] = useState<Record<ResourceType, ResourceStatus>>({
    water: { level: 2000, percentage: 1, daysRemaining: Infinity, trend: 'stable', status: 'ok' },
    energy: { level: 5000, percentage: 1, daysRemaining: Infinity, trend: 'stable', status: 'ok' },
    nutrients: { level: 200, percentage: 1, daysRemaining: Infinity, trend: 'stable', status: 'ok' },
    co2: { level: 100, percentage: 1, daysRemaining: Infinity, trend: 'stable', status: 'ok' },
  });
  const [missions, setMissions] = useState<any[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [depletedResources, setDepletedResources] = useState<ResourceType[]>([]);

  // Initialize simulation engine
  useEffect(() => {
    if (gameMode && !engineRef.current) {
      engineRef.current = new SimulationEngine();
      
      // Schedule initial rocket mission
      const rocketSystem = engineRef.current.getRocketSystem();
      rocketSystem.autoSchedule(0);
      
      // Update UI state
      updateGameState();
    }
  }, [gameMode]);

  // Update game state from engine
  const updateGameState = () => {
    if (!engineRef.current) return;

    const engine = engineRef.current;
    const resourcePool = engine.getResourcePool();
    const rocketSystem = engine.getRocketSystem();
    const greenhouseSystem = engine.getGreenhouseSystem();

    setCurrentSol(engine.gameState.missionSol);
    setTimeAcceleration(engine.timeAcceleration);
    setIsPaused(engine.isPaused);

    // Update resources
    const newResources: Record<ResourceType, ResourceStatus> = {
      water: resourcePool.getStatus('water'),
      energy: resourcePool.getStatus('energy'),
      nutrients: resourcePool.getStatus('nutrients'),
      co2: resourcePool.getStatus('co2'),
    };
    setResources(newResources);

    // Update missions
    setMissions(rocketSystem.getAllMissions());

    // Update emergency status
    greenhouseSystem.updateEmergencyMode();
    setIsEmergency(greenhouseSystem.isEmergencyMode());
    setDepletedResources(greenhouseSystem.getDepletedResources());
  };

  // Poll for game state updates
  useEffect(() => {
    if (!gameMode || !engineRef.current) return;

    const interval = setInterval(() => {
      updateGameState();
    }, 100); // Update UI 10 times per second

    return () => clearInterval(interval);
  }, [gameMode]);

  const handlePlayPause = () => {
    if (!engineRef.current) return;

    if (engineRef.current.isPaused) {
      engineRef.current.start();
    } else {
      engineRef.current.pause();
    }
    updateGameState();
  };

  const handleTimeAccelerationChange = (rate: 1 | 5 | 10 | 30) => {
    if (!engineRef.current) return;
    engineRef.current.setTimeAcceleration(rate);
    updateGameState();
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🌍' },
    { id: 'crops', label: 'Crops', icon: '🌱' },
    { id: 'sensors', label: 'Environment', icon: '📡' },
    { id: 'agent', label: 'AI Agent', icon: '🤖' },
    { id: 'mission', label: 'Mission', icon: '🚀' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">🔴</span>
          <div>
            <h1>Mars Greenhouse</h1>
            <p>Autonomous Agriculture System</p>
          </div>
        </div>
        
        <div className="header-controls">
          <button
            className={`game-mode-toggle ${gameMode ? 'active' : ''}`}
            onClick={() => setGameMode(!gameMode)}
          >
            {gameMode ? '🎮 Game Mode' : '📊 Dashboard Mode'}
          </button>
        </div>

        <nav className="header-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {gameMode && (
          <div className="game-ui">
            <EmergencyAlert 
              isEmergency={isEmergency} 
              depletedResources={depletedResources} 
            />
            <GameControls
              currentSol={currentSol}
              timeAcceleration={timeAcceleration}
              isPaused={isPaused}
              onPlayPause={handlePlayPause}
              onTimeAccelerationChange={handleTimeAccelerationChange}
            />
            <ResourcePanel resources={resources} />
            <RocketStatus missions={missions} currentSol={currentSol} />
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'crops' && <CropsPanel />}
        {activeTab === 'sensors' && <SensorsPanel />}
        {activeTab === 'agent' && <AgentPanel />}
        {activeTab === 'mission' && <MissionTimeline />}
      </main>
    </div>
  );
}
