# Implementation Plan: Mars Base Simulation Game

## Overview

This implementation plan transforms the existing Mars Greenhouse dashboard into an interactive simulation game. The approach is incremental: build core simulation engine first, add subsystems (rockets, greenhouse, incidents), integrate with existing UI components, and finally add game features (scoring, persistence, animations).

The implementation uses TypeScript and React, integrating with the existing AWS Amplify backend and MCP Knowledge Base server. All tasks build on previous work, with no orphaned code.

## Tasks

- [x] 1. Set up simulation engine core and data models
  - Create `src/game/` directory structure for game logic
  - Define TypeScript interfaces for GameState, SimulationEngine, and core data models
  - Implement basic SimulationEngine with time tracking (Sol counter, time acceleration)
  - Add pause/resume functionality
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.1 Write property test for time progression monotonicity
  - **Property 1: Time Progression Monotonicity**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for time acceleration response
  - **Property 2: Time Acceleration Response Time**
  - **Validates: Requirements 1.3**

- [ ] 2. Implement ResourcePool system
  - [x] 2.1 Create ResourcePool class with water, energy, nutrients, CO₂ tracking
    - Implement resource consumption and resupply methods
    - Add warning threshold detection (20% capacity)
    - Track resource history for last 30 Sols
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Write property test for resource warning thresholds
    - **Property 11: Resource Warning Threshold**
    - **Validates: Requirements 4.2**

  - [x] 2.3 Write property test for resource consumption calculation
    - **Property 12: Resource Consumption Rate Calculation**
    - **Validates: Requirements 4.3**

  - [x] 2.4 Implement emergency mode activation
    - Add emergency mode flag to GreenhouseSystem
    - Trigger when any resource reaches 0%
    - _Requirements: 4.5_

  - [x] 2.5 Write property test for emergency mode activation
    - **Property 13: Emergency Mode Activation**
    - **Validates: Requirements 4.5**

- [~] 3. Checkpoint - Verify core engine and resources
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement RocketSystem for resupply missions
  - [x] 4.1 Create RocketSystem class with mission scheduling
    - Implement mission scheduling at configurable intervals (default 90 Sols)
    - Calculate travel time (180-270 Sols with randomization)
    - Generate trajectory points for animation
    - Track mission status (scheduled, in-transit, arrived, delivered)
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 4.2 Write property test for mission scheduling intervals
    - **Property 4: Rocket Mission Scheduling Interval**
    - **Validates: Requirements 2.1**

  - [x] 4.3 Write property test for travel time bounds
    - **Property 5: Rocket Travel Time Bounds**
    - **Validates: Requirements 2.3**

  - [x] 4.4 Implement cargo delivery on arrival
    - Add cargo to ResourcePool when rocket arrives
    - Update mission status to delivered
    - _Requirements: 2.4_

  - [x] 4.5 Write property test for cargo delivery
    - **Property 6: Rocket Cargo Delivery**
    - **Validates: Requirements 2.4**

  - [x] 4.6 Add manual emergency resupply scheduling
    - Allow player to schedule missions with minimum 150 Sol travel time
    - _Requirements: 2.6_

  - [x] 4.7 Write property test for manual mission minimum travel time
    - **Property 7: Manual Mission Minimum Travel Time**
    - **Validates: Requirements 2.6**

- [ ] 5. Implement GreenhouseSystem for crop management
  - [~] 5.1 Create crop profile data from knowledge base
    - Define CropProfile interface with growth cycles, yields, resource requirements
    - Create crop profiles for lettuce, potato, radish, bean, pea, herb
    - Use data from Mars Crop Knowledge Base (Section 3)
    - _Requirements: 3.1, 11.2_

  - [~] 5.2 Write property test for crop growth cycle bounds
    - **Property 8: Crop Growth Cycle Bounds**
    - **Validates: Requirements 3.1**

  - [~] 5.3 Implement crop planting and growth simulation
    - Create GreenhouseSystem class with plantCrop method
    - Implement linear growth model (growthStage 0.0 to 1.0)
    - Update crops on each simulation tick
    - _Requirements: 3.1, 3.6_

  - [~] 5.4 Add resource consumption during growth
    - Calculate per-crop resource consumption based on profiles
    - Deduct from ResourcePool on each tick
    - _Requirements: 3.2_

  - [~] 5.5 Write property test for resource consumption during growth
    - **Property 9: Resource Consumption During Growth**
    - **Validates: Requirements 3.2**

  - [~] 5.6 Implement automatic harvesting
    - Detect when crop reaches 100% growth stage
    - Add yield to food inventory
    - Remove crop from active crops list
    - _Requirements: 3.4_

  - [~] 5.7 Write property test for automatic harvest
    - **Property 10: Automatic Harvest on Completion**
    - **Validates: Requirements 3.4**

  - [~] 5.8 Add environmental parameter simulation
    - Track temperature, humidity, CO₂, light intensity, pressure
    - Simulate normal fluctuations within ranges
    - _Requirements: 3.3, 11.4_

  - [~] 5.9 Write property test for environmental parameters
    - **Property 23: Environmental Parameters Match KB Data**
    - **Validates: Requirements 11.4**

