/**
 * Game module exports
 * Central export point for all game-related types and classes
 */

// Core engine
export { SimulationEngine } from './SimulationEngine';

// Resource management
export { ResourcePool } from './ResourcePool';

// Greenhouse management
export { GreenhouseSystem } from './GreenhouseSystem';

// Type definitions
export type {
  // Core types
  SimulationEngine as ISimulationEngine,
  GameState,
  GameSettings,
  
  // Resources
  ResourcesState,
  ResourceSnapshot,
  ResourceHistoryPoint,
  ResourceType,
  ResourceStatus,
  
  // Crops
  CropState,
  CropType,
  CropProfile,
  EnvironmentalParams,
  
  // Rockets
  RocketMission,
  Cargo,
  TrajectoryPoint,
  
  // Incidents
  Incident,
  IncidentType,
  AIResponse,
  AIAction,
  
  // AI
  AIDecision,
  
  // Astronauts
  AstronautState,
  
  // Scoring
  MissionScore,
  Achievement
} from './types';
