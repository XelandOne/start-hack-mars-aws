/**
 * GreenhouseSystem - Manages crop growth and environmental control
 * Handles emergency mode activation when resources are depleted
 * 
 * Requirements: 4.5
 */

import type { ResourceType } from './types';
import { ResourcePool } from './ResourcePool';

export class GreenhouseSystem {
  private emergencyMode: boolean = false;
  private resourcePool: ResourcePool;

  constructor(resourcePool: ResourcePool) {
    this.resourcePool = resourcePool;
  }

  /**
   * Check if greenhouse is in emergency mode
   * @returns true if in emergency mode
   */
  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  /**
   * Update emergency mode status based on resource levels
   * Requirement 4.5: If any resource reaches 0%, enter emergency mode
   */
  updateEmergencyMode(): void {
    const hasEmergency = this.resourcePool.hasEmergency();
    
    if (hasEmergency && !this.emergencyMode) {
      this.enterEmergencyMode();
    } else if (!hasEmergency && this.emergencyMode) {
      this.exitEmergencyMode();
    }
  }

  /**
   * Enter emergency mode - reduce operations
   */
  private enterEmergencyMode(): void {
    this.emergencyMode = true;
    console.log('[GreenhouseSystem] Entering emergency mode - resource depleted');
    // TODO: Implement operation reduction logic in future tasks
    // - Reduce lighting intensity
    // - Minimize water usage
    // - Lower temperature setpoints
    // - Suspend new crop planting
  }

  /**
   * Exit emergency mode - restore normal operations
   */
  private exitEmergencyMode(): void {
    this.emergencyMode = false;
    console.log('[GreenhouseSystem] Exiting emergency mode - resources restored');
    // TODO: Implement operation restoration logic in future tasks
  }

  /**
   * Get which resources are currently depleted (at 0%)
   * @returns Array of depleted resource types
   */
  getDepletedResources(): ResourceType[] {
    const depleted: ResourceType[] = [];
    const resourceTypes: ResourceType[] = ['water', 'energy', 'nutrients', 'co2'];
    
    for (const type of resourceTypes) {
      const status = this.resourcePool.getStatus(type);
      if (status.level === 0) {
        depleted.push(type);
      }
    }
    
    return depleted;
  }
}
