# Mars Greenhouse — Calorie Management & Life Sustaining Food System

## The Problem: Feeding Humans on Mars

Four astronauts. 450 sols. No resupply. No corner store.

The Mars greenhouse doesn't just grow food — it is the only thing standing between the crew and starvation. Every calorie that gets consumed has to be grown, harvested, stored, and rationed with precision. The challenge isn't just "grow enough food overall" — it's making sure the crew survives the early mission days before the first harvests come in, recovers from lean periods caused by dust storms or crop failures, and never depletes the pantry so badly that recovery becomes impossible.

---

## How the Calorie Engine Works

### The Daily Target

Each crew member needs up to **3,000 kcal/day** to function. With 4 astronauts, that's **12,000 kcal/day** as the mission baseline. Over 450 sols, the total mission calorie goal is **5,400,000 kcal**.

The system tracks this as a running cumulative target:

```
missionKcalGoal(day) = 12,000 × day
```

Every sol, the sim compares what the crew *should* have consumed by now against what they *actually* consumed. The gap is the **calorie deficit**.

### The Pantry

Harvested food doesn't go directly into mouths — it flows into a shared pantry (food storage). The pantry accumulates surplus on good harvest days and gets drawn down on lean days. This buffer is critical during the early mission phase when crops are still in their first growth cycle and nothing has been harvested yet.

### Hunger Periods and Catch-Up Eating

The early mission is the hardest. Potatoes take 70–120 sols to mature. Beans take 50–70. Even fast crops like radishes need 21–30 sols. For the first few weeks, the pantry is empty and the crew is running a calorie deficit.

The system handles this with **adaptive catch-up consumption**:

```
deficit       = max(0, missionKcalGoal − totalConsumedSoFar)
catchUpTarget = min(dailyTarget × 1.5, dailyTarget + deficit)
consumed      = min(pantryAvailable, catchUpTarget)
```

What this means in practice:

