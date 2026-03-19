# Design Document: Mars Base Simulation Game

## Overview

The Mars Base Simulation Game transforms the existing Mars Greenhouse management dashboard into an interactive, time-based simulation for hackathon demonstration. The system simulates a 450-Sol Mars mission with autonomous greenhouse operations, Earth-to-Mars resupply logistics, dynamic incident generation, and AI-driven decision-making.

The simulation runs in the browser using React and TypeScript, integrating with the existing AWS Amplify backend and DynamoDB for state persistence. The AI agent queries the Mars Crop Knowledge Base via MCP server to make scientifically accurate decisions about crop selection, resource allocation, and incident response.

Key design goals:
- Reuse existing dashboard components (CropsPanel, SensorsPanel, AgentPanel, MissionTimeline)
- Implement time-accelerated simulation with configurable speed (1x, 5x, 10x, 30x)
- Visualize rocket missions with animated trajectories
- Generate realistic incidents based on operational scenarios from the knowledge base
- Display AI reasoning and decision-making process transparently
- Maintain 30+ FPS performance during gameplay
- Support save/load functionality via browser local storage

## Architecture

### System Components

The simulation follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI Layer                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Dashboard │ │  Crops   │ │ Sensors  │ │  Agent   │      │
│  │  Panel   │ │  Panel   │ │  Panel   │ │  Panel   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Mission  │ │  Rocket  │ │ Incident │                   │
│  │ Timeline │ │Animation │ │  Alerts  │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                   Game Engine Core                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SimulationEngine (time, state, tick processing)     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Rocket   │ │Greenhouse│ │ Incident │ │ Resource │     │
│  │ System   │ │ System   │ │ Manager  │ │  Pool    │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐                                │
│  │ AI Agent │ │  Scoring │                                │
│  │ Controller│ │  System  │                                │
│  └──────────┘ └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │   MCP    │ │ DynamoDB │ │  Local   │                   │
│  │Knowledge │ │(Amplify) │ │ Storage  │                   │
│  │   Base   │ │          │ │          │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**SimulationEngine**: Central orchestrator managing time progression, simulation ticks, and state updates. Runs at configurable tick rates based on time acceleration setting.

**RocketSystem**: Manages Earth-to-Mars resupply missions including launch scheduling, trajectory simulation, travel time calculation, and cargo delivery.

**GreenhouseSystem**: Simulates crop growth cycles, environmental parameters, resource consumption, and harvest operations. Integrates with crop profiles from knowledge base.

**IncidentManager**: Generates random incidents based on operational scenarios, tracks incident state, and coordinates with AI agent for resolution.

**ResourcePool**: Tracks consumable resources (water, energy, nutrients, CO₂) with consumption rates, resupply events, and warning thresholds.

**AIAgentController**: Interfaces with MCP Knowledge Base, makes decisions about crop selection and incident response, and logs reasoning for player visibility.

**ScoringSystem**: Calculates mission score based on crew health, resource efficiency, incident response time, and crop yield metrics.

## Components and Interfaces

### SimulationEngine

Core simulation loop managing time and state updates.

```typescript
interface SimulationEngine {
  // State
  currentSol: number;
  timeAcceleration: 1 | 5 | 10 | 30;
  isPaused: boolean;
  gameState: GameState;
  
  // Methods
  start(): void;
  pause(): void;
  setTimeAcceleration(rate: 1 | 5 | 10 | 30): void;
  tick(): void; // Called on each simulation update
  saveState(): void;
  loadState(state: GameState): void;
}

interface GameState {
  missionSol: number;
  resources: ResourceState;
  crops: CropState[];
  rockets: RocketMission[];
  incidents: Incident[];
  aiDecisions: AIDecision[];
  score: MissionScore;
  astronauts: AstronautState[];
}
```

**Tick Rate Calculation**: Base tick rate is 100ms. Effective simulation time per tick = (100ms * timeAcceleration). At 30x acceleration, each tick advances simulation by 3 seconds of Mars time.

**State Persistence**: Auto-save to localStorage every 10 Sols. Manual save/load via JSON export/import.

### RocketSystem

Manages resupply logistics from Earth to Mars.