- [~] 6. Checkpoint - Verify rocket and greenhouse systems
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement IncidentManager for dynamic events
  - [~] 7.1 Create IncidentManager class with incident generation
    - Define incident types (water efficiency decline, energy reduction, temperature failure, CO₂ imbalance, disease risk)
    - Implement probability-based generation (5% base per Sol)
    - Track incident state (occurred, detected, resolved)
    - _Requirements: 5.1, 5.2_

  - [~] 7.2 Write property test for incident generation
    - **Property 14: Incident Generation Probability**
    - **Validates: Requirements 5.1**

  - [~] 7.3 Add incident logging and history
    - Store all incidents in game state
    - Track resolution time
    - _Requirements: 5.6, 5.7_

  - [~] 7.4 Write property tests for incident tracking
    - **Property 17: Incident Resolution Tracking**
    - **Property 18: Incident History Logging**
    - **Validates: Requirements 5.6, 5.7**

- [ ] 8. Implement AIAgentController for autonomous decisions
  - [~] 8.1 Create AIAgentController class with MCP integration
    - Set up connection to Mars Crop Knowledge Base via MCP client
    - Implement queryKnowledgeBase method with retry logic
    - Add operational mode tracking (normal, optimizing, incident_response, emergency)
    - _Requirements: 6.1, 11.1_

  - [~] 8.2 Implement crop selection logic
    - Query crop profiles from knowledge base
    - Evaluate nutritional needs for 4 astronauts over 450 Sols
    - Select crops to optimize nutritional balance
    - Log reasoning for decisions
    - _Requirements: 3.5, 6.2, 11.2_

  - [~] 8.3 Write property test for crop selection KB usage
    - **Property 21: Crop Selection Uses KB Data**
    - **Validates: Requirements 11.2**

  - [~] 8.4 Implement incident response logic
    - Query operational scenarios from knowledge base for incident type
    - Generate response actions (adjust irrigation, temperature, isolate zones)
    - Execute actions automatically
    - Log reasoning and KB queries
    - _Requirements: 5.4, 5.5, 6.2, 11.3_

  - [~] 8.5 Write property tests for AI response and KB integration
    - **Property 15: AI Incident Response Time**
    - **Property 16: AI Action Execution**
    - **Property 19: AI Decision Logging**
    - **Property 20: Knowledge Base Query Logging**
    - **Property 22: Incident Response Uses KB Scenarios**
    - **Validates: Requirements 5.4, 5.5, 6.2, 6.4, 11.1, 11.3**

  - [~] 8.6 Add KB citation tracking
    - Include KB sources in decision logs
    - Display citations in UI
    - _Requirements: 11.5_

  - [~] 8.7 Write property test for KB citations
    - **Property 24: KB Citations in Decisions**
    - **Validates: Requirements 11.5**

- [ ] 9. Implement ScoringSystem for mission metrics
  - [~] 9.1 Create ScoringSystem class with score calculation
    - Calculate crew health based on nutritional adequacy
    - Calculate resource efficiency (1 - waste percentage)
    - Calculate incident response score (response time vs optimal)
    - Calculate crop yield score (actual vs theoretical)
    - Calculate nutritional balance score
    - Compute weighted total score
    - _Requirements: 8.2_

  - [~] 9.2 Write property test for score calculation
    - **Property 25: Mission Score Calculation Factors**
    - **Validates: Requirements 8.2**

  - [~] 9.3 Implement achievement system
    - Define achievements (Zero Waste Week, Perfect Harvest, Rapid Response)
    - Track achievement unlock conditions
    - Add achievements to game state when unlocked
    - _Requirements: 8.5_

  - [~] 9.4 Write property test for achievement tracking
    - **Property 26: Achievement Tracking**
    - **Validates: Requirements 8.5**

  - [~] 9.4 Add mission success criteria tracking
    - Track mission progress (days remaining, nutritional adequacy, system health)
    - Display mission summary on completion
    - _Requirements: 8.1, 8.3, 8.4_

