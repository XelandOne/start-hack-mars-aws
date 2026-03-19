# Mars Base Simulation Game - Core Engine

This directory contains the core simulation engine and data models for the Mars Base Simulation Game.

## Structure

```
src/game/
├── types.ts              # TypeScript interfaces for all game data models
├── SimulationEngine.ts   # Core simulation loop and state management
├── SimulationEngine.test.ts  # Unit tests for the engine
├── index.ts              # Module exports
└── README.md             # This file
```

## Core Components

### SimulationEngine

The `SimulationEngine` class is the heart of the game, managing:

- **Time Progression**: Tracks mission time in Sols (Mars days) starting from Sol 0
- **Time Acceleration**: Supports 1x, 5x, 10x, and 30x real-time speed
- **Pause/Resume**: Full control over simulation state
- **State Persistence**: Auto-save every 10 Sols to localStorage
- **Import/Export**: JSON-based save/load functionality

#### Usage Example

```typescript
import { SimulationEngine } from './game';

// Create new game
const engine = new SimulationEngine();

// Start simulation
engine.start();

// Change time acceleration
engine.setTimeAcceleration(10);

// Pause
engine.pause();

// Resume
engine.resume();

// Save state
engine.saveState();

// Export to JSON
const json = engine.exportState();

// Load from storage
const loaded = SimulationEngine.loadFromStorage();
```

### Data Models

All game data types are defined in `types.ts`:

- **GameState**: Complete snapshot of simulation state
- **ResourcesState**: Water, energy, nutrients, CO₂ tracking
- **CropState**: Individual crop growth and health
- **RocketMission**: Earth-to-Mars resupply logistics
- **Incident**: Operational incidents and AI responses
- **AstronautState**: Crew health and nutrition
- **MissionScore**: Performance metrics

## Requirements Implemented

This implementation satisfies the following requirements from the spec:

- **Requirement 1.1**: Game time simulation with Sol tracking
- **Requirement 1.2**: Time acceleration controls (1x, 5x, 10x, 30x)
- **Requirement 1.3**: Pause/resume functionality
- **Requirement 1.5**: Game state persistence

## Testing

Run tests with:

```bash
npm test                # Run once
npm run test:watch      # Watch mode
npm run test:ui         # UI mode
```

All 33 unit tests pass, covering:
- Time tracking and progression
- Time acceleration changes
- Pause/resume functionality
- State persistence and serialization
- Initial state validation
- Edge cases and error handling

## Next Steps

Future tasks will add:
- Rocket system for resupply missions
- Greenhouse system for crop management
- Incident manager for operational events
- AI agent controller for autonomous decisions
- Resource pool management
- Scoring system
