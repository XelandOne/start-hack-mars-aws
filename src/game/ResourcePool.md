# ResourcePool Class

The `ResourcePool` class manages consumable resources for the Mars Base Simulation Game. It tracks water, energy, nutrients, and CO₂ with consumption, resupply, warning thresholds, and historical tracking.

## Features

### Resource Tracking
- **Water**: 2000L capacity
- **Energy**: 5000kWh capacity
- **Nutrients**: 200kg capacity
- **CO₂**: 100kg capacity

### Core Functionality
- ✅ Resource consumption with validation
- ✅ Resource resupply with capacity limits
- ✅ Warning threshold detection (20% capacity)
- ✅ Emergency detection (0% capacity)
- ✅ Resource history tracking (last 30 Sols)
- ✅ Trend calculation (increasing/stable/decreasing)
- ✅ Consumption rate tracking
- ✅ Snapshot/restore for game state persistence

## Usage

```typescript
import { ResourcePool } from './game';

// Create a new resource pool
const pool = new ResourcePool();

// Consume resources
const success = pool.consume('water', 100); // Returns true if successful

// Resupply resources
pool.resupply('water', 500);

// Check resource status
const status = pool.getStatus('water');
console.log(`Water: ${status.level}L (${status.percentage * 100}%)`);
console.log(`Status: ${status.status}`); // 'ok', 'warning', or 'critical'
console.log(`Days remaining: ${status.daysRemaining}`);

// Set consumption rate
pool.setConsumptionRate('water', 15); // 15L per Sol

// Record history for tracking
pool.recordHistory(currentSol);

// Get history
const history = pool.getHistory('water');

// Check for warnings
const warnings = pool.getWarnings(); // ['water', 'energy']

// Check for emergencies
if (pool.hasEmergency()) {
  console.log('Emergency: Resource depleted!');
}

// Save/load state
const snapshot = pool.getSnapshot();
pool.loadSnapshot(snapshot);
```

## API Reference

### Methods

#### `consume(type: ResourceType, amount: number): boolean`
Consumes the specified amount of a resource. Returns `true` if successful, `false` if insufficient resources.

#### `resupply(type: ResourceType, amount: number): void`
Adds the specified amount to a resource, up to capacity.

#### `getStatus(type: ResourceType): ResourceStatus`
Returns detailed status including level, percentage, days remaining, trend, and status.

#### `setConsumptionRate(type: ResourceType, rate: number): void`
Sets the consumption rate per Sol for a resource.

#### `getConsumptionRate(type: ResourceType): number`
Gets the current consumption rate per Sol.

#### `recordHistory(sol: number): void`
Records current resource levels for the specified Sol. Maintains last 30 Sols.

#### `getHistory(type: ResourceType): ResourceHistoryPoint[]`
Returns the history array for a resource.

#### `getWarnings(): ResourceType[]`
Returns array of resources below warning threshold (20%).

#### `hasEmergency(): boolean`
Returns `true` if any resource is at 0%.

#### `getSnapshot(): Record<ResourceType, ResourceSnapshot>`
Creates a snapshot of all resources for persistence.

#### `loadSnapshot(snapshot: Record<ResourceType, ResourceSnapshot>): void`
Restores resource pool from a snapshot.

## Requirements Validated

- ✅ **4.1**: Tracks water, energy, nutrients, and CO₂ levels
- ✅ **4.2**: Warning indicators at 20% capacity
- ✅ **4.3**: Resource consumption rate calculation
- ✅ **4.4**: Resource history for last 30 Sols

## Testing

The ResourcePool has comprehensive test coverage with 42 unit tests covering:
- Initialization
- Consumption and resupply
- Warning threshold detection
- History tracking
- Trend calculation
- Emergency detection
- Snapshot/restore
- Edge cases

Run tests:
```bash
npm test src/game/ResourcePool.test.ts
```

## Integration Example

```typescript
import { SimulationEngine, ResourcePool } from './game';

// The ResourcePool can be used standalone or integrated with SimulationEngine
const engine = new SimulationEngine();
const pool = new ResourcePool();

// Load initial state from engine
pool.loadSnapshot(engine.gameState.resources);

// Simulate resource consumption per Sol
pool.setConsumptionRate('water', 10); // Base habitat
pool.setConsumptionRate('energy', 50); // Base habitat

// Each tick, consume resources
pool.consume('water', pool.getConsumptionRate('water') * deltaSol);
pool.consume('energy', pool.getConsumptionRate('energy') * deltaSol);

// Record history
pool.recordHistory(engine.gameState.missionSol);

// Check for warnings
const warnings = pool.getWarnings();
if (warnings.length > 0) {
  console.log('Resource warnings:', warnings);
}

// Save state back to engine
engine.gameState.resources = pool.getSnapshot();
```
