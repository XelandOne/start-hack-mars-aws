# RocketSystem

The RocketSystem manages Earth-to-Mars resupply missions for the Mars Base Simulation Game. It handles mission scheduling, travel time calculation, trajectory generation for animation, and cargo delivery tracking.

## Overview

Resupply missions are critical to maintaining the Mars base. Each rocket carries essential resources (water, nutrients, energy, CO₂) from Earth to Mars. The system simulates realistic orbital mechanics with randomized travel times and generates smooth trajectory curves for visual animation.

## Key Features

- **Automatic Scheduling**: Missions are scheduled at configurable intervals (default: 90 Sols)
- **Realistic Travel Times**: 180-270 Sols for normal missions, simulating Hohmann transfer windows
- **Emergency Resupply**: Manual missions with minimum 150 Sol travel time
- **Trajectory Animation**: Bezier curve generation for smooth rocket animation
- **Mission Lifecycle**: Tracks missions through scheduled → in-transit → arrived → delivered states
- **State Persistence**: Full save/load support for game state

## Usage

### Basic Setup

```typescript
import { RocketSystem } from './RocketSystem';

// Create system with default 90 Sol interval
const rocketSystem = new RocketSystem();

// Or with custom interval
const customSystem = new RocketSystem(60); // Every 60 Sols
```

### Scheduling Missions

```typescript
// Auto-schedule at configured intervals
const mission = rocketSystem.autoSchedule(currentSol);
if (mission) {
  console.log(`Mission ${mission.id} scheduled for Sol ${mission.launchSol}`);
}

// Manual scheduling with default cargo
const manualMission = rocketSystem.scheduleMission(currentSol);

// Manual scheduling with custom cargo
const customCargo = {
  water: 1000,
  nutrients: 200,
  energy: 2000,
  co2: 100,
};
const customMission = rocketSystem.scheduleMission(currentSol, customCargo);

// Emergency resupply (minimum 150 Sol travel time)
const emergencyMission = rocketSystem.scheduleMission(currentSol, undefined, true);
```

### Updating Missions

```typescript
// Update all missions based on current Sol
const arrivedMissions = rocketSystem.updateMissions(currentSol);

// Process arrived missions
for (const mission of arrivedMissions) {
  console.log(`Mission ${mission.id} arrived with cargo:`, mission.cargo);
  
  // Add cargo to resource pool
  resourcePool.resupply('water', mission.cargo.water);
  resourcePool.resupply('nutrients', mission.cargo.nutrients);
  resourcePool.resupply('energy', mission.cargo.energy);
  resourcePool.resupply('co2', mission.cargo.co2);
  
  // Mark as delivered
  rocketSystem.markAsDelivered(mission.id);
}
```

### Querying Missions

```typescript
// Get specific mission
const mission = rocketSystem.getMission('rocket-1');

// Get all missions
const allMissions = rocketSystem.getAllMissions();

// Get missions by status
const inTransit = rocketSystem.getMissionsByStatus('in-transit');
const scheduled = rocketSystem.getMissionsByStatus('scheduled');
const arrived = rocketSystem.getMissionsByStatus('arrived');
const delivered = rocketSystem.getMissionsByStatus('delivered');
```

### Trajectory Animation

```typescript
// Get trajectory points for animation
const mission = rocketSystem.getMission('rocket-1');
const trajectory = mission.trajectory;

// Animate rocket along trajectory
function animateRocket(currentSol: number) {
  // Find current position on trajectory
  const point = trajectory.find(p => p.sol === currentSol);
  if (point) {
    drawRocket(point.x, point.y);
  }
}
```

### State Persistence

```typescript
// Save state
const snapshot = rocketSystem.getSnapshot();
localStorage.setItem('rocketMissions', JSON.stringify(snapshot));

// Load state
const savedData = localStorage.getItem('rocketMissions');
if (savedData) {
  const missions = JSON.parse(savedData);
  rocketSystem.loadSnapshot(missions);
}
```

## Mission Lifecycle

Missions progress through four states:

1. **scheduled**: Mission is planned but hasn't launched yet
2. **in-transit**: Rocket has launched and is traveling to Mars
3. **arrived**: Rocket has reached Mars, cargo ready for delivery
4. **delivered**: Cargo has been added to resource pool

```
scheduled → in-transit → arrived → delivered
   (at launchSol)  (at arrivalSol)  (manual)
```

## Default Cargo

Standard resupply missions carry:

- **Water**: 500 liters
- **Nutrients**: 100 kg
- **Energy**: 1000 kWh (batteries)
- **CO₂**: 50 kg

## Travel Time

- **Normal missions**: 180-270 Sols (randomized)
- **Emergency missions**: 150-270 Sols (randomized)

Travel time is randomized to simulate orbital mechanics variability and Hohmann transfer windows.

## Trajectory Generation

Trajectories are generated as cubic Bezier curves:

- **Start**: Earth position (-400, 0)
- **End**: Mars position (0, 0)
- **Control Points**: Create an upward arc for visual appeal
- **Resolution**: One point per 10 Sols (minimum 10 points)

The trajectory provides smooth animation coordinates for rendering the rocket's journey.

## Integration with SimulationEngine

```typescript
class SimulationEngine {
  private rocketSystem: RocketSystem;
  private resourcePool: ResourcePool;
  
  tick(): void {
    // Auto-schedule missions
    this.rocketSystem.autoSchedule(this.currentSol);
    
    // Update missions and handle arrivals
    const arrivedMissions = this.rocketSystem.updateMissions(this.currentSol);
    
    for (const mission of arrivedMissions) {
      // Deliver cargo
      this.resourcePool.resupply('water', mission.cargo.water);
      this.resourcePool.resupply('nutrients', mission.cargo.nutrients);
      this.resourcePool.resupply('energy', mission.cargo.energy);
      this.resourcePool.resupply('co2', mission.cargo.co2);
      
      // Mark as delivered
      this.rocketSystem.markAsDelivered(mission.id);
      
      // Log event
      this.logEvent(`Mission ${mission.id} delivered cargo at Sol ${this.currentSol}`);
    }
  }
}
```

## Testing

The RocketSystem includes comprehensive tests:

- **Unit Tests**: Specific scenarios and edge cases
- **Property-Based Tests**: Universal correctness properties

Key properties validated:
- Mission scheduling intervals (Property 4)
- Travel time bounds (Property 5)
- Manual mission minimum travel time (Property 7)
- Cargo preservation (Property 6)
- State persistence round-trip

Run tests:
```bash
npm test -- RocketSystem.test.ts
```

## Requirements Validated

- **Requirement 2.1**: Configurable mission scheduling intervals
- **Requirement 2.2**: Visual trajectory display
- **Requirement 2.3**: Randomized travel time (180-270 Sols)
- **Requirement 2.4**: Cargo delivery to resource pool
- **Requirement 2.5**: Mission status tracking
- **Requirement 2.6**: Emergency resupply with minimum 150 Sol travel time

## Performance Considerations

- Trajectory generation is optimized with one point per 10 Sols
- Mission updates are O(n) where n is the number of active missions
- State snapshots create shallow copies for efficient serialization
- Mission ID generation uses simple counter (no UUID overhead)

## Future Enhancements

Potential improvements for future iterations:

- Variable cargo capacity based on rocket type
- Launch window constraints (only certain Sols allow launches)
- Mission failure probability
- Fuel consumption simulation
- Multiple rocket types with different speeds
- Orbital mechanics visualization