```typescript
interface RocketSystem {
  scheduleMission(launchSol: number, cargo: Cargo): RocketMission;
  updateMissions(currentSol: number): void;
  getMissionStatus(missionId: string): MissionStatus;
  calculateTravelTime(): number; // Returns 180-270 Sols
}

interface RocketMission {
  id: string;
  launchSol: number;
  arrivalSol: number;
  status: 'scheduled' | 'in-transit' | 'arrived' | 'delivered';
  cargo: Cargo;
  trajectory: TrajectoryPoint[]; // For animation
}

interface Cargo {
  water: number; // liters
  nutrients: number; // kg
  energy: number; // kWh (batteries)
  co2: number; // kg
}

interface TrajectoryPoint {
  x: number;
  y: number;
  sol: number;
}
```

**Travel Time**: Randomized between 180-270 Sols to simulate orbital mechanics variability (Hohmann transfer windows).

**Cargo Capacity**: Each rocket carries 500L water, 100kg nutrients, 1000kWh energy, 50kg CO₂.

**Animation**: Trajectory calculated as bezier curve from Earth (fixed position) to Mars (center of screen). Progress interpolated based on current Sol vs arrival Sol.

### GreenhouseSystem

Simulates crop growth and environmental control.

```typescript
interface GreenhouseSystem {
  plantCrop(cropType: CropType, zone: number): void;
  updateCrops(deltaSol: number): void;
  harvestCrop(cropId: string): HarvestResult;
  getEnvironmentalParams(): EnvironmentalParams;
  consumeResources(deltaSol: number): ResourceConsumption;
}

interface CropState {
  id: string;
  type: CropType;
  zone: number;
  plantedSol: number;
  growthStage: number; // 0.0 to 1.0
  health: number; // 0.0 to 1.0
  waterStress: number;
  temperatureStress: number;
}

type CropType = 'lettuce' | 'potato' | 'radish' | 'bean' | 'pea' | 'herb';

interface CropProfile {
  type: CropType;
  growthCycleSols: number;
  yieldPerM2: number; // kg
  caloriesPerKg: number;
  proteinPerKg: number;
  waterPerSol: number; // liters per m²
  energyPerSol: number; // kWh per m²
  nutrientsPerSol: number; // kg per m²
  optimalTemp: [number, number]; // [min, max] °C
  optimalHumidity: [number, number]; // [min, max] %
}

interface EnvironmentalParams {
  temperature: number; // °C
  humidity: number; // %
  co2: number; // ppm
  lightIntensity: number; // µmol/m²/s
  pressure: number; // mbar
}
```

**Crop Growth**: Linear growth model where `growthStage` increases by `(1 / growthCycleSols)` per Sol. Stress factors reduce growth rate.

**Resource Consumption**: Calculated per-crop based on profile data. Total consumption = sum across all active crops.

**Environmental Simulation**: Parameters fluctuate within normal ranges unless incident occurs. Temperature: 20-24°C, Humidity: 55-70%, CO₂: 800-1200ppm.

### IncidentManager

Generates and tracks operational incidents.

```typescript
interface IncidentManager {
  generateIncident(currentSol: number): Incident | null;
  updateIncidents(currentSol: number): void;
  resolveIncident(incidentId: string, resolution: Resolution): void;
}

interface Incident {
  id: string;
  type: IncidentType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurredSol: number;
  detectedSol: number;
  resolvedSol: number | null;
  affectedSystems: string[];
  description: string;
  aiResponse: AIResponse | null;
}

type IncidentType = 
  | 'water_efficiency_decline'
  | 'energy_budget_reduction'
  | 'temperature_failure'
  | 'co2_imbalance'
  | 'crop_disease_risk'
  | 'humidity_anomaly'
  | 'nutrient_depletion';

interface AIResponse {
  analysisStartSol: number;
  analysisCompleteSol: number;
  actions: AIAction[];
  reasoning: string;
  knowledgeBaseQueries: string[];
}

interface AIAction {
  type: string;
  parameters: Record<string, any>;
  executedSol: number;
  result: 'success' | 'partial' | 'failed';
}
```

**Incident Generation**: Probability-based system. Base probability: 5% per Sol. Increases with resource scarcity or environmental stress.

**Incident Types**: Mapped to operational scenarios from knowledge base (Section 6). Each type has specific detection signals and recommended responses.

**AI Response Time**: Simulated delay of 0.5-2 Sols for analysis, then immediate action execution.

### ResourcePool

Tracks consumable resources.

