# GreenhouseSystem

## Overview

The `GreenhouseSystem` manages crop growth and environmental control for the Mars Base Simulation Game. It monitors resource levels and activates emergency mode when resources are depleted.

## Emergency Mode (Requirement 4.5)

When any resource (water, energy, nutrients, or CO₂) reaches 0%, the greenhouse system automatically enters **emergency mode** to reduce operations and conserve remaining resources.

### Emergency Mode Behavior

**Activation**: Triggered when `ResourcePool.hasEmergency()` returns `true` (any resource at 0%)

**Deactivation**: Exits emergency mode when all resources are above 0%

**Future Operations** (to be implemented in later tasks):
- Reduce lighting intensity
- Minimize water usage
- Lower temperature setpoints
- Suspend new crop planting
- Prioritize critical crops only

## API

### Constructor

```typescript
constructor(resourcePool: ResourcePool)
```

Creates a new GreenhouseSystem instance linked to a ResourcePool.

### Methods

#### `isEmergencyMode(): boolean`

Returns whether the greenhouse is currently in emergency mode.

#### `updateEmergencyMode(): void`

Checks resource levels and updates emergency mode status. Should be called each simulation tick.

#### `getDepletedResources(): ResourceType[]`

Returns an array of resource types that are currently at 0%.

## Usage Example

```typescript
import { ResourcePool, GreenhouseSystem } from './game';

const resourcePool = new ResourcePool();
const greenhouse = new GreenhouseSystem(resourcePool);

// In simulation loop
function tick() {
  // ... consume resources ...
  
  // Update emergency mode status
  greenhouse.updateEmergencyMode();
  
  if (greenhouse.isEmergencyMode()) {
    const depleted = greenhouse.getDepletedResources();
    console.log('EMERGENCY: Resources depleted:', depleted);
    // Display warning to player
  }
}
```

## Testing

The GreenhouseSystem includes comprehensive unit tests and property-based tests:

- **Unit Tests**: Verify emergency mode activation for each resource type
- **Property-Based Tests**: Validate emergency mode behavior across random resource states
- **Integration Tests**: Ensure correct synchronization with ResourcePool

Run tests:
```bash
npm test src/game/GreenhouseSystem.test.ts
```

## Future Enhancements

Task 5 will expand the GreenhouseSystem to include:
- Crop growth simulation
- Environmental parameter control
- Resource consumption calculation
- Automatic harvesting
- Stress factor tracking
