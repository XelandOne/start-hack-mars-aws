/**
 * Tests for RocketSystem
 * Includes unit tests for specific scenarios and property-based tests for universal correctness
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { RocketSystem } from './RocketSystem';
import type { Cargo } from './types';

describe('RocketSystem', () => {
  let rocketSystem: RocketSystem;

  beforeEach(() => {
    rocketSystem = new RocketSystem();
  });

  // ============================================================================
  // Unit Tests - Specific Scenarios
  // ============================================================================

  describe('Mission Scheduling', () => {
    it('should schedule a mission with default cargo', () => {
      const mission = rocketSystem.scheduleMission(0);

      expect(mission.id).toMatch(/^rocket-\d+$/);
      expect(mission.launchSol).toBe(0);
      expect(mission.status).toBe('scheduled');
      expect(mission.cargo).toEqual({
        water: 500,
        nutrients: 100,
        energy: 1000,
        co2: 50,
      });
      expect(mission.arrivalSol).toBeGreaterThanOrEqual(180);
      expect(mission.arrivalSol).toBeLessThanOrEqual(270);
    });

    it('should schedule a mission with custom cargo', () => {
      const customCargo: Cargo = {
        water: 1000,
        nutrients: 200,
        energy: 2000,
        co2: 100,
      };

      const mission = rocketSystem.scheduleMission(10, customCargo);

      expect(mission.cargo).toEqual(customCargo);
    });

    it('should generate unique mission IDs', () => {
      const mission1 = rocketSystem.scheduleMission(0);
      const mission2 = rocketSystem.scheduleMission(10);
      const mission3 = rocketSystem.scheduleMission(20);

      expect(mission1.id).not.toBe(mission2.id);
      expect(mission2.id).not.toBe(mission3.id);
      expect(mission1.id).not.toBe(mission3.id);
    });

    it('should schedule manual emergency missions with minimum 150 Sol travel time', () => {
      const mission = rocketSystem.scheduleMission(100, undefined, true);
      const travelTime = mission.arrivalSol - mission.launchSol;

      expect(travelTime).toBeGreaterThanOrEqual(150);
      expect(travelTime).toBeLessThanOrEqual(270);
    });
  });

  describe('Travel Time Calculation', () => {
    it('should calculate travel time between 180-270 Sols for normal missions', () => {
      for (let i = 0; i < 100; i++) {
        const travelTime = rocketSystem.calculateTravelTime(false);
        expect(travelTime).toBeGreaterThanOrEqual(180);
        expect(travelTime).toBeLessThanOrEqual(270);
      }
    });

    it('should calculate travel time between 150-270 Sols for manual missions', () => {
      for (let i = 0; i < 100; i++) {
        const travelTime = rocketSystem.calculateTravelTime(true);
        expect(travelTime).toBeGreaterThanOrEqual(150);
        expect(travelTime).toBeLessThanOrEqual(270);
      }
    });
  });

  describe('Mission Updates', () => {
    it('should transition mission from scheduled to in-transit at launch Sol', () => {
      const mission = rocketSystem.scheduleMission(10);
      expect(mission.status).toBe('scheduled');

      rocketSystem.updateMissions(9);
      expect(mission.status).toBe('scheduled');

      rocketSystem.updateMissions(10);
      expect(mission.status).toBe('in-transit');
    });

    it('should transition mission from in-transit to arrived at arrival Sol', () => {
      const mission = rocketSystem.scheduleMission(10);
      rocketSystem.updateMissions(10); // Launch

      expect(mission.status).toBe('in-transit');

      rocketSystem.updateMissions(mission.arrivalSol - 1);
      expect(mission.status).toBe('in-transit');

      const arrivedMissions = rocketSystem.updateMissions(mission.arrivalSol);
      expect(mission.status).toBe('arrived');
      expect(arrivedMissions).toContain(mission);
    });

    it('should return all missions that arrived in current Sol', () => {
      const mission1 = rocketSystem.scheduleMission(0);
      const mission2 = rocketSystem.scheduleMission(10);
      
      // Fast forward to when both might arrive
      const maxArrival = Math.max(mission1.arrivalSol, mission2.arrivalSol);
      
      rocketSystem.updateMissions(mission1.launchSol);
      rocketSystem.updateMissions(mission2.launchSol);
      
      const arrivedAtMission1 = rocketSystem.updateMissions(mission1.arrivalSol);
      const arrivedAtMission2 = rocketSystem.updateMissions(mission2.arrivalSol);
      
      if (mission1.arrivalSol === mission2.arrivalSol) {
        expect(arrivedAtMission1.length).toBe(2);
      } else {
        expect(arrivedAtMission1).toContain(mission1);
        expect(arrivedAtMission2).toContain(mission2);
      }
    });

    it('should mark mission as delivered', () => {
      const mission = rocketSystem.scheduleMission(0);
      rocketSystem.updateMissions(0); // Launch
      rocketSystem.updateMissions(mission.arrivalSol); // Arrive

      expect(mission.status).toBe('arrived');

      rocketSystem.markAsDelivered(mission.id);
      expect(mission.status).toBe('delivered');
    });

    it('should not mark non-arrived mission as delivered', () => {
      const mission = rocketSystem.scheduleMission(0);
      
      rocketSystem.markAsDelivered(mission.id);
      expect(mission.status).toBe('scheduled');
    });
  });

  describe('Auto-Scheduling', () => {
    it('should auto-schedule missions at configured intervals', () => {
      const system = new RocketSystem(90);

      const mission1 = system.autoSchedule(0);
      expect(mission1).not.toBeNull();
      expect(mission1?.launchSol).toBe(0);

      const noMission = system.autoSchedule(50);
      expect(noMission).toBeNull();

      const mission2 = system.autoSchedule(90);
      expect(mission2).not.toBeNull();
      expect(mission2?.launchSol).toBe(90);
    });

    it('should respect custom schedule intervals', () => {
      const system = new RocketSystem(60);

      system.autoSchedule(0);
      expect(system.autoSchedule(59)).toBeNull();
      expect(system.autoSchedule(60)).not.toBeNull();
    });
  });

  describe('Mission Queries', () => {
    it('should get mission by ID', () => {
      const mission = rocketSystem.scheduleMission(0);
      const retrieved = rocketSystem.getMission(mission.id);

      expect(retrieved).toBe(mission);
    });

    it('should return undefined for non-existent mission', () => {
      const retrieved = rocketSystem.getMission('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all missions', () => {
      const mission1 = rocketSystem.scheduleMission(0);
      const mission2 = rocketSystem.scheduleMission(10);
      const mission3 = rocketSystem.scheduleMission(20);

      const allMissions = rocketSystem.getAllMissions();
      expect(allMissions).toHaveLength(3);
      expect(allMissions).toContain(mission1);
      expect(allMissions).toContain(mission2);
      expect(allMissions).toContain(mission3);
    });

    it('should get missions by status', () => {
      const mission1 = rocketSystem.scheduleMission(0);
      const mission2 = rocketSystem.scheduleMission(10);
      const mission3 = rocketSystem.scheduleMission(20);

      rocketSystem.updateMissions(10); // Launch mission1 and mission2

      const scheduled = rocketSystem.getMissionsByStatus('scheduled');
      const inTransit = rocketSystem.getMissionsByStatus('in-transit');

      expect(scheduled).toContain(mission3);
      expect(inTransit).toContain(mission1);
      expect(inTransit).toContain(mission2);
    });
  });

  describe('Trajectory Generation', () => {
    it('should generate trajectory points', () => {
      const mission = rocketSystem.scheduleMission(0);

      expect(mission.trajectory).toBeDefined();
      expect(mission.trajectory.length).toBeGreaterThan(0);
    });

    it('should have trajectory start at Earth and end at Mars', () => {
      const mission = rocketSystem.scheduleMission(0);
      const trajectory = mission.trajectory;

      const firstPoint = trajectory[0];
      const lastPoint = trajectory[trajectory.length - 1];

      // Earth is at x=-400, Mars at x=0
      expect(firstPoint.x).toBe(-400);
      expect(lastPoint.x).toBe(0);
      expect(lastPoint.y).toBe(0);
    });

    it('should have trajectory points with increasing Sols', () => {
      const mission = rocketSystem.scheduleMission(0);
      const trajectory = mission.trajectory;

      for (let i = 1; i < trajectory.length; i++) {
        expect(trajectory[i].sol).toBeGreaterThanOrEqual(trajectory[i - 1].sol);
      }
    });
  });

  describe('State Persistence', () => {
    it('should save and restore state', () => {
      const mission1 = rocketSystem.scheduleMission(0);
      const mission2 = rocketSystem.scheduleMission(10);
      rocketSystem.updateMissions(10);

      const snapshot = rocketSystem.getSnapshot();
      expect(snapshot).toHaveLength(2);

      const newSystem = new RocketSystem();
      newSystem.loadSnapshot(snapshot);

      const restored1 = newSystem.getMission(mission1.id);
      const restored2 = newSystem.getMission(mission2.id);

      expect(restored1).toEqual(mission1);
      expect(restored2).toEqual(mission2);
    });

    it('should maintain mission ID sequence after restore', () => {
      rocketSystem.scheduleMission(0);
      rocketSystem.scheduleMission(10);

      const snapshot = rocketSystem.getSnapshot();
      const newSystem = new RocketSystem();
      newSystem.loadSnapshot(snapshot);

      const newMission = newSystem.scheduleMission(20);
      expect(newMission.id).toBe('rocket-3');
    });
  });

  // ============================================================================
  // Property-Based Tests - Universal Correctness Properties
  // ============================================================================

  describe('Property Tests', () => {
    // Feature: mars-base-simulation-game, Property 4: Rocket Mission Scheduling Interval
    it('should schedule missions at configured intervals ± 1 Sol', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 180 }), // schedule interval
          fc.integer({ min: 0, max: 450 }), // starting Sol
          fc.integer({ min: 2, max: 10 }), // number of missions
          (interval, startSol, numMissions) => {
            const system = new RocketSystem(interval);
            const launchSols: number[] = [];

            let currentSol = startSol;
            for (let i = 0; i < numMissions; i++) {
              const mission = system.autoSchedule(currentSol);
              if (mission) {
                launchSols.push(mission.launchSol);
              }
              currentSol += interval;
            }

            // Check intervals between consecutive launches
            for (let i = 1; i < launchSols.length; i++) {
              const actualInterval = launchSols[i] - launchSols[i - 1];
              expect(Math.abs(actualInterval - interval)).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: mars-base-simulation-game, Property 5: Rocket Travel Time Bounds
    it('should have travel time between 180-270 Sols for normal missions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 450 }), // launch Sol
          (launchSol) => {
            const mission = rocketSystem.scheduleMission(launchSol, undefined, false);
            const travelTime = mission.arrivalSol - mission.launchSol;

            expect(travelTime).toBeGreaterThanOrEqual(180);
            expect(travelTime).toBeLessThanOrEqual(270);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: mars-base-simulation-game, Property 7: Manual Mission Minimum Travel Time
    it('should have travel time at least 150 Sols for manual missions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 450 }), // launch Sol
          (launchSol) => {
            const mission = rocketSystem.scheduleMission(launchSol, undefined, true);
            const travelTime = mission.arrivalSol - mission.launchSol;

            expect(travelTime).toBeGreaterThanOrEqual(150);
            expect(travelTime).toBeLessThanOrEqual(270);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: mars-base-simulation-game, Property 6: Rocket Cargo Delivery
    it('should preserve cargo amounts from scheduling to delivery', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 450 }), // launch Sol
          fc.record({
            water: fc.integer({ min: 0, max: 2000 }),
            nutrients: fc.integer({ min: 0, max: 500 }),
            energy: fc.integer({ min: 0, max: 5000 }),
            co2: fc.integer({ min: 0, max: 200 }),
          }), // custom cargo
          (launchSol, cargo) => {
            const mission = rocketSystem.scheduleMission(launchSol, cargo);
            
            // Cargo should be preserved throughout mission lifecycle
            expect(mission.cargo).toEqual(cargo);
            
            // Update to arrival
            rocketSystem.updateMissions(mission.launchSol);
            expect(mission.cargo).toEqual(cargo);
            
            rocketSystem.updateMissions(mission.arrivalSol);
            expect(mission.cargo).toEqual(cargo);
            
            rocketSystem.markAsDelivered(mission.id);
            expect(mission.cargo).toEqual(cargo);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain mission status progression order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 450 }), // launch Sol
          (launchSol) => {
            const system = new RocketSystem();
            const mission = system.scheduleMission(launchSol);
            
            const statusOrder = ['scheduled', 'in-transit', 'arrived', 'delivered'];
            let currentStatusIndex = 0;

            // Before launch
            expect(mission.status).toBe(statusOrder[0]);

            // At launch
            system.updateMissions(mission.launchSol);
            const launchStatusIndex = statusOrder.indexOf(mission.status);
            expect(launchStatusIndex).toBeGreaterThanOrEqual(currentStatusIndex);
            currentStatusIndex = launchStatusIndex;

            // At arrival
            system.updateMissions(mission.arrivalSol);
            const arrivalStatusIndex = statusOrder.indexOf(mission.status);
            expect(arrivalStatusIndex).toBeGreaterThanOrEqual(currentStatusIndex);
            currentStatusIndex = arrivalStatusIndex;

            // After delivery
            system.markAsDelivered(mission.id);
            const deliveredStatusIndex = statusOrder.indexOf(mission.status);
            expect(deliveredStatusIndex).toBeGreaterThanOrEqual(currentStatusIndex);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate trajectory with correct Sol range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 450 }), // launch Sol
          (launchSol) => {
            const mission = rocketSystem.scheduleMission(launchSol);
            const trajectory = mission.trajectory;

            expect(trajectory.length).toBeGreaterThan(0);

            // First point should be at or after launch
            expect(trajectory[0].sol).toBeGreaterThanOrEqual(mission.launchSol);

            // Last point should be at or before arrival
            expect(trajectory[trajectory.length - 1].sol).toBeLessThanOrEqual(mission.arrivalSol);

            // All points should be within mission timeframe
            for (const point of trajectory) {
              expect(point.sol).toBeGreaterThanOrEqual(mission.launchSol);
              expect(point.sol).toBeLessThanOrEqual(mission.arrivalSol);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle state persistence round-trip correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 450 }), { minLength: 1, maxLength: 10 }), // launch Sols
          (launchSols) => {
            const system = new RocketSystem();
            const missions = launchSols.map(sol => system.scheduleMission(sol));

            // Advance some missions
            const maxSol = Math.max(...launchSols) + 50;
            system.updateMissions(maxSol);

            // Save and restore
            const snapshot = system.getSnapshot();
            const newSystem = new RocketSystem();
            newSystem.loadSnapshot(snapshot);

            // Verify all missions are restored correctly
            for (const mission of missions) {
              const restored = newSystem.getMission(mission.id);
              expect(restored).toEqual(mission);
            }

            // Verify new missions get unique IDs
            const newMission = newSystem.scheduleMission(maxSol + 100);
            expect(missions.every(m => m.id !== newMission.id)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