```typescript
interface ResourcePool {
  water: Resource;
  energy: Resource;
  nutrients: Resource;
  co2: Resource;
  
  consume(type: ResourceType, amount: number): boolean;
  resupply(type: ResourceType, amount: number): void;
  getStatus(type: ResourceType): ResourceStatus;
}

interface Resource {
  current: number;
  capacity: number;
  consumptionRate: number; // per Sol
  warningThreshold: number; // percentage
}

interface ResourceStatus {
  level: number;
  percentage: number;
  daysRemaining: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  status: 'ok' | 'warning' | 'critical';
}
```

**Initial Capacity**: Water: 2000L, Energy: 5000kWh, Nutrients: 200kg, CO₂: 100kg

**Warning Thresholds**: 20% for all resources

**Consumption Calculation**: Sum of greenhouse consumption + base habitat consumption (10L water, 50kWh energy per Sol)

### AIAgentController

Interfaces with MCP Knowledge Base and makes autonomous decisions.

```typescript
interface AIAgentController {
  mode: 'normal' | 'optimizing' | 'incident_response' | 'emergency';
  
  selectCrops(currentState: GameState): CropSelection[];
  respondToIncident(incident: Incident): AIResponse;
  optimizeResources(currentState: GameState): Optimization[];
  queryKnowledgeBase(query: string): Promise<KBResult>;
}

interface CropSelection {
  cropType: CropType;
  zone: number;
  plantSol: number;
  reasoning: string;
}

interface Optimization {
  type: 'irrigation' | 'temperature' | 'lighting' | 'co2';
  adjustment: number;
  expectedSavings: number;
  reasoning: string;
}

interface KBResult {
  query: string;
  results: any[];
  source: string;
  timestamp: number;
}
```

**Decision Logic**: 
1. Query knowledge base for crop profiles and operational scenarios
2. Evaluate current state (resources, nutritional needs, mission progress)
3. Generate decision options with scoring
4. Select highest-scoring option
5. Log reasoning for player visibility

**MCP Integration**: Use existing MCP client from `src/lib/client.ts`. Query crop profiles, environmental constraints, and operational scenarios as needed.

### ScoringSystem

Calculates mission performance metrics.

```typescript
interface ScoringSystem {
  calculateScore(gameState: GameState): MissionScore;
  getAchievements(gameState: GameState): Achievement[];
}

interface MissionScore {
  total: number;
  breakdown: {
    crewHealth: number; // 0-100
    resourceEfficiency: number; // 0-100
    incidentResponse: number; // 0-100
    cropYield: number; // 0-100
    nutritionalBalance: number; // 0-100
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedSol: number;
}
```

**Scoring Formula**:
- Crew Health: Based on nutritional adequacy (calories, protein, micronutrients)
- Resource Efficiency: (1 - wastePercentage) * 100
- Incident Response: Average response time vs optimal response time
- Crop Yield: Actual yield vs theoretical maximum yield
- Nutritional Balance: Variance from target nutritional profile

**Total Score**: Weighted average: 30% crew health, 25% resource efficiency, 20% incident response, 15% crop yield, 10% nutritional balance

## Data Models

### Game State Schema

Complete snapshot of simulation state for persistence.

```typescript
interface GameState {
  version: string; // Schema version for migration
  missionSol: number;
  startTimestamp: number;
  lastSaveTimestamp: number;
  
  resources: {
    water: ResourceSnapshot;
    energy: ResourceSnapshot;
    nutrients: ResourceSnapshot;
    co2: ResourceSnapshot;
  };
  
  crops: CropState[];
  
  rockets: RocketMission[];
  
  incidents: Incident[];
  
  aiDecisions: AIDecision[];
  
  astronauts: AstronautState[];
  
  score: MissionScore;
  
  settings: GameSettings;
}

interface ResourceSnapshot {
  current: number;
  capacity: number;
  totalConsumed: number;
  totalResupplied: number;
  history: ResourceHistoryPoint[]; // Last 30 Sols
}

interface ResourceHistoryPoint {
  sol: number;
  value: number;
}

interface AstronautState {
  id: string;
  name: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  healthStatus: number; // 0.0 to 1.0
  nutritionalDeficits: string[];
}

interface AIDecision {
  sol: number;
  type: 'crop_selection' | 'incident_response' | 'optimization';
  reasoning: string;
  actions: AIAction[];
  outcome: string;
}

interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  initialResources: number; // multiplier
  incidentFrequency: number; // multiplier
  missionDuration: number; // Sols
}
```

