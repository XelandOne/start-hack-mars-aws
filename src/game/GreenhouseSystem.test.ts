/**
 * Unit tests for GreenhouseSystem
 * Tests emergency mode activation when resources are depleted
 * 
 * Requirements: 4.5
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GreenhouseSystem } from './GreenhouseSystem';
import { ResourcePool } from './ResourcePool';
import type { ResourceType } from './types';

describe('GreenhouseSystem', () => {
  let resourcePool: ResourcePool;
  let greenhouse: GreenhouseSystem;

  beforeEach(() => {
    resourcePool = new ResourcePool();
    greenhouse = new GreenhouseSystem(resourcePool);
  });

  // ============================================================================
  // Requirement 4.5: Emergency Mode Activation
  // ============================================================================

  describe('Emergency Mode (Req 4.5)', () => {
    test('should start in normal mode (not emergency)', () => {
      expect(greenhouse.isEmergencyMode()).toBe(false);
    });

    test('should enter emergency mode when water reaches 0%', () => {
      // Deplete water resource
      resourcePool.consume('water', 2000);
      
      // Update emergency mode status
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should enter emergency mode when energy reaches 0%', () => {
      // Deplete energy resource
      resourcePool.consume('energy', 5000);
      
      // Update emergency mode status
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should enter emergency mode when nutrients reach 0%', () => {
      // Deplete nutrients resource
      resourcePool.consume('nutrients', 200);
      
      // Update emergency mode status
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should enter emergency mode when CO₂ reaches 0%', () => {
      // Deplete CO₂ resource
      resourcePool.consume('co2', 100);
      
      // Update emergency mode status
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should enter emergency mode when any resource is depleted', () => {
      // Deplete multiple resources
      resourcePool.consume('water', 2000);
      resourcePool.consume('energy', 5000);
      
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should NOT enter emergency mode when resources are above 0%', () => {
      // Consume some but not all resources
      resourcePool.consume('water', 1000); // 50% remaining
      resourcePool.consume('energy', 2500); // 50% remaining
      
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(false);
    });

    test('should exit emergency mode when resources are resupplied', () => {
      // Deplete water
      resourcePool.consume('water', 2000);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
      
      // Resupply water
      resourcePool.resupply('water', 500);
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(false);
    });

    test('should remain in emergency mode if only some resources are restored', () => {
      // Deplete multiple resources
      resourcePool.consume('water', 2000);
      resourcePool.consume('energy', 5000);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
      
      // Restore only water
      resourcePool.resupply('water', 500);
      greenhouse.updateEmergencyMode();
      
      // Should still be in emergency mode because energy is still at 0
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should exit emergency mode only when all resources are above 0', () => {
      // Deplete multiple resources
      resourcePool.consume('water', 2000);
      resourcePool.consume('energy', 5000);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
      
      // Restore both resources
      resourcePool.resupply('water', 500);
      resourcePool.resupply('energy', 1000);
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(false);
    });
  });

  // ============================================================================
  // Depleted Resources Tracking
  // ============================================================================

  describe('Depleted Resources Tracking', () => {
    test('should return empty array when no resources are depleted', () => {
      const depleted = greenhouse.getDepletedResources();
      expect(depleted).toEqual([]);
    });

    test('should identify water as depleted', () => {
      resourcePool.consume('water', 2000);
      const depleted = greenhouse.getDepletedResources();
      expect(depleted).toContain('water');
    });

    test('should identify energy as depleted', () => {
      resourcePool.consume('energy', 5000);
      const depleted = greenhouse.getDepletedResources();
      expect(depleted).toContain('energy');
    });

    test('should identify nutrients as depleted', () => {
      resourcePool.consume('nutrients', 200);
      const depleted = greenhouse.getDepletedResources();
      expect(depleted).toContain('nutrients');
    });

    test('should identify CO₂ as depleted', () => {
      resourcePool.consume('co2', 100);
      const depleted = greenhouse.getDepletedResources();
      expect(depleted).toContain('co2');
    });

    test('should identify multiple depleted resources', () => {
      resourcePool.consume('water', 2000);
      resourcePool.consume('nutrients', 200);
      
      const depleted = greenhouse.getDepletedResources();
      
      expect(depleted).toHaveLength(2);
      expect(depleted).toContain('water');
      expect(depleted).toContain('nutrients');
    });

    test('should not include resources above 0% in depleted list', () => {
      resourcePool.consume('water', 1999); // 1L remaining
      
      const depleted = greenhouse.getDepletedResources();
      
      expect(depleted).not.toContain('water');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('should handle multiple updateEmergencyMode calls with no state change', () => {
      greenhouse.updateEmergencyMode();
      greenhouse.updateEmergencyMode();
      greenhouse.updateEmergencyMode();
      
      expect(greenhouse.isEmergencyMode()).toBe(false);
    });

    test('should handle rapid emergency mode transitions', () => {
      // Enter emergency
      resourcePool.consume('water', 2000);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
      
      // Exit emergency
      resourcePool.resupply('water', 100);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(false);
      
      // Enter emergency again
      resourcePool.consume('water', 100);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should handle resource at exactly 0', () => {
      resourcePool.consume('water', 2000);
      expect(resourcePool.getStatus('water').level).toBe(0);
      
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should handle resource at 1 unit (not emergency)', () => {
      resourcePool.consume('water', 1999);
      expect(resourcePool.getStatus('water').level).toBe(1);
      
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(false);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration with ResourcePool', () => {
    test('should correctly detect emergency from ResourcePool.hasEmergency()', () => {
      expect(resourcePool.hasEmergency()).toBe(false);
      expect(greenhouse.isEmergencyMode()).toBe(false);
      
      resourcePool.consume('water', 2000);
      expect(resourcePool.hasEmergency()).toBe(true);
      
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(true);
    });

    test('should sync emergency state with ResourcePool state', () => {
      // Deplete and check
      resourcePool.consume('energy', 5000);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(resourcePool.hasEmergency());
      
      // Resupply and check
      resourcePool.resupply('energy', 1000);
      greenhouse.updateEmergencyMode();
      expect(greenhouse.isEmergencyMode()).toBe(resourcePool.hasEmergency());
    });
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  describe('Property-Based Tests', () => {
    // Feature: mars-base-simulation-game, Property 13: Emergency Mode Activation
    // **Validates: Requirements 4.5**
    test('Property 13: emergency mode activates when any resource reaches 0%', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('water', 'energy', 'nutrients', 'co2'), // resource type
          fc.integer({ min: 0, max: 100 }), // resupply amount after depletion
          (resourceType: ResourceType, resupplyAmount: number) => {
            // Create fresh instances for each test case
            const testResourcePool = new ResourcePool();
            const testGreenhouse = new GreenhouseSystem(testResourcePool);
            
            // Get initial capacity for the resource
            const initialStatus = testResourcePool.getStatus(resourceType);
            const capacity = initialStatus.level;
            
            // Deplete the resource to 0
            testResourcePool.consume(resourceType, capacity);
            
            // Update emergency mode
            testGreenhouse.updateEmergencyMode();
            
            // Property: For any resource type, when the resource level reaches 0%,
            // the greenhouse system should enter emergency mode
            expect(testGreenhouse.isEmergencyMode()).toBe(true);
            expect(testResourcePool.hasEmergency()).toBe(true);
            
            // If we resupply any amount > 0, emergency mode should exit
            if (resupplyAmount > 0) {
              testResourcePool.resupply(resourceType, resupplyAmount);
              testGreenhouse.updateEmergencyMode();
              expect(testGreenhouse.isEmergencyMode()).toBe(false);
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per design document
      );
    });

    test('Property: emergency mode state matches ResourcePool.hasEmergency()', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              resource: fc.constantFrom('water', 'energy', 'nutrients', 'co2'),
              action: fc.constantFrom('consume', 'resupply'),
              amount: fc.integer({ min: 1, max: 500 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (actions) => {
            // Create fresh instances
            const testResourcePool = new ResourcePool();
            const testGreenhouse = new GreenhouseSystem(testResourcePool);
            
            // Apply random sequence of consume/resupply actions
            for (const { resource, action, amount } of actions) {
              if (action === 'consume') {
                testResourcePool.consume(resource as ResourceType, amount);
              } else {
                testResourcePool.resupply(resource as ResourceType, amount);
              }
            }
            
            // Update emergency mode
            testGreenhouse.updateEmergencyMode();
            
            // Property: Emergency mode state should always match ResourcePool.hasEmergency()
            expect(testGreenhouse.isEmergencyMode()).toBe(testResourcePool.hasEmergency());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: depleted resources list matches resources at 0%', () => {
      fc.assert(
        fc.property(
          fc.record({
            waterAmount: fc.integer({ min: 0, max: 2000 }),
            energyAmount: fc.integer({ min: 0, max: 5000 }),
            nutrientsAmount: fc.integer({ min: 0, max: 200 }),
            co2Amount: fc.integer({ min: 0, max: 100 })
          }),
          ({ waterAmount, energyAmount, nutrientsAmount, co2Amount }) => {
            // Create fresh instances
            const testResourcePool = new ResourcePool();
            const testGreenhouse = new GreenhouseSystem(testResourcePool);
            
            // Consume specified amounts
            testResourcePool.consume('water', waterAmount);
            testResourcePool.consume('energy', energyAmount);
            testResourcePool.consume('nutrients', nutrientsAmount);
            testResourcePool.consume('co2', co2Amount);
            
            // Get depleted resources
            const depleted = testGreenhouse.getDepletedResources();
            
            // Property: A resource should be in the depleted list if and only if its level is 0
            const waterStatus = testResourcePool.getStatus('water');
            const energyStatus = testResourcePool.getStatus('energy');
            const nutrientsStatus = testResourcePool.getStatus('nutrients');
            const co2Status = testResourcePool.getStatus('co2');
            
            if (waterStatus.level === 0) {
              expect(depleted).toContain('water');
            } else {
              expect(depleted).not.toContain('water');
            }
            
            if (energyStatus.level === 0) {
              expect(depleted).toContain('energy');
            } else {
              expect(depleted).not.toContain('energy');
            }
            
            if (nutrientsStatus.level === 0) {
              expect(depleted).toContain('nutrients');
            } else {
              expect(depleted).not.toContain('nutrients');
            }
            
            if (co2Status.level === 0) {
              expect(depleted).toContain('co2');
            } else {
              expect(depleted).not.toContain('co2');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