- During lean periods with no food, the crew consumes whatever is available (even if it's zero).
- Once harvests start coming in, the crew eats **up to 1.5× their daily target** (up to 4,500 kcal/person/day) to recover the deficit.
- As the deficit closes, the catch-up target naturally shrinks back toward exactly 3,000 kcal/day.
- Once fully caught up, the crew sticks to the baseline — no over-eating, no pantry depletion.

This mirrors real human biology: after a period of food scarcity, the body craves and benefits from slightly elevated intake to restore energy reserves, before settling back into a maintenance pattern.

### Dust Storm Resilience

Martian dust storms reduce available sunlight by up to 35%, cutting photosynthesis and harvest yields. The system models this with a `stormPenalty` multiplier on harvest output. The pantry buffer absorbs these shocks — a well-stocked pantry means a dust storm causes a temporary dip in daily intake rather than a life-threatening crisis.

---

## Crop Strategy: Caloric Diversity for Survival

The greenhouse runs five crop types, each playing a distinct role in the calorie supply chain:

| Crop | Cycle | Role | kcal/100g |
|------|-------|------|-----------|
| Potato | 70–120 sols | Primary energy backbone | ~77 |
| Beans/Peas | 50–70 sols | Protein + calories | ~80–120 |
| Lettuce | 30–45 sols | Micronutrients, early buffer | ~15 |
| Radish | 21–30 sols | Fast buffer, first harvests | ~16 |
| Herbs | Short | Crew morale, psychological health | minimal |

Potatoes dominate caloric output per m². Radishes and lettuce come in first and provide early psychological and nutritional support while the high-calorie crops mature. Beans anchor protein intake. The allocation is tunable — the crew can shift percentages based on mission phase and current pantry levels.

---

## AWS Services Powering the System

### AI & Autonomous Decision-Making

**Amazon Bedrock AgentCore** is the central nervous system. It orchestrates multi-agent workflows that monitor pantry levels, forecast upcoming harvests, and autonomously adjust crop allocations when the calorie trajectory drifts off target. When the system detects a projected deficit 30 sols out, AgentCore can trigger replanting decisions, reallocate greenhouse zones, or recommend LED schedule changes — all without crew intervention.

**Amazon Bedrock (Nova Lite)** powers the conversational AI agent embedded in the dashboard. Crew members can ask natural language questions — "which crop gives the most calories per m²?" or "how long until we hit our calorie goal?" — and get grounded, practical answers backed by the Mars Crop Knowledge Base.

**Amazon SageMaker** runs predictive yield forecasting models. Trained on Mars crop simulation data, these models give per-crop yield predictions with confidence intervals (e.g., "lettuce: 4.3 kg/m², 91% confidence"). The calorie engine uses these forecasts to project future pantry levels and flag deficit risks before they happen.

**Amazon Braket** handles quantum optimization for multi-variable resource allocation. Balancing water, light, nutrients, CO2, and floor area across five crop types with interdependent growth cycles is a combinatorial problem that benefits from quantum annealing approaches — finding the allocation that maximizes caloric output while respecting all environmental constraints.

### Sensor Data & Real-Time Monitoring

**AWS IoT Core** ingests the continuous stream of greenhouse sensor data — temperature, humidity, CO2, PAR light levels, water pH, nutrient EC, O2, and power draw. Every sensor reading is a data point that affects crop health and therefore future caloric output.

**Amazon Kinesis** handles the real-time telemetry pipeline. Sensor events flow through Kinesis Data Streams into processing Lambda functions that evaluate thresholds and trigger autonomous responses. A CO2 spike or temperature excursion gets detected and acted on within seconds.

**AWS IoT TwinMaker** maintains a live digital twin of the greenhouse. Every zone, every crop cell, every environmental parameter is mirrored in a virtual model. The twin lets the system simulate "what if" scenarios — what happens to caloric output if Zone B loses 20% of its LED capacity for 10 sols? — before committing to real-world changes.

**AWS Ground Station** manages the Mars-Earth communication relay. Mission telemetry, pantry status, and calorie trajectory data are uplinked to Earth for mission control review. In the event of a critical food security situation, Earth-side teams can push updated crop allocation strategies back to the greenhouse.

### Storage & Data Persistence

**Amazon DynamoDB** stores the mission state: current pantry levels, daily calorie consumption history, crop allocation percentages, sensor readings, and agent decision logs. Every sol's data is persisted so the system can reconstruct the full calorie trajectory at any point in the mission.

**Amazon S3** hosts the Mars Crop Knowledge Base — the authoritative reference dataset for crop profiles, environmental constraints, nutrient requirements, and yield models. The AI agent queries this via MCP (Model Context Protocol) to ground its recommendations in real agronomic data rather than hallucination.

**AWS HealthLake** stores astronaut biometric and nutritional health data. Crew calorie consumption is cross-referenced against individual metabolic rates, activity levels, and health markers. A crew member doing an EVA burns more calories than one running diagnostics — the system accounts for this in daily targets.

**Amazon Managed Blockchain** provides an immutable audit log of every autonomous agent decision. Every crop reallocation, every pantry drawdown, every LED adjustment is recorded with a cryptographic hash. This is mission accountability — if something goes wrong, the full decision trail is tamper-proof and reviewable.

### Operations & Frontend

**AWS Amplify Gen2** hosts the React dashboard and provides the GraphQL API layer. The control center gives crew members a real-time view of pantry levels, calorie trajectory charts, crop growth status, and AI agent recommendations — all in one interface.

**Amazon Cognito** handles crew authentication and role-based access. Not every crew member needs write access to crop allocation settings. Cognito enforces mission roles — commander, botanist, medic — with appropriate permissions for each.

**AWS Lambda** is the event-driven backbone. When a sensor threshold is breached, a Lambda fires. When a harvest completes, a Lambda updates the pantry and recalculates the calorie trajectory. When the AI agent makes a decision, a Lambda persists it to DynamoDB and logs it to Blockchain. The entire system is reactive and serverless.

**Amazon Lookout for Equipment** monitors greenhouse hardware — pumps, LED arrays, CO2 injectors, nutrient dosing systems. Equipment failure directly impacts crop health and caloric output. Lookout detects anomalous vibration patterns, power fluctuations, and flow rate deviations before they become failures, giving the system time to compensate.

---

## The Architecture Flow

```
Greenhouse Sensors
      │
      ▼
AWS IoT Core → Kinesis → Lambda
                              │
                              ▼
                    Bedrock AgentCore ──── SageMaker (yield forecast)
                              │       └─── Braket (allocation optimization)
                              │       └─── S3 / MCP (knowledge base)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
               DynamoDB            IoT TwinMaker
               (state)             (digital twin)
                    │
                    ▼
            Managed Blockchain
            (audit log)
                    │
                    ▼
         Amplify + Cognito
         (crew dashboard)
```

---

## Why This Works

The calorie management system succeeds because it treats food security as a **control loop**, not a static plan:

1. Sensors feed real-time environmental data into the pipeline.
2. AI agents forecast yield and project calorie trajectories.
3. The pantry absorbs variance — good days build buffer, bad days draw it down.
4. Catch-up eating closes deficits without over-depleting storage.
5. Autonomous decisions adjust allocations before problems become crises.
6. Every action is logged, auditable, and explainable.

The crew doesn't manage the greenhouse. The greenhouse manages itself. The crew just has to survive long enough for the potatoes to grow.

---

*Mars Greenhouse Control System — Mission Sol 127 / 450*
