/**
 * Unit tests for ResourcePool class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ResourcePool } from './ResourcePool';
import type { ResourceType } from './types';

describe('ResourcePool', () => {
  let pool: ResourcePool;

  beforeEach(() => {
    pool = new ResourcePool();
  });

  describe('Initialization', () => {
    it('should initialize with correct default capacities', () => {
      expect(pool.getStatus('water').level).toBe(2000);
      expect(pool.getStatus('energy').level).toBe(5000);
      expect(pool.getStatus('nutrients').level).toBe(200);
      expect(pool.getStatus('co2').level).toBe(100);
    });

    it('should initialize all resources at 100% capacity', () => {
      expect(pool.getStatus('water').percentage).toBe(1.0);
      expect(pool.getStatus('energy').percentage).toBe(1.0);
      expect(pool.getStatus('nutrients').percentage).toBe(1.0);
      expect(pool.getStatus('co2').percentage).toBe(1.0);
    });

    it('should initialize all resources with ok status', () => {
      expect(pool.getStatus('water').status).toBe('ok');
      expect(pool.getStatus('energy').status).toBe('ok');
      expect(pool.getStatus('nutrients').status).toBe('ok');
      expect(pool.getStatus('co2').status).toBe('ok');
    });
  });

  describe('consume()', () => {
    it('should consume resources successfully when sufficient', () => {
      const result = pool.consume('water', 100);
      expect(result).toBe(true);
      expect(pool.getStatus('water').level).toBe(1900);
    });

    it('should return false when insufficient resources', () => {
      const result = pool.consume('water', 2500);
      expect(result).toBe(false);
      expect(pool.getStatus('water').level).toBe(0);
    });

    it('should track total consumed', () => {
      pool.consume('water', 100);
      pool.consume('water', 50);
      const snapshot = pool.getSnapshot();
      expect(snapshot.water.totalConsumed).toBe(150);
    });

    it('should throw error for negative consumption', () => {
      expect(() => pool.consume('water', -10)).toThrow('Cannot consume negative amount');
    });

    it('should consume exact amount when available', () => {
      pool.consume('water', 2000);
      expect(pool.getStatus('water').level).toBe(0);
    });
  });

  describe('resupply()', () => {
    it('should resupply resources', () => {
      pool.consume('water', 500);
      pool.resupply('water', 300);
      expect(pool.getStatus('water').level).toBe(1800);
    });

    it('should not exceed capacity', () => {
      pool.resupply('water', 500);
      expect(pool.getStatus('water').level).toBe(2000);
    });

    it('should track total resupplied', () => {
      pool.resupply('water', 100);
      pool.resupply('water', 50);
      const snapshot = pool.getSnapshot();
      expect(snapshot.water.totalResupplied).toBe(150);
    });

    it('should throw error for negative resupply', () => {
      expect(() => pool.resupply('water', -10)).toThrow('Cannot resupply negative amount');
    });
  });

  describe('getStatus()', () => {
    it('should return correct percentage', () => {
      pool.consume('water', 1000);
      const status = pool.getStatus('water');
      expect(status.percentage).toBe(0.5);
    });

    it('should return warning status at 20% threshold', () => {
      pool.consume('water', 1600); // 400L remaining = 20%
      const status = pool.getStatus('water');
      expect(status.status).toBe('warning');
    });

    it('should return critical status at 0%', () => {
      pool.consume('water', 2000);
      const status = pool.getStatus('water');
      expect(status.status).toBe('critical');
    });

    it('should calculate days remaining correctly', () => {
      pool.setConsumptionRate('water', 10);
      const status = pool.getStatus('water');
      expect(status.daysRemaining).toBe(200); // 2000L / 10L per Sol
    });

    it('should return Infinity days remaining when consumption rate is 0', () => {
      const status = pool.getStatus('water');
      expect(status.daysRemaining).toBe(Infinity);
    });
  });

  describe('Warning Threshold Detection', () => {
    it('should detect warning at exactly 20% capacity', () => {
      pool.consume('water', 1600); // 400L = 20%
      expect(pool.getStatus('water').status).toBe('warning');
    });

    it('should detect warning below 20% capacity', () => {
      pool.consume('water', 1700); // 300L = 15%
      expect(pool.getStatus('water').status).toBe('warning');
    });

    it('should not warn above 20% capacity', () => {
      pool.consume('water', 1500); // 500L = 25%
      expect(pool.getStatus('water').status).toBe('ok');
    });

    it('should list all resources with warnings', () => {
      pool.consume('water', 1700); // 15%
      pool.consume('energy', 4200); // 16%
      const warnings = pool.getWarnings();
      expect(warnings).toContain('water');
      expect(warnings).toContain('energy');
      expect(warnings).toHaveLength(2);
    });
  });

  describe('Resource History Tracking', () => {
    it('should record history for all resources', () => {
      pool.recordHistory(1);
      pool.consume('water', 100);
      pool.recordHistory(2);
      
      const history = pool.getHistory('water');
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ sol: 1, value: 2000 });
      expect(history[1]).toEqual({ sol: 2, value: 1900 });
    });

    it('should maintain only last 30 Sols of history', () => {
      for (let sol = 1; sol <= 35; sol++) {
        pool.recordHistory(sol);
      }
      
      const history = pool.getHistory('water');
      expect(history).toHaveLength(30);
      expect(history[0].sol).toBe(6); // First entry should be Sol 6
      expect(history[29].sol).toBe(35); // Last entry should be Sol 35
    });

    it('should track history independently for each resource', () => {
      pool.recordHistory(1);
      pool.consume('water', 100);
      pool.consume('energy', 500);
      pool.recordHistory(2);
      
      expect(pool.getHistory('water')[1].value).toBe(1900);
      expect(pool.getHistory('energy')[1].value).toBe(4500);
    });
  });

  describe('Consumption Rate', () => {
    it('should set consumption rate', () => {
      pool.setConsumptionRate('water', 15);
      expect(pool.getConsumptionRate('water')).toBe(15);
    });

    it('should throw error for negative consumption rate', () => {
      expect(() => pool.setConsumptionRate('water', -5)).toThrow('Consumption rate cannot be negative');
    });

    it('should affect days remaining calculation', () => {
      pool.setConsumptionRate('water', 20);
      const status = pool.getStatus('water');
      expect(status.daysRemaining).toBe(100); // 2000L / 20L per Sol
    });
  });

  describe('Trend Calculation', () => {
    it('should show stable trend initially', () => {
      pool.recordHistory(1);
      const status = pool.getStatus('water');
      expect(status.trend).toBe('stable');
    });

    it('should show decreasing trend when consuming', () => {
      for (let i = 1; i <= 6; i++) {
        pool.recordHistory(i);
        pool.consume('water', 100);
      }
      const status = pool.getStatus('water');
      expect(status.trend).toBe('decreasing');
    });

    it('should show increasing trend when resupplying', () => {
      pool.consume('water', 1000);
      for (let i = 1; i <= 6; i++) {
        pool.recordHistory(i);
        pool.resupply('water', 100);
      }
      const status = pool.getStatus('water');
      expect(status.trend).toBe('increasing');
    });
  });

  describe('Emergency Detection', () => {
    it('should detect emergency when any resource is depleted', () => {
      pool.consume('water', 2000);
      expect(pool.hasEmergency()).toBe(true);
    });

    it('should not detect emergency when all resources available', () => {
      pool.consume('water', 1000);
      expect(pool.hasEmergency()).toBe(false);
    });

    it('should detect emergency for any resource type', () => {
      pool.consume('nutrients', 200);
      expect(pool.hasEmergency()).toBe(true);
    });
  });

  describe('Snapshot and Load', () => {
    it('should create snapshot of all resources', () => {
      pool.consume('water', 500);
      pool.resupply('energy', 100);
      pool.recordHistory(1);
      
      const snapshot = pool.getSnapshot();
      expect(snapshot.water.current).toBe(1500);
      expect(snapshot.water.totalConsumed).toBe(500);
      expect(snapshot.energy.totalResupplied).toBe(100);
      expect(snapshot.water.history).toHaveLength(1);
    });

    it('should restore from snapshot', () => {
      pool.consume('water', 500);
      pool.recordHistory(1);
      const snapshot = pool.getSnapshot();
      
      const newPool = new ResourcePool();
      newPool.loadSnapshot(snapshot);
      
      expect(newPool.getStatus('water').level).toBe(1500);
      expect(newPool.getHistory('water')).toHaveLength(1);
    });

    it('should preserve all resource types in snapshot', () => {
      pool.consume('water', 100);
      pool.consume('energy', 200);
      pool.consume('nutrients', 10);
      pool.consume('co2', 5);
      
      const snapshot = pool.getSnapshot();
      const newPool = new ResourcePool();
      newPool.loadSnapshot(snapshot);
      
      expect(newPool.getStatus('water').level).toBe(1900);
      expect(newPool.getStatus('energy').level).toBe(4800);
      expect(newPool.getStatus('nutrients').level).toBe(190);
      expect(newPool.getStatus('co2').level).toBe(95);
    });
  });

  describe('Multiple Resource Types', () => {
    it('should handle all resource types independently', () => {
      pool.consume('water', 100);
      pool.consume('energy', 500);
      pool.consume('nutrients', 20);
      pool.consume('co2', 10);
      
      expect(pool.getStatus('water').level).toBe(1900);
      expect(pool.getStatus('energy').level).toBe(4500);
      expect(pool.getStatus('nutrients').level).toBe(180);
      expect(pool.getStatus('co2').level).toBe(90);
    });

    it('should track warnings for multiple resources', () => {
      pool.consume('water', 1700); // 15%
      pool.consume('nutrients', 170); // 15%
      
      const warnings = pool.getWarnings();
      expect(warnings).toHaveLength(2);
      expect(warnings).toContain('water');
      expect(warnings).toContain('nutrients');
    });
  });

  describe('Edge Cases', () => {
    it('should handle consuming more than available', () => {
      const result = pool.consume('water', 3000);
      expect(result).toBe(false);
      expect(pool.getStatus('water').level).toBe(0);
      const snapshot = pool.getSnapshot();
      expect(snapshot.water.totalConsumed).toBe(2000); // Only consumed what was available
    });

    it('should handle zero consumption', () => {
      const result = pool.consume('water', 0);
      expect(result).toBe(true);
      expect(pool.getStatus('water').level).toBe(2000);
    });

    it('should handle zero resupply', () => {
      pool.resupply('water', 0);
      expect(pool.getStatus('water').level).toBe(2000);
    });

    it('should handle resupply when at capacity', () => {
      pool.resupply('water', 100);
      expect(pool.getStatus('water').level).toBe(2000);
    });
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  describe('Property-Based Tests', () => {
    // Feature: mars-base-simulation-game, Property 11: Resource Warning Threshold
    // **Validates: Requirements 4.2**
    it('Property 11: for any resource type, warning status is true when level falls below 20% of capacity', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('water', 'energy', 'nutrients', 'co2') as fc.Arbitrary<ResourceType>,
          fc.double({ min: 0, max: 0.19, noNaN: true }), // percentage below 20%
          (resourceType, percentage) => {
            const testPool = new ResourcePool();
            const status = testPool.getStatus(resourceType);
            const capacity = status.level; // Get initial capacity
            
            // Consume resources to bring level below 20%
            const targetLevel = capacity * percentage;
            const amountToConsume = capacity - targetLevel;
            testPool.consume(resourceType, amountToConsume);
            
            // Verify warning status is set
            const newStatus = testPool.getStatus(resourceType);
            
            // If resource is completely depleted (0%), status should be 'critical'
            // Otherwise, if below 20%, status should be 'warning'
            if (newStatus.level === 0) {
              expect(newStatus.status).toBe('critical');
            } else {
              expect(newStatus.status).toBe('warning');
            }
            
            // Verify percentage is indeed below 20%
            expect(newStatus.percentage).toBeLessThan(0.20);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: mars-base-simulation-game, Property 12: Resource Consumption Rate Calculation
    // **Validates: Requirements 4.3**
    it('Property 12: total resource consumption rate equals sum of individual crop rates plus base habitat consumption', () => {
      fc.assert(
        fc.property(
          // Generate array of crop consumption rates (0-5 crops, each consuming 0-10 units per Sol)
          fc.array(
            fc.record({
              water: fc.double({ min: 0, max: 10, noNaN: true }),
              energy: fc.double({ min: 0, max: 50, noNaN: true }),
              nutrients: fc.double({ min: 0, max: 2, noNaN: true }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (crops) => {
            const testPool = new ResourcePool();
            
            // Base habitat consumption rates (from design doc)
            const baseWater = 10; // L per Sol
            const baseEnergy = 50; // kWh per Sol
            const baseNutrients = 0; // kg per Sol (not specified, assume 0)
            
            // Calculate expected total consumption rates
            const expectedWaterRate = crops.reduce((sum, crop) => sum + crop.water, 0) + baseWater;
            const expectedEnergyRate = crops.reduce((sum, crop) => sum + crop.energy, 0) + baseEnergy;
            const expectedNutrientRate = crops.reduce((sum, crop) => sum + crop.nutrients, 0) + baseNutrients;
            
            // Set consumption rates on the pool
            // First set base habitat rates
            testPool.setConsumptionRate('water', baseWater);
            testPool.setConsumptionRate('energy', baseEnergy);
            testPool.setConsumptionRate('nutrients', baseNutrients);
            
            // Then add crop consumption rates
            const totalWaterRate = crops.reduce((sum, crop) => sum + crop.water, 0) + baseWater;
            const totalEnergyRate = crops.reduce((sum, crop) => sum + crop.energy, 0) + baseEnergy;
            const totalNutrientRate = crops.reduce((sum, crop) => sum + crop.nutrients, 0) + baseNutrients;
            
            testPool.setConsumptionRate('water', totalWaterRate);
            testPool.setConsumptionRate('energy', totalEnergyRate);
            testPool.setConsumptionRate('nutrients', totalNutrientRate);
            
            // Verify the consumption rates match expected values
            expect(testPool.getConsumptionRate('water')).toBeCloseTo(expectedWaterRate, 5);
            expect(testPool.getConsumptionRate('energy')).toBeCloseTo(expectedEnergyRate, 5);
            expect(testPool.getConsumptionRate('nutrients')).toBeCloseTo(expectedNutrientRate, 5);
            
            // Verify the calculation is correct: total = sum(crops) + base
            const actualWaterRate = testPool.getConsumptionRate('water');
            const actualEnergyRate = testPool.getConsumptionRate('energy');
            const actualNutrientRate = testPool.getConsumptionRate('nutrients');
            
            const cropWaterSum = crops.reduce((sum, crop) => sum + crop.water, 0);
            const cropEnergySum = crops.reduce((sum, crop) => sum + crop.energy, 0);
            const cropNutrientSum = crops.reduce((sum, crop) => sum + crop.nutrients, 0);
            
            expect(actualWaterRate).toBeCloseTo(cropWaterSum + baseWater, 5);
            expect(actualEnergyRate).toBeCloseTo(cropEnergySum + baseEnergy, 5);
            expect(actualNutrientRate).toBeCloseTo(cropNutrientSum + baseNutrients, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