- [~] 10. Checkpoint - Verify game logic systems
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement game state persistence
  - [~] 11.1 Add localStorage save/load functionality
    - Implement auto-save every 10 Sols
    - Add manual save/export as JSON
    - Add load/import from JSON
    - Handle corrupted save data gracefully
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [~] 11.2 Write property tests for state persistence
    - **Property 3: Game State Serialization Round-Trip**
    - **Property 27: Auto-Save Interval**
    - **Validates: Requirements 1.5, 9.1, 9.4**

  - [ ] 11.3 Add DynamoDB integration (optional)
    - Create DynamoDB table schema for cloud saves
    - Implement save/load via Amplify backend
    - Add leaderboard query support
    - _Requirements: 10.3_

  - [ ] 11.4 Write property test for load performance
    - **Property 31: Initial Load Performance**
    - **Validates: Requirements 12.5**

- [ ] 12. Create game UI components
  - [~] 12.1 Create GameControls component
    - Add time acceleration buttons (1x, 5x, 10x, 30x)
    - Add pause/resume button
    - Display current Sol, mission day, Earth time equivalent
    - _Requirements: 1.2, 1.4_

  - [~] 12.2 Create RocketAnimation component
    - Display rocket trajectory from Earth to Mars
    - Animate rocket progress based on current Sol
    - Show mission status and cargo manifest
    - _Requirements: 2.2, 2.5, 7.2_

  - [~] 12.3 Create IncidentAlert component
    - Display incident alerts with type, severity, affected systems
    - Show AI response and actions
    - Track resolution status
    - _Requirements: 5.3, 7.4_

  - [~] 12.4 Create ResourcePanel component
    - Display resource levels with progress bars
    - Show warning indicators when below 20%
    - Display consumption rate and days remaining
    - Show resource trend graphs (last 30 Sols)
    - _Requirements: 4.2, 4.4_

  - [~] 12.5 Create MissionScore component
    - Display real-time mission score breakdown
    - Show mission progress (days remaining, nutritional adequacy, system health)
    - Display unlocked achievements
    - Show mission summary on completion
    - _Requirements: 8.3, 8.4, 8.5_

- [ ] 13. Enhance existing dashboard components for game mode
  - [~] 13.1 Update CropsPanel for game visualization
    - Add crop growth stage progress indicators
    - Display crop health status with visual indicators
    - Show planting schedule from AI agent
    - Animate crop growth transitions
    - _Requirements: 3.6, 7.3, 10.1_

  - [~] 13.2 Update SensorsPanel for environmental simulation
    - Display real-time environmental parameters
    - Highlight affected areas during incidents
    - Show normal vs incident ranges
    - _Requirements: 3.3, 7.4, 10.1_

  - [~] 13.3 Update AgentPanel for AI visualization
    - Display current operational mode
    - Show decision log with reasoning
    - Display active tasks with progress
    - Show KB queries and results
    - Add chat interface for player questions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1_

  - [~] 13.4 Update MissionTimeline for game events
    - Display rocket launches and arrivals
    - Show incident occurrences and resolutions
    - Display crop planting and harvest events
    - Show AI decisions and actions
    - _Requirements: 10.1_

- [ ] 14. Add game mode toggle and integration
  - [~] 14.1 Create GameModeToggle component
    - Add toggle switch between dashboard and game modes
    - Preserve state when switching modes
    - _Requirements: 10.5_

  - [~] 14.2 Integrate SimulationEngine with App component
    - Initialize engine on game mode activation
    - Connect engine to all game UI components
    - Set up simulation tick loop with requestAnimationFrame
    - _Requirements: 10.2, 12.3_

  - [~] 14.3 Wire all subsystems together
    - Connect RocketSystem to ResourcePool for cargo delivery
    - Connect GreenhouseSystem to ResourcePool for consumption
    - Connect IncidentManager to AIAgentController for responses
    - Connect AIAgentController to GreenhouseSystem for crop selection
    - Connect all systems to ScoringSystem for metrics
    - _Requirements: 10.2_