### DynamoDB Schema (Optional)

For cloud persistence via Amplify backend.

```typescript
// Table: MarsSimulationGames
{
  PK: string; // USER#<userId>
  SK: string; // GAME#<gameId>
  gameState: GameState; // JSON
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  missionSol: number; // GSI for sorting
  score: number; // GSI for leaderboard
}
```

**Access Patterns**:
- Get user's games: Query PK = USER#<userId>
- Get specific game: Get PK = USER#<userId>, SK = GAME#<gameId>
- Leaderboard: Query GSI on score (descending)

### Local Storage Schema

For browser-based persistence.

```typescript
// Key: mars-sim-game-<gameId>
{
  gameState: GameState;
  autoSaveEnabled: boolean;
  lastAutoSave: number; // timestamp
}

// Key: mars-sim-settings
{
  defaultDifficulty: string;
  autoSaveInterval: number; // Sols
  soundEnabled: boolean;
  animationsEnabled: boolean;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **State Persistence Properties**: Requirements 1.5 and 9.4 both test serialization/deserialization. These can be combined into a single round-trip property.

2. **Resource Tracking**: Requirements 4.1 (tracking resources) and 4.2 (warning thresholds) can be combined - if we test that warnings trigger at 20%, we implicitly test that resources are tracked.

3. **UI Display Properties**: Many requirements (1.4, 2.5, 3.3, 3.6, 4.4, 6.1, 6.3, 6.5, 7.1-7.4, 7.6, 8.1, 8.3, 8.4, 10.1, 10.2, 10.5) test that specific UI elements exist. These are examples rather than properties and will be tested via unit tests, not property-based tests.

4. **AI Query Properties**: Requirements 6.4, 11.1, 11.2, 11.3, 11.4, and 11.5 all test that the AI queries the knowledge base and uses the data. These can be consolidated into properties about KB integration.

5. **Incident Management**: Requirements 5.3, 5.6, and 5.7 all test incident data structure and logging. These can be combined into properties about incident lifecycle.

6. **Performance Properties**: Requirements 1.3, 5.4, 9.5, 12.1, 12.2, 12.4, and 12.5 test performance characteristics. These are important but should be tested separately from functional properties.

After reflection, I've consolidated 60 acceptance criteria into 25 unique correctness properties that provide comprehensive coverage without redundancy.

### Property 1: Time Progression Monotonicity

*For any* game state at Sol N, advancing the simulation by any positive time delta should result in a game state at Sol M where M > N.

**Validates: Requirements 1.1**

### Property 2: Time Acceleration Response Time

*For any* time acceleration setting change, the simulation tick rate should update within 100ms.

**Validates: Requirements 1.3**

### Property 3: Game State Serialization Round-Trip

*For any* valid game state, serializing to JSON and then deserializing should produce an equivalent game state with all simulation variables preserved.

**Validates: Requirements 1.5, 9.4**

### Property 4: Rocket Mission Scheduling Interval

*For any* configured resupply interval I (in Sols), the rocket system should schedule missions such that the time between consecutive launches equals I ± 1 Sol.

**Validates: Requirements 2.1**

### Property 5: Rocket Travel Time Bounds

*For any* rocket mission, the travel time from launch to arrival should be between 180 and 270 Sols inclusive.

**Validates: Requirements 2.3**

### Property 6: Rocket Cargo Delivery

*For any* rocket mission with cargo C, when the rocket arrives at Mars, the resource pool should increase by exactly the amounts specified in C.

**Validates: Requirements 2.4**

### Property 7: Manual Mission Minimum Travel Time

*For any* manually scheduled emergency resupply mission, the travel time should be at least 150 Sols.

**Validates: Requirements 2.6**

### Property 8: Crop Growth Cycle Bounds

*For any* crop of type T, the growth cycle duration should fall within the specified range for that crop type (lettuce: 30-45, potato: 70-120, radish: 21-30, bean/pea: 50-70 Sols).

**Validates: Requirements 3.1**

### Property 9: Resource Consumption During Growth

*For any* crop growing in the greenhouse, advancing time by delta Sols should decrease the resource pool by at least the crop's consumption rate multiplied by delta.

**Validates: Requirements 3.2**

### Property 10: Automatic Harvest on Completion

*For any* crop that reaches 100% growth stage, the greenhouse system should automatically harvest it and increase food inventory by the crop's yield amount.

**Validates: Requirements 3.4**

### Property 11: Resource Warning Threshold

*For any* resource type, when the resource level falls below 20% of capacity, the game engine should set the warning status to true.

**Validates: Requirements 4.2**

### Property 12: Resource Consumption Rate Calculation

*For any* game state with N active crops, the total resource consumption rate should equal the sum of individual crop consumption rates plus base habitat consumption.

**Validates: Requirements 4.3**

### Property 13: Emergency Mode Activation

*For any* resource type, when the resource level reaches 0%, the greenhouse system should enter emergency mode.

**Validates: Requirements 4.5**

### Property 14: Incident Generation Probability

*For any* simulation run of sufficient length (>100 Sols), at least one incident should be generated.

**Validates: Requirements 5.1**

### Property 15: AI Incident Response Time

*For any* incident, the AI agent should complete analysis and propose response actions within 5 seconds (simulated time).

**Validates: Requirements 5.4**

### Property 16: AI Action Execution

*For any* incident with AI response, at least one AI action should be executed automatically.

**Validates: Requirements 5.5**

### Property 17: Incident Resolution Tracking

*For any* incident that is resolved, the incident record should include a non-null resolution time that is greater than the detection time.

**Validates: Requirements 5.6**

### Property 18: Incident History Logging

*For any* incident that occurs, the incident should appear in the game engine's incident history log.

**Validates: Requirements 5.7**

### Property 19: AI Decision Logging

*For any* AI decision, the game engine should create a log entry containing the reasoning for that decision.

**Validates: Requirements 6.2**

### Property 20: Knowledge Base Query Logging

*For any* AI decision that queries the knowledge base, the decision log should include the KB queries made and results retrieved.

**Validates: Requirements 6.4, 11.1**

### Property 21: Crop Selection Uses KB Data

*For any* crop selection decision, the AI agent should query crop profiles from the knowledge base and use growth cycle, yield, and resource requirement data in the decision.

**Validates: Requirements 11.2**

### Property 22: Incident Response Uses KB Scenarios

*For any* incident response, the AI agent should query operational scenarios from the knowledge base relevant to the incident type.

**Validates: Requirements 11.3**

### Property 23: Environmental Parameters Match KB Data

*For any* environmental parameter (temperature, humidity, CO₂, pressure), the simulated values should fall within the ranges specified in the Mars environmental data from the knowledge base.

**Validates: Requirements 11.4**

### Property 24: KB Citations in Decisions

*For any* AI decision based on knowledge base data, the decision log should include citations to the KB sources used.

**Validates: Requirements 11.5**

### Property 25: Mission Score Calculation Factors

*For any* game state, the calculated mission score should change when any of the following factors change: crew health, resource efficiency, incident response time, crop yield, or nutritional balance.

**Validates: Requirements 8.2**

### Property 26: Achievement Tracking

*For any* achievement condition that is met, the achievement should be added to the game state's achievement list with the Sol it was unlocked.

**Validates: Requirements 8.5**

### Property 27: Auto-Save Interval

*For any* simulation run, game state should be saved to local storage at intervals of 10 Sols ± 1 Sol.

**Validates: Requirements 9.1**

### Property 28: Frame Rate Performance

*For any* simulation running at normal operations (no incidents, <8 active crops), the frame rate should remain at or above 30 FPS.

**Validates: Requirements 12.1**

### Property 29: Tick Interval Consistency

*For any* time acceleration setting, the variance in tick intervals should be less than 10% of the target interval.

**Validates: Requirements 12.2**

### Property 30: Concurrent Query Limit

*For any* point in time during simulation, the number of concurrent AI agent knowledge base queries should not exceed 3.

**Validates: Requirements 12.4**

### Property 31: Initial Load Performance

*For any* saved game state, loading the state should complete within 3 seconds.

**Validates: Requirements 12.5**

## Error Handling

The simulation must handle errors gracefully to maintain game stability and provide clear feedback to players.

### Error Categories

**Simulation Errors**:
- Invalid time acceleration value
- Negative resource values
- Invalid crop type
- Mission Sol out of bounds

**Persistence Errors**:
- Local storage quota exceeded
- Corrupted save data
- Schema version mismatch
- DynamoDB connection failure

**AI Agent Errors**:
- MCP server timeout
- Knowledge base query failure
- Invalid AI decision format
- Action execution failure

**Resource Errors**:
- Resource consumption exceeds available
- Invalid resource type
- Negative resupply amount

### Error Handling Strategies

**Validation**: All inputs to simulation systems should be validated before processing. Invalid inputs should throw descriptive errors.

```typescript
function setTimeAcceleration(rate: number): void {
  const validRates = [1, 5, 10, 30];
  if (!validRates.includes(rate)) {
    throw new Error(`Invalid time acceleration rate: ${rate}. Must be one of ${validRates.join(', ')}`);
  }
  // ... proceed with valid rate
}
```

**Graceful Degradation**: When non-critical systems fail, the simulation should continue with reduced functionality.

```typescript
async function queryKnowledgeBase(query: string): Promise<KBResult> {
  try {
    return await mcpClient.query(query);
  } catch (error) {
    console.error('KB query failed:', error);
    // Return cached data or default values
    return getCachedOrDefaultData(query);
  }
}
```

**State Recovery**: If game state becomes corrupted, attempt to recover by resetting to last known good state.

```typescript
function loadGameState(stateJson: string): GameState {
  try {
    const state = JSON.parse(stateJson);
    validateGameState(state);
    return state;
  } catch (error) {
    console.error('Failed to load game state:', error);
    // Attempt to load auto-save
    const autoSave = getAutoSaveState();
    if (autoSave) {
      return autoSave;
    }
    // Fall back to new game
    return createNewGameState();
  }
}
```

**User Notification**: Critical errors should be displayed to the player with actionable information.

```typescript
interface ErrorNotification {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Example: Storage quota exceeded
{
  severity: 'error',
  message: 'Unable to save game: storage quota exceeded. Please free up space or export your game.',
  action: {
    label: 'Export Game',
    handler: () => exportGameAsJSON()
  }
}
```

**Retry Logic**: Transient failures (network, API rate limits) should be retried with exponential backoff.

```typescript
async function queryWithRetry(query: string, maxRetries = 3): Promise<KBResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await mcpClient.query(query);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

### Error Logging

All errors should be logged with context for debugging:

```typescript
interface ErrorLog {
  timestamp: number;
  sol: number;
  category: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
}

function logError(category: string, error: Error, context: Record<string, any>): void {
  const log: ErrorLog = {
    timestamp: Date.now(),
    sol: gameState.missionSol,
    category,
    message: error.message,
    stack: error.stack,
    context
  };
  
  errorLogs.push(log);
  console.error('[Game Error]', log);
  
  // Send to analytics if available
  if (analytics) {
    analytics.trackError(log);
  }
}
```

## Testing Strategy

The Mars Base Simulation Game requires comprehensive testing to ensure correctness, performance, and user experience quality. We will employ a dual testing approach combining unit tests for specific scenarios and property-based tests for universal correctness properties.

### Testing Approach

**Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points between components. Unit tests are ideal for testing concrete scenarios like "rocket arrives and delivers 500L water" or "lettuce harvest after 35 Sols yields 4kg".

**Property-Based Tests**: Verify universal properties across all inputs using randomized test data. Property tests ensure correctness holds for the entire input space, not just hand-picked examples. Each property test should run a minimum of 100 iterations to achieve adequate coverage through randomization.

**Balance**: Avoid writing too many unit tests for scenarios that property tests already cover. Focus unit tests on specific examples that demonstrate correct behavior, edge cases, and integration points. Let property tests handle comprehensive input coverage.

### Property-Based Testing Framework

For TypeScript/JavaScript, we will use **fast-check** as the property-based testing library.

Installation:
```bash
npm install --save-dev fast-check @types/fast-check
```

### Property Test Configuration

Each property test must:
1. Run minimum 100 iterations (configured via `fc.assert` options)
2. Reference the design document property in a comment tag
3. Use appropriate generators for test data
4. Include clear failure messages

Tag format:
```typescript
// Feature: mars-base-simulation-game, Property 1: Time Progression Monotonicity
```

### Example Property Tests

**Property 1: Time Progression Monotonicity**

```typescript
import fc from 'fast-check';
import { SimulationEngine } from './SimulationEngine';

// Feature: mars-base-simulation-game, Property 1: Time Progression Monotonicity
test('advancing simulation time increases Sol count', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 450 }), // initial Sol
      fc.integer({ min: 1, max: 100 }), // time delta
      (initialSol, delta) => {
        const engine = new SimulationEngine();
        engine.gameState.missionSol = initialSol;
        
        engine.advanceTime(delta);
        
        expect(engine.gameState.missionSol).toBeGreaterThan(initialSol);
        expect(engine.gameState.missionSol).toBe(initialSol + delta);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 3: Game State Serialization Round-Trip**

```typescript
// Feature: mars-base-simulation-game, Property 3: Game State Serialization Round-Trip
test('serializing and deserializing game state preserves all data', () => {
  fc.assert(
    fc.property(
      gameStateArbitrary(), // Custom generator for GameState
      (originalState) => {
        const serialized = JSON.stringify(originalState);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized).toEqual(originalState);
        expect(deserialized.missionSol).toBe(originalState.missionSol);
        expect(deserialized.resources.water.current).toBe(originalState.resources.water.current);
        expect(deserialized.crops.length).toBe(originalState.crops.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 5: Rocket Travel Time Bounds**

```typescript
// Feature: mars-base-simulation-game, Property 5: Rocket Travel Time Bounds
test('rocket travel time is always between 180 and 270 Sols', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 450 }), // launch Sol
      cargoArbitrary(), // Custom generator for Cargo
      (launchSol, cargo) => {
        const rocketSystem = new RocketSystem();
        const mission = rocketSystem.scheduleMission(launchSol, cargo);
        
        const travelTime = mission.arrivalSol - mission.launchSol;
        
        expect(travelTime).toBeGreaterThanOrEqual(180);
        expect(travelTime).toBeLessThanOrEqual(270);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 8: Crop Growth Cycle Bounds**

```typescript
// Feature: mars-base-simulation-game, Property 8: Crop Growth Cycle Bounds
test('crop growth cycles fall within specified ranges', () => {
  const cropRanges: Record<CropType, [number, number]> = {
    lettuce: [30, 45],
    potato: [70, 120],
    radish: [21, 30],
    bean: [50, 70],
    pea: [50, 70],
    herb: [20, 40]
  };
  
  fc.assert(
    fc.property(
      fc.constantFrom(...Object.keys(cropRanges) as CropType[]),
      fc.integer({ min: 0, max: 10 }), // zone
      (cropType, zone) => {
        const greenhouse = new GreenhouseSystem();
        const crop = greenhouse.plantCrop(cropType, zone);
        
        const profile = greenhouse.getCropProfile(cropType);
        const [minCycle, maxCycle] = cropRanges[cropType];
        
        expect(profile.growthCycleSols).toBeGreaterThanOrEqual(minCycle);
        expect(profile.growthCycleSols).toBeLessThanOrEqual(maxCycle);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Custom Generators

Property-based tests require custom generators for domain-specific types:

```typescript
// Generator for GameState
function gameStateArbitrary(): fc.Arbitrary<GameState> {
  return fc.record({
    version: fc.constant('1.0.0'),
    missionSol: fc.integer({ min: 0, max: 450 }),
    startTimestamp: fc.integer({ min: 0 }),
    lastSaveTimestamp: fc.integer({ min: 0 }),
    resources: resourcesArbitrary(),
    crops: fc.array(cropStateArbitrary(), { maxLength: 20 }),
    rockets: fc.array(rocketMissionArbitrary(), { maxLength: 10 }),
    incidents: fc.array(incidentArbitrary(), { maxLength: 50 }),
    aiDecisions: fc.array(aiDecisionArbitrary(), { maxLength: 100 }),
    astronauts: fc.array(astronautStateArbitrary(), { minLength: 4, maxLength: 4 }),
    score: missionScoreArbitrary(),
    settings: gameSettingsArbitrary()
  });
}

// Generator for Cargo
function cargoArbitrary(): fc.Arbitrary<Cargo> {
  return fc.record({
    water: fc.integer({ min: 0, max: 1000 }),
    nutrients: fc.integer({ min: 0, max: 200 }),
    energy: fc.integer({ min: 0, max: 2000 }),
    co2: fc.integer({ min: 0, max: 100 })
  });
}

// Generator for CropState
function cropStateArbitrary(): fc.Arbitrary<CropState> {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('lettuce', 'potato', 'radish', 'bean', 'pea', 'herb'),
    zone: fc.integer({ min: 0, max: 10 }),
    plantedSol: fc.integer({ min: 0, max: 450 }),
    growthStage: fc.float({ min: 0, max: 1 }),
    health: fc.float({ min: 0, max: 1 }),
    waterStress: fc.float({ min: 0, max: 1 }),
    temperatureStress: fc.float({ min: 0, max: 1 })
  });
}
```

### Unit Test Examples

Unit tests complement property tests by verifying specific scenarios:

```typescript
describe('RocketSystem', () => {
  test('rocket arrival adds cargo to resource pool', () => {
    const rocketSystem = new RocketSystem();
    const resourcePool = new ResourcePool();
    
    const cargo: Cargo = {
      water: 500,
      nutrients: 100,
      energy: 1000,
      co2: 50
    };
    
    const initialWater = resourcePool.water.current;
    const mission = rocketSystem.scheduleMission(0, cargo);
    
    // Simulate arrival
    rocketSystem.processMissionArrival(mission, resourcePool);
    
    expect(resourcePool.water.current).toBe(initialWater + 500);
  });
  
  test('emergency mode activates when water reaches zero', () => {
    const greenhouse = new GreenhouseSystem();
    const resourcePool = new ResourcePool();
    
    resourcePool.water.current = 0;
    
    greenhouse.updateEmergencyMode(resourcePool);
    
    expect(greenhouse.isEmergencyMode).toBe(true);
  });
  
  test('lettuce harvest after 35 Sols yields expected amount', () => {
    const greenhouse = new GreenhouseSystem();
    const crop = greenhouse.plantCrop('lettuce', 0);
    
    // Advance 35 Sols
    for (let i = 0; i < 35; i++) {
      greenhouse.updateCrops(1);
    }
    
    const result = greenhouse.harvestCrop(crop.id);
    
    expect(result.yield).toBeGreaterThan(0);
    expect(result.cropType).toBe('lettuce');
  });
});
```

### Integration Tests

Integration tests verify component interactions:

```typescript
describe('Simulation Integration', () => {
  test('complete mission flow: plant, grow, harvest, resupply', () => {
    const engine = new SimulationEngine();
    
    // Plant crops
    engine.greenhouseSystem.plantCrop('lettuce', 0);
    engine.greenhouseSystem.plantCrop('potato', 1);
    
    // Schedule resupply
    const cargo: Cargo = { water: 500, nutrients: 100, energy: 1000, co2: 50 };
    engine.rocketSystem.scheduleMission(90, cargo);
    
    // Run simulation for 100 Sols
    for (let sol = 0; sol < 100; sol++) {
      engine.tick();
    }
    
    // Verify outcomes
    expect(engine.gameState.missionSol).toBe(100);
    expect(engine.gameState.crops.some(c => c.growthStage === 1.0)).toBe(true);
    expect(engine.rocketSystem.getMissionStatus('mission-1').status).toBe('in-transit');
  });
});
```

### Performance Tests

Performance properties should be tested separately:

```typescript
describe('Performance', () => {
  test('simulation maintains 30+ FPS with 8 crops', () => {
    const engine = new SimulationEngine();
    
    // Plant 8 crops
    for (let i = 0; i < 8; i++) {
      engine.greenhouseSystem.plantCrop('lettuce', i);
    }
    
    const frameCount = 100;
    const startTime = performance.now();
    
    for (let i = 0; i < frameCount; i++) {
      engine.tick();
      engine.render();
    }
    
    const endTime = performance.now();
    const fps = (frameCount / (endTime - startTime)) * 1000;
    
    expect(fps).toBeGreaterThanOrEqual(30);
  });
  
  test('game state loads within 3 seconds', async () => {
    const largeGameState = createLargeGameState(); // 450 Sols of data
    const serialized = JSON.stringify(largeGameState);
    
    const startTime = performance.now();
    const engine = new SimulationEngine();
    await engine.loadState(serialized);
    const endTime = performance.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(3000);
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: 80%+ line coverage for core simulation logic
- **Property Test Coverage**: All 31 correctness properties implemented
- **Integration Test Coverage**: All major component interactions tested
- **Performance Test Coverage**: All performance requirements verified

### Continuous Testing

Tests should run automatically:
- On every commit (via CI/CD)
- Before deployment
- On schedule (nightly) for long-running property tests with higher iteration counts

### Test Documentation

Each test file should include:
- Description of what is being tested
- References to requirements and design properties
- Setup and teardown procedures
- Known limitations or edge cases

This comprehensive testing strategy ensures the Mars Base Simulation Game is correct, performant, and maintainable throughout the hackathon and beyond.
