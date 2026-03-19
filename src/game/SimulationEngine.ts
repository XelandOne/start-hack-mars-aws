/**
 * SimulationEngine - Core game loop and state management
 * Manages time progression, simulation ticks, and state updates
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import type { 
  SimulationEngine as ISimulationEngine,
  GameState,
  ResourcesState,
  MissionScore,
  GameSettings
} from './types';
import { RocketSystem } from './RocketSystem';
import { ResourcePool } from './ResourcePool';
import { GreenhouseSystem } from './GreenhouseSystem';

const BASE_TICK_RATE = 100; // milliseconds
const AUTO_SAVE_INTERVAL = 10; // Sols

export class SimulationEngine implements ISimulationEngine {
  // State properties
  currentSol: number = 0;
  timeAcceleration: 1 | 5 | 10 | 30 = 1;
  isPaused: boolean = true;
  gameState: GameState;
  
  // Internal state
  private tickInterval: number | null = null;
  private lastTickTime: number = 0;
  private accumulatedTime: number = 0;
  private lastAutoSaveSol: number = 0;

  // Subsystems
  private rocketSystem: RocketSystem;
  private resourcePool: ResourcePool;
  private greenhouseSystem: GreenhouseSystem;
  private lastResourceUpdateSol: number = 0;

  constructor(initialState?: GameState) {
    if (initialState) {
      this.gameState = initialState;
      this.currentSol = initialState.missionSol;
    } else {
      this.gameState = this.createInitialGameState();
    }

    // Initialize subsystems
    this.rocketSystem = new RocketSystem();
    this.resourcePool = new ResourcePool();
    this.greenhouseSystem = new GreenhouseSystem(this.resourcePool);

    // Set base consumption rates (habitat + minimal operations)
    this.resourcePool.setConsumptionRate('water', 10); // 10L per Sol
    this.resourcePool.setConsumptionRate('energy', 50); // 50kWh per Sol

    // Load subsystem state if available
    if (initialState) {
      this.rocketSystem.loadSnapshot(initialState.rockets);
      this.resourcePool.loadSnapshot(initialState.resources);
      this.lastResourceUpdateSol = initialState.missionSol;
    }
  }

  /**
   * Start the simulation loop
   */
  start(): void {
    if (!this.isPaused) {
      return; // Already running
    }

    this.isPaused = false;
    this.lastTickTime = performance.now();
    this.startTickLoop();
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (this.isPaused) {
      return; // Already paused
    }

    this.isPaused = true;
    this.stopTickLoop();
    this.saveState();
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    this.start();
  }

  /**
   * Set time acceleration rate
   * Updates tick rate within 100ms as per requirement 1.3
   */
  setTimeAcceleration(rate: 1 | 5 | 10 | 30): void {
    const validRates: (1 | 5 | 10 | 30)[] = [1, 5, 10, 30];
    if (!validRates.includes(rate)) {
      throw new Error(`Invalid time acceleration rate: ${rate}. Must be one of ${validRates.join(', ')}`);
    }

    this.timeAcceleration = rate;
    
    // Restart tick loop with new rate if running
    if (!this.isPaused) {
      this.stopTickLoop();
      this.startTickLoop();
    }
  }

  /**
   * Process a single simulation tick
   * Called at intervals based on time acceleration
   */
  tick(): void {
    if (this.isPaused) {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTickTime;
    this.lastTickTime = currentTime;

    // Calculate simulation time advancement
    // Base tick rate is 100ms, acceleration multiplies this
    const simulationDelta = (deltaTime / 1000) * this.timeAcceleration;
    this.accumulatedTime += simulationDelta;

    // Advance Sol counter (1 Sol = 24.6 hours = 88,560 seconds)
    const SECONDS_PER_SOL = 88560;
    const solsAdvanced = this.accumulatedTime / SECONDS_PER_SOL;
    
    if (solsAdvanced >= 0.001) { // Advance in small increments
      this.currentSol += solsAdvanced;
      const newSol = Math.floor(this.currentSol);
      const solChanged = newSol !== this.gameState.missionSol;
      this.gameState.missionSol = newSol;

      // Only process per-Sol updates when Sol actually changes
      if (solChanged) {
        // Consume resources based on consumption rates
        const solsPassed = this.gameState.missionSol - this.lastResourceUpdateSol;
        if (solsPassed > 0) {
          this.resourcePool.consume('water', this.resourcePool.getConsumptionRate('water') * solsPassed);
          this.resourcePool.consume('energy', this.resourcePool.getConsumptionRate('energy') * solsPassed);
          this.lastResourceUpdateSol = this.gameState.missionSol;
        }

        // Record resource history
        this.resourcePool.recordHistory(this.gameState.missionSol);

        // Auto-schedule rocket missions
        this.rocketSystem.autoSchedule(this.gameState.missionSol);
      }

      // Update rocket missions and handle arrivals
      const arrivedMissions = this.rocketSystem.updateMissions(this.gameState.missionSol);
      
      // Deliver cargo from arrived rockets
      for (const mission of arrivedMissions) {
        // Add cargo to resource pool
        this.resourcePool.resupply('water', mission.cargo.water);
        this.resourcePool.resupply('energy', mission.cargo.energy);
        this.resourcePool.resupply('nutrients', mission.cargo.nutrients);
        this.resourcePool.resupply('co2', mission.cargo.co2);
        
        // Mark mission as delivered
        this.rocketSystem.markAsDelivered(mission.id);
      }

      // Sync rocket missions to game state
      this.gameState.rockets = this.rocketSystem.getSnapshot();
      
      // Sync resource pool to game state
      this.gameState.resources = this.resourcePool.getSnapshot();

      this.accumulatedTime = 0;

      // Auto-save every 10 Sols
      if (this.gameState.missionSol - this.lastAutoSaveSol >= AUTO_SAVE_INTERVAL) {
        this.saveState();
        this.lastAutoSaveSol = this.gameState.missionSol;
      }
    }

    // Update game state timestamp
    this.gameState.lastSaveTimestamp = Date.now();
  }

  /**
   * Save current game state to localStorage
   */
  saveState(): void {
    try {
      const stateJson = JSON.stringify(this.gameState);
      localStorage.setItem('mars-sim-game-state', stateJson);
      localStorage.setItem('mars-sim-game-metadata', JSON.stringify({
        lastSaved: Date.now(),
        missionSol: this.gameState.missionSol,
        timeAcceleration: this.timeAcceleration
      }));
    } catch (error) {
      console.error('Failed to save game state:', error);
      // Handle storage quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please free up space or export your game.');
      }
    }
  }

  /**
   * Load game state from saved data
   */
  loadState(state: GameState): void {
    try {
      // Validate state structure
      this.validateGameState(state);
      
      this.gameState = state;
      this.currentSol = state.missionSol;
      this.lastAutoSaveSol = Math.floor(state.missionSol / AUTO_SAVE_INTERVAL) * AUTO_SAVE_INTERVAL;
      
      console.log(`Game state loaded: Sol ${state.missionSol}`);
    } catch (error) {
      console.error('Failed to load game state:', error);
      throw new Error('Invalid game state data');
    }
  }

  /**
   * Load game state from localStorage
   */
  static loadFromStorage(): SimulationEngine | null {
    try {
      const stateJson = localStorage.getItem('mars-sim-game-state');
      if (!stateJson) {
        return null;
      }

      const state = JSON.parse(stateJson) as GameState;
      return new SimulationEngine(state);
    } catch (error) {
      console.error('Failed to load game from storage:', error);
      return null;
    }
  }

  /**
   * Export game state as JSON for sharing
   */
  exportState(): string {
    return JSON.stringify(this.gameState, null, 2);
  }

  /**
   * Import game state from JSON
   */
  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson) as GameState;
      this.loadState(state);
    } catch (error) {
      console.error('Failed to import game state:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Get the rocket system instance for external access
   */
  getRocketSystem(): RocketSystem {
    return this.rocketSystem;
  }

  /**
   * Get the resource pool instance for external access
   */
  getResourcePool(): ResourcePool {
    return this.resourcePool;
  }

  /**
   * Get the greenhouse system instance for external access
   */
  getGreenhouseSystem(): GreenhouseSystem {
    return this.greenhouseSystem;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startTickLoop(): void {
    const tickRate = BASE_TICK_RATE;
    this.tickInterval = window.setInterval(() => {
      this.tick();
    }, tickRate);
  }

  private stopTickLoop(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private createInitialGameState(): GameState {
    const now = Date.now();
    
    return {
      version: '1.0.0',
      missionSol: 0,
      startTimestamp: now,
      lastSaveTimestamp: now,
      
      resources: this.createInitialResources(),
      crops: [],
      rockets: [],
      incidents: [],
      aiDecisions: [],
      astronauts: this.createInitialAstronauts(),
      score: this.createInitialScore(),
      settings: this.createDefaultSettings()
    };
  }

  private createInitialResources(): ResourcesState {
    return {
      water: {
        current: 2000,
        capacity: 2000,
        totalConsumed: 0,
        totalResupplied: 0,
        history: []
      },
      energy: {
        current: 5000,
        capacity: 5000,
        totalConsumed: 0,
        totalResupplied: 0,
        history: []
      },
      nutrients: {
        current: 200,
        capacity: 200,
        totalConsumed: 0,
        totalResupplied: 0,
        history: []
      },
      co2: {
        current: 100,
        capacity: 100,
        totalConsumed: 0,
        totalResupplied: 0,
        history: []
      }
    };
  }

  private createInitialAstronauts() {
    return [
      {
        id: 'astro-1',
        name: 'Commander Sarah Chen',
        caloriesConsumed: 0,
        proteinConsumed: 0,
        healthStatus: 1.0,
        nutritionalDeficits: []
      },
      {
        id: 'astro-2',
        name: 'Dr. James Rodriguez',
        caloriesConsumed: 0,
        proteinConsumed: 0,
        healthStatus: 1.0,
        nutritionalDeficits: []
      },
      {
        id: 'astro-3',
        name: 'Engineer Maya Patel',
        caloriesConsumed: 0,
        proteinConsumed: 0,
        healthStatus: 1.0,
        nutritionalDeficits: []
      },
      {
        id: 'astro-4',
        name: 'Botanist Alex Kim',
        caloriesConsumed: 0,
        proteinConsumed: 0,
        healthStatus: 1.0,
        nutritionalDeficits: []
      }
    ];
  }

  private createInitialScore(): MissionScore {
    return {
      total: 0,
      breakdown: {
        crewHealth: 100,
        resourceEfficiency: 100,
        incidentResponse: 100,
        cropYield: 100,
        nutritionalBalance: 100
      }
    };
  }

  private createDefaultSettings(): GameSettings {
    return {
      difficulty: 'normal',
      initialResources: 1.0,
      incidentFrequency: 1.0,
      missionDuration: 450
    };
  }

  private validateGameState(state: GameState): void {
    if (!state.version || typeof state.missionSol !== 'number') {
      throw new Error('Invalid game state structure');
    }
    
    if (!state.resources || !state.resources.water || !state.resources.energy) {
      throw new Error('Invalid resources structure');
    }
    
    if (!Array.isArray(state.crops) || !Array.isArray(state.astronauts)) {
      throw new Error('Invalid arrays in game state');
    }
  }
}
