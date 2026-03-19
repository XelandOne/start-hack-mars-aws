/**
 * RocketSystem - Manages Earth-to-Mars resupply missions
 * Handles mission scheduling, travel time calculation, trajectory generation, and cargo delivery
 */

import type { RocketMission, Cargo, TrajectoryPoint } from './types';

export class RocketSystem {
  private missions: Map<string, RocketMission>;
  private nextMissionId: number;
  private readonly defaultScheduleInterval: number;
  private lastScheduledSol: number;

  constructor(scheduleInterval: number = 90) {
    this.missions = new Map();
    this.nextMissionId = 1;
    this.defaultScheduleInterval = scheduleInterval;
    this.lastScheduledSol = -scheduleInterval; // Allow immediate first mission
  }

  /**
   * Schedule a new resupply mission
   * @param launchSol - Sol when mission launches from Earth
   * @param cargo - Optional custom cargo (defaults to standard resupply)
   * @param isManual - Whether this is a manual emergency resupply
   * @returns The created RocketMission
   */
  scheduleMission(launchSol: number, cargo?: Cargo, isManual: boolean = false): RocketMission {
    const travelTime = this.calculateTravelTime(isManual);
    const arrivalSol = launchSol + travelTime;
    
    const mission: RocketMission = {
      id: `rocket-${this.nextMissionId++}`,
      launchSol,
      arrivalSol,
      status: 'scheduled',
      cargo: cargo || this.getDefaultCargo(),
      trajectory: this.generateTrajectory(launchSol, arrivalSol),
    };

    this.missions.set(mission.id, mission);
    this.lastScheduledSol = launchSol;
    
    return mission;
  }

  /**
   * Calculate travel time with randomization
   * @param isManual - Whether this is a manual emergency resupply (minimum 150 Sols)
   * @returns Travel time in Sols (180-270 for normal, 150-270 for manual)
   */
  calculateTravelTime(isManual: boolean = false): number {
    const minTime = isManual ? 150 : 180;
    const maxTime = 270;
    return Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  }

  /**
   * Update all missions based on current Sol
   * Transitions missions through states: scheduled -> in-transit -> arrived -> delivered
   * @param currentSol - Current mission Sol
   * @returns Array of missions that arrived this Sol
   */
  updateMissions(currentSol: number): RocketMission[] {
    const arrivedMissions: RocketMission[] = [];

    for (const mission of this.missions.values()) {
      // Transition scheduled to in-transit
      if (mission.status === 'scheduled' && currentSol >= mission.launchSol) {
        mission.status = 'in-transit';
      }

      // Transition in-transit to arrived
      if (mission.status === 'in-transit' && currentSol >= mission.arrivalSol) {
        mission.status = 'arrived';
        arrivedMissions.push(mission);
      }
    }

    return arrivedMissions;
  }

  /**
   * Mark a mission as delivered after cargo has been added to resource pool
   * @param missionId - ID of the mission to mark as delivered
   */
  markAsDelivered(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (mission && mission.status === 'arrived') {
      mission.status = 'delivered';
    }
  }

  /**
   * Check if a new mission should be scheduled based on interval
   * @param currentSol - Current mission Sol
   * @returns true if a mission should be scheduled
   */
  shouldScheduleMission(currentSol: number): boolean {
    return currentSol - this.lastScheduledSol >= this.defaultScheduleInterval;
  }

  /**
   * Auto-schedule missions at configured intervals
   * @param currentSol - Current mission Sol
   * @returns Newly scheduled mission, or null if none scheduled
   */
  autoSchedule(currentSol: number): RocketMission | null {
    if (this.shouldScheduleMission(currentSol)) {
      return this.scheduleMission(currentSol);
    }
    return null;
  }

  /**
   * Get mission by ID
   * @param missionId - Mission ID
   * @returns RocketMission or undefined
   */
  getMission(missionId: string): RocketMission | undefined {
    return this.missions.get(missionId);
  }

  /**
   * Get all missions
   * @returns Array of all missions
   */
  getAllMissions(): RocketMission[] {
    return Array.from(this.missions.values());
  }

  /**
   * Get missions by status
   * @param status - Mission status to filter by
   * @returns Array of missions with the specified status
   */
  getMissionsByStatus(status: RocketMission['status']): RocketMission[] {
    return Array.from(this.missions.values()).filter(m => m.status === status);
  }

  /**
   * Get default cargo for standard resupply missions
   * @returns Standard cargo manifest
   */
  private getDefaultCargo(): Cargo {
    return {
      water: 500,      // liters
      nutrients: 100,  // kg
      energy: 1000,    // kWh
      co2: 50,         // kg
    };
  }

  /**
   * Generate trajectory points for rocket animation
   * Creates a bezier curve from Earth to Mars
   * @param launchSol - Launch Sol
   * @param arrivalSol - Arrival Sol
   * @returns Array of trajectory points
   */
  private generateTrajectory(launchSol: number, arrivalSol: number): TrajectoryPoint[] {
    const trajectory: TrajectoryPoint[] = [];
    const travelTime = arrivalSol - launchSol;
    
    // Earth position (fixed, left side of screen)
    const earthX = -400;
    const earthY = 0;
    
    // Mars position (center of screen)
    const marsX = 0;
    const marsY = 0;
    
    // Control points for bezier curve (creates an arc)
    const controlX1 = earthX + (marsX - earthX) * 0.33;
    const controlY1 = -200; // Arc upward
    const controlX2 = earthX + (marsX - earthX) * 0.67;
    const controlY2 = -200;
    
    // Generate points along the curve (one point per 10 Sols for performance)
    const numPoints = Math.max(10, Math.floor(travelTime / 10));
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const sol = launchSol + Math.floor(t * travelTime);
      
      // Cubic bezier curve formula
      const x = Math.pow(1 - t, 3) * earthX +
                3 * Math.pow(1 - t, 2) * t * controlX1 +
                3 * (1 - t) * Math.pow(t, 2) * controlX2 +
                Math.pow(t, 3) * marsX;
      
      const y = Math.pow(1 - t, 3) * earthY +
                3 * Math.pow(1 - t, 2) * t * controlY1 +
                3 * (1 - t) * Math.pow(t, 2) * controlY2 +
                Math.pow(t, 3) * marsY;
      
      trajectory.push({ x, y, sol });
    }
    
    return trajectory;
  }

  /**
   * Get snapshot of rocket system state for persistence
   * @returns Array of all missions
   */
  getSnapshot(): RocketMission[] {
    return this.getAllMissions();
  }

  /**
   * Restore rocket system from snapshot
   * @param missions - Array of missions to restore
   */
  loadSnapshot(missions: RocketMission[]): void {
    this.missions.clear();
    
    for (const mission of missions) {
      this.missions.set(mission.id, mission);
      
      // Update nextMissionId to avoid collisions
      const idNum = parseInt(mission.id.split('-')[1]);
      if (idNum >= this.nextMissionId) {
        this.nextMissionId = idNum + 1;
      }
      
      // Update lastScheduledSol
      if (mission.launchSol > this.lastScheduledSol) {
        this.lastScheduledSol = mission.launchSol;
      }
    }
  }
}
