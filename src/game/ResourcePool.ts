/**
 * ResourcePool - Manages consumable resources for Mars Base Simulation
 * Tracks water, energy, nutrients, and CO₂ with consumption, resupply, and warning thresholds
 */

import type { ResourceType, ResourceStatus, ResourceSnapshot, ResourceHistoryPoint } from './types';

interface Resource {
  current: number;
  capacity: number;
  consumptionRate: number; // per Sol
  warningThreshold: number; // percentage (e.g., 0.20 for 20%)
}

export class ResourcePool {
  private resources: Record<ResourceType, Resource>;
  private history: Record<ResourceType, ResourceHistoryPoint[]>;
  private totalConsumed: Record<ResourceType, number>;
  private totalResupplied: Record<ResourceType, number>;
  private readonly maxHistoryLength = 30; // Last 30 Sols

  constructor() {
    // Initialize resources with default capacities from design doc
    this.resources = {
      water: {
        current: 2000, // liters
        capacity: 2000,
        consumptionRate: 0,
        warningThreshold: 0.20, // 20%
      },
      energy: {
        current: 5000, // kWh
        capacity: 5000,
        consumptionRate: 0,
        warningThreshold: 0.20,
      },
      nutrients: {
        current: 200, // kg
        capacity: 200,
        consumptionRate: 0,
        warningThreshold: 0.20,
      },
      co2: {
        current: 100, // kg
        capacity: 100,
        consumptionRate: 0,
        warningThreshold: 0.20,
      },
    };

    this.history = {
      water: [],
      energy: [],
      nutrients: [],
      co2: [],
    };

    this.totalConsumed = {
      water: 0,
      energy: 0,
      nutrients: 0,
      co2: 0,
    };

    this.totalResupplied = {
      water: 0,
      energy: 0,
      nutrients: 0,
      co2: 0,
    };
  }

  /**
   * Consume a specified amount of a resource
   * @param type - Resource type to consume
   * @param amount - Amount to consume
   * @returns true if consumption successful, false if insufficient resources
   */
  consume(type: ResourceType, amount: number): boolean {
    if (amount < 0) {
      throw new Error(`Cannot consume negative amount: ${amount}`);
    }

    const resource = this.resources[type];
    
    if (resource.current < amount) {
      // Insufficient resources - consume what's available
      const consumed = resource.current;
      resource.current = 0;
      this.totalConsumed[type] += consumed;
      return false;
    }

    resource.current -= amount;
    this.totalConsumed[type] += amount;
    return true;
  }

  /**
   * Resupply a specified amount of a resource
   * @param type - Resource type to resupply
   * @param amount - Amount to add
   */
  resupply(type: ResourceType, amount: number): void {
    if (amount < 0) {
      throw new Error(`Cannot resupply negative amount: ${amount}`);
    }

    const resource = this.resources[type];
    resource.current = Math.min(resource.current + amount, resource.capacity);
    this.totalResupplied[type] += amount;
  }

  /**
   * Get the current status of a resource
   * @param type - Resource type to check
   * @returns ResourceStatus with level, percentage, days remaining, trend, and status
   */
  getStatus(type: ResourceType): ResourceStatus {
    const resource = this.resources[type];
    const percentage = resource.capacity > 0 ? resource.current / resource.capacity : 0;
    const daysRemaining = resource.consumptionRate > 0 
      ? resource.current / resource.consumptionRate 
      : Infinity;

    // Determine trend based on recent history
    const trend = this.calculateTrend(type);

    // Determine status based on percentage
    let status: 'ok' | 'warning' | 'critical';
    if (resource.current === 0) {
      status = 'critical';
    } else if (percentage <= resource.warningThreshold) {
      status = 'warning';
    } else {
      status = 'ok';
    }

    return {
      level: resource.current,
      percentage,
      daysRemaining,
      trend,
      status,
    };
  }

