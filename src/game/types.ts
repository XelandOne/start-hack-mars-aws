/**
 * Core type definitions for Mars Base Simulation Game
 * Defines interfaces for game state, simulation engine, and data models
 */

// ============================================================================
// Core Simulation Types
// ============================================================================

export interface SimulationEngine {
  // State
  currentSol: number;
  timeAcceleration: 1 | 5 | 10 | 30;
  isPaused: boolean;
  gameState: GameState;
  
  // Methods
  start(): void;
  pause(): void;
  resume(): void;
  setTimeAcceleration(rate: 1 | 5 | 10 | 30): void;
  tick(): void;
  saveState(): void;
  loadState(state: GameState): void;
}

export interface GameState {
  version: string;
  missionSol: number;
  startTimestamp: number;
  lastSaveTimestamp: number;
  
  resources: ResourcesState;
  crops: CropState[];
  rockets: RocketMission[];
  incidents: Incident[];
  aiDecisions: AIDecision[];
  astronauts: AstronautState[];
  score: MissionScore;
  settings: GameSettings;
}

// ============================================================================
// Resource Management Types
// ============================================================================

export interface ResourcesState {
  water: ResourceSnapshot;
  energy: ResourceSnapshot;
  nutrients: ResourceSnapshot;
  co2: ResourceSnapshot;
}

export interface ResourceSnapshot {
  current: number;
  capacity: number;
  totalConsumed: number;
  totalResupplied: number;
  history: ResourceHistoryPoint[];
}

export interface ResourceHistoryPoint {
  sol: number;
  value: number;
}

export type ResourceType = 'water' | 'energy' | 'nutrients' | 'co2';

export interface ResourceStatus {
  level: number;
  percentage: number;
  daysRemaining: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  status: 'ok' | 'warning' | 'critical';
}

// ============================================================================
// Crop Management Types
// ============================================================================

export interface CropState {
  id: string;
  type: CropType;
  zone: number;
  plantedSol: number;
  growthStage: number; // 0.0 to 1.0
  health: number; // 0.0 to 1.0
  waterStress: number;
  temperatureStress: number;
}

export type CropType = 'lettuce' | 'potato' | 'radish' | 'bean' | 'pea' | 'herb';

export interface CropProfile {
  type: CropType;
  growthCycleSols: number;
  yieldPerM2: number; // kg
  caloriesPerKg: number;
  proteinPerKg: number;
  waterPerSol: number; // liters per m²
  energyPerSol: number; // kWh per m²
  nutrientsPerSol: number; // kg per m²
  optimalTemp: [number, number]; // [min, max] °C
  optimalHumidity: [number, number]; // [min, max] %
}

export interface EnvironmentalParams {
  temperature: number; // °C
  humidity: number; // %
  co2: number; // ppm
  lightIntensity: number; // µmol/m²/s
  pressure: number; // mbar
}

// ============================================================================
// Rocket System Types
// ============================================================================

export interface RocketMission {
  id: string;
  launchSol: number;
  arrivalSol: number;
  status: 'scheduled' | 'in-transit' | 'arrived' | 'delivered';
  cargo: Cargo;
  trajectory: TrajectoryPoint[];
}

export interface Cargo {
  water: number; // liters
  nutrients: number; // kg
  energy: number; // kWh
  co2: number; // kg
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  sol: number;
}

// ============================================================================
// Incident Management Types
// ============================================================================

export interface Incident {
  id: string;
  type: IncidentType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurredSol: number;
  detectedSol: number;
  resolvedSol: number | null;
  affectedSystems: string[];
  description: string;
  aiResponse: AIResponse | null;
}

export type IncidentType = 
  | 'water_efficiency_decline'
  | 'energy_budget_reduction'
  | 'temperature_failure'
  | 'co2_imbalance'
  | 'crop_disease_risk'
  | 'humidity_anomaly'
  | 'nutrient_depletion';

export interface AIResponse {
  analysisStartSol: number;
  analysisCompleteSol: number;
  actions: AIAction[];
  reasoning: string;
  knowledgeBaseQueries: string[];
}

export interface AIAction {
  type: string;
  parameters: Record<string, any>;
  executedSol: number;
  result: 'success' | 'partial' | 'failed';
}

// ============================================================================
// AI Agent Types
// ============================================================================

export interface AIDecision {
  sol: number;
  type: 'crop_selection' | 'incident_response' | 'optimization';
  reasoning: string;
  actions: AIAction[];
  outcome: string;
}

// ============================================================================
// Astronaut Types
// ============================================================================

export interface AstronautState {
  id: string;
  name: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  healthStatus: number; // 0.0 to 1.0
  nutritionalDeficits: string[];
}

// ============================================================================
// Scoring Types
// ============================================================================

export interface MissionScore {
  total: number;
  breakdown: {
    crewHealth: number; // 0-100
    resourceEfficiency: number; // 0-100
    incidentResponse: number; // 0-100
    cropYield: number; // 0-100
    nutritionalBalance: number; // 0-100
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedSol: number;
}

// ============================================================================
// Game Settings Types
// ============================================================================

export interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  initialResources: number; // multiplier
  incidentFrequency: number; // multiplier
  missionDuration: number; // Sols
}