- [~] 15. Checkpoint - Verify UI integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Add visual polish and animations
  - [~] 16.1 Create Mars-themed styling
    - Apply Mars color palette (reds, oranges, browns)
    - Add space-themed UI elements
    - Style all game components consistently
    - _Requirements: 7.5_

  - [~] 16.2 Implement rocket trajectory animation
    - Calculate bezier curve from Earth to Mars
    - Animate rocket along trajectory
    - Add launch and landing effects
    - _Requirements: 7.2_

  - [~] 16.3 Add crop growth animations
    - Animate growth stage transitions
    - Add harvest celebration effects
    - Highlight newly planted crops
    - _Requirements: 7.3_

  - [~] 16.4 Add incident visual alerts
    - Highlight affected greenhouse zones
    - Animate alert indicators
    - Show recovery progress
    - _Requirements: 7.4_

  - [~] 16.5 Add astronaut avatars
    - Display 4 astronaut avatars
    - Show nutritional status indicators
    - Update health status visually
    - _Requirements: 7.6_

- [ ] 17. Implement performance optimizations
  - [~] 17.1 Optimize simulation tick processing
    - Ensure consistent tick intervals based on time acceleration
    - Use requestAnimationFrame for smooth rendering
    - Batch state updates to minimize re-renders
    - _Requirements: 12.2, 12.3_

  - [~] 17.2 Write performance tests
    - **Property 28: Frame Rate Performance**
    - **Property 29: Tick Interval Consistency**
    - **Validates: Requirements 12.1, 12.2**

  - [~] 17.3 Add concurrent query limiting
    - Limit AI agent KB queries to 3 concurrent requests
    - Queue additional queries
    - _Requirements: 12.4_

  - [~] 17.4 Write property test for concurrent query limit
    - **Property 30: Concurrent Query Limit**
    - **Validates: Requirements 12.4**

- [ ] 18. Add error handling and recovery
  - [~] 18.1 Implement validation for all inputs
    - Validate time acceleration values
    - Validate resource amounts (no negatives)
    - Validate crop types
    - Validate Sol ranges
    - _Requirements: 12.5_

  - [~] 18.2 Add graceful degradation for KB failures
    - Implement retry logic with exponential backoff
    - Fall back to cached data when KB unavailable
    - Display user notifications for critical errors
    - _Requirements: 12.4_

  - [~] 18.3 Add state recovery for corrupted saves
    - Validate game state schema on load
    - Attempt to load auto-save if main save corrupted
    - Fall back to new game if all recovery fails
    - _Requirements: 9.2_

- [ ] 19. Add game configuration and difficulty settings
  - [~] 19.1 Create GameSettings interface and UI
    - Add difficulty selection (easy, normal, hard)
    - Configure initial resources multiplier
    - Configure incident frequency multiplier
    - Configure mission duration
    - _Requirements: 9.3_

  - [~] 19.2 Apply difficulty settings to game systems
    - Adjust initial resource capacity based on difficulty
    - Adjust incident generation probability
    - Adjust mission duration (300/450/600 Sols)
    - _Requirements: 9.3_

- [ ] 20. Final integration and testing
  - [~] 20.1 Run full simulation test
    - Start new game with default settings
    - Run simulation for 100 Sols at 30x speed
    - Verify all systems functioning (rockets, crops, incidents, AI)
    - Verify no errors or crashes
    - _Requirements: All_

  - [~] 20.2 Run all property-based tests
    - Execute all 31 property tests with 100 iterations each
    - Verify all properties pass
    - _Requirements: All_

  - [~] 20.3 Run performance test suite
    - Verify 30+ FPS with 8 active crops
    - Verify load time under 3 seconds
    - Verify tick interval consistency
    - _Requirements: 12.1, 12.2, 12.5_

  - [~] 20.4 Test save/load functionality
    - Save game at Sol 50
    - Reload and verify state preserved
    - Export as JSON and re-import
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [~] 21. Final checkpoint - Complete game ready for demo
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation is incremental - each task builds on previous work
- Checkpoints ensure validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- All code integrates with existing dashboard components to minimize development time
- The game uses TypeScript throughout, matching the existing codebase
- MCP Knowledge Base integration provides scientifically accurate Mars agriculture data