  /**
   * Update consumption rate for a resource
   * @param type - Resource type
   * @param rate - New consumption rate per Sol
   */
  setConsumptionRate(type: ResourceType, rate: number): void {
    if (rate < 0) {
      throw new Error(`Consumption rate cannot be negative: ${rate}`);
    }
    this.resources[type].consumptionRate = rate;
  }

  /**
   * Get current consumption rate for a resource
   * @param type - Resource type
   * @returns Current consumption rate per Sol
   */
  getConsumptionRate(type: ResourceType): number {
    return this.resources[type].consumptionRate;
  }

  /**
   * Record resource level in history for a given Sol
   * @param sol - Current mission Sol
   */
  recordHistory(sol: number): void {
    for (const type of ['water', 'energy', 'nutrients', 'co2'] as ResourceType[]) {
      const history = this.history[type];
      
      // Add new history point
      history.push({
        sol,
        value: this.resources[type].current,
      });

      // Keep only last 30 Sols
      if (history.length > this.maxHistoryLength) {
        history.shift();
      }
    }
  }

  /**
   * Get resource history for a specific type
   * @param type - Resource type
   * @returns Array of history points
   */
  getHistory(type: ResourceType): ResourceHistoryPoint[] {
    return [...this.history[type]];
  }

  /**
   * Calculate trend based on recent history
   * @param type - Resource type
   * @returns Trend direction
   */
  private calculateTrend(type: ResourceType): 'increasing' | 'stable' | 'decreasing' {
    const history = this.history[type];
    
    if (history.length < 2) {
      return 'stable';
    }

    // Compare current level to average of last 5 data points
    const recentHistory = history.slice(-5);
    const average = recentHistory.reduce((sum, point) => sum + point.value, 0) / recentHistory.length;
    const current = this.resources[type].current;

    const threshold = 0.05; // 5% change threshold
    const change = (current - average) / average;

    if (change > threshold) {
      return 'increasing';
    } else if (change < -threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Get snapshot of all resources for game state persistence
   * @returns ResourcesState object
   */
  getSnapshot(): Record<ResourceType, ResourceSnapshot> {
    const snapshot: Record<string, ResourceSnapshot> = {};
    
    for (const type of ['water', 'energy', 'nutrients', 'co2'] as ResourceType[]) {
      snapshot[type] = {
        current: this.resources[type].current,
        capacity: this.resources[type].capacity,
        totalConsumed: this.totalConsumed[type],
        totalResupplied: this.totalResupplied[type],
        history: [...this.history[type]],
      };
    }

    return snapshot as Record<ResourceType, ResourceSnapshot>;
  }

  /**
   * Restore resource pool from a snapshot
   * @param snapshot - ResourcesState from saved game
   */
  loadSnapshot(snapshot: Record<ResourceType, ResourceSnapshot>): void {
    for (const type of ['water', 'energy', 'nutrients', 'co2'] as ResourceType[]) {
      const snap = snapshot[type];
      if (snap) {
        this.resources[type].current = snap.current;
        this.resources[type].capacity = snap.capacity;
        this.totalConsumed[type] = snap.totalConsumed;
        this.totalResupplied[type] = snap.totalResupplied;
        this.history[type] = [...snap.history];
      }
    }
  }

  /**
   * Check if any resource is at critical level (0%)
   * @returns true if any resource is depleted
   */
  hasEmergency(): boolean {
    return Object.values(this.resources).some(resource => resource.current === 0);
  }

  /**
   * Get all resources that are below warning threshold
   * @returns Array of resource types with warnings
   */
  getWarnings(): ResourceType[] {
    const warnings: ResourceType[] = [];
    
    for (const type of ['water', 'energy', 'nutrients', 'co2'] as ResourceType[]) {
      const resource = this.resources[type];
      const percentage = resource.capacity > 0 ? resource.current / resource.capacity : 0;
      
      if (percentage <= resource.warningThreshold && resource.current > 0) {
        warnings.push(type);
      }
    }

    return warnings;
  }
}
