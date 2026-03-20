# ACRES — Autonomous Caloric Reserve & Energy Sustenance System

ACRES is the top-level food security system for the Mars greenhouse mission. It coordinates six subsystems that together ensure four astronauts survive 450 sols without resupply. No single subsystem can do this alone — the power is in how they talk to each other.

---

## How the Subsystems Work Together

### The Loop

Every sol runs the same cycle:

```
GUARD detects → BLOOM grows → REAP plans → SILO stores → PULSE tracks → RELAY logs
```

It's a closed feedback loop. Each subsystem's output becomes another's input.

---

### GUARD — Greenhouse Unified Anomaly & Risk Detection

GUARD runs first. Before anything else happens on a given sol, GUARD checks the environment. Is there a dust storm? Is a pump showing abnormal vibration? Is CO2 drifting out of range?

When GUARD raises a flag, it cascades immediately:
- A dust storm triggers a 35% light penalty that BLOOM must account for in yield calculations
- An equipment anomaly gets flagged to REAP so allocation decisions factor in reduced capacity
- A sensor breach fires a Lambda that wakes the AI agent for autonomous response

GUARD is the early warning system. Everything downstream depends on it being accurate.

---

### BLOOM — Biological Lifecycle & Output Optimization Module

BLOOM manages the crops themselves. It tracks every plant cell — what crop it is, when it was planted, how far through its growth cycle it is, whether it failed germination.

On each sol, BLOOM checks which cells have completed their cycle and triggers a harvest. The yield calculation pulls in GUARD's storm penalty, the current yield modifier, and the greenhouse area scale. Failed cells get flagged and replanted at a reduced failure rate — BLOOM learns from each cycle.

BLOOM's output is raw harvested kcal and protein. That number flows directly into SILO.

---

### SILO — Storage & Inventory Level Observer

SILO is the pantry. Every kilocalorie BLOOM harvests lands in SILO first. SILO doesn't decide how much the crew eats — it just holds what's available and reports the balance.

SILO's current level is the single most important number in the mission. A full SILO means the crew can weather a dust storm or a crop failure. An empty SILO means the crew is running on deficit and every sol counts.

SILO feeds its current balance to PULSE every sol so consumption decisions can be made.

---

### PULSE — Predictive Usage & Life Sustenance Engine

PULSE is where the calorie math happens. It takes SILO's current balance, compares cumulative consumption against the mission calorie goal, and decides how much the crew eats today.

The logic is adaptive:

- If the crew is behind on their cumulative goal (deficit), PULSE authorizes catch-up eating — up to 1.5× the daily target
- As the deficit closes, the authorized amount naturally shrinks back to exactly 3,000 kcal/person/day
- If SILO is low, PULSE caps consumption at whatever is available — the crew eats what there is

PULSE is what prevents the mission from failing in the early sols when no crops have been harvested yet, and what ensures the crew recovers nutritionally once harvests begin. It also feeds forward to REAP — if PULSE projects a deficit 30 sols out, REAP gets a signal to adjust crop allocation now.

---

### REAP — Resource & Energy Allocation Planner

REAP is the strategic brain. It takes signals from PULSE (projected deficits), BLOOM (crop cycle timelines), and GUARD (environmental constraints) and decides how the greenhouse floor is allocated.

If PULSE projects a calorie shortfall, REAP shifts more area to potatoes — the highest kcal/m² crop. If protein levels are dropping, REAP expands the bean zone. If a dust storm has just ended and yields are recovering, REAP may hold allocations steady and let BLOOM catch up naturally.

REAP also manages the AI agent layer — when autonomous reallocation isn't enough, REAP surfaces recommendations to the crew via the dashboard, backed by SageMaker yield forecasts and Braket optimization runs.

---

### RELAY — Remote Earth-Link & Audit Log System

RELAY runs last in each sol cycle. Everything that happened — what GUARD detected, what BLOOM harvested, what SILO holds, what PULSE authorized, what REAP decided — gets written to the immutable audit log and uplinked to Earth.

Every agent decision carries a blockchain hash. Mission control on Earth can review the full decision trail for any sol. If something goes wrong, RELAY ensures there's a tamper-proof record of exactly what the system did and why.

RELAY also receives incoming updates from Earth — revised crop strategies, software patches, emergency protocols — and distributes them to the relevant subsystems.

---

## The Full Picture

```
                        ┌─────────┐
                        │  GUARD  │  anomaly & environment detection
                        └────┬────┘
                             │ storm penalty / alerts
                        ┌────▼────┐
                        │  BLOOM  │  crop growth & harvest
                        └────┬────┘
                             │ harvested kcal
                        ┌────▼────┐
                        │  SILO   │  food storage & pantry balance
                        └────┬────┘
                             │ available kcal
                        ┌────▼────┐
                        │  PULSE  │  caloric deficit tracking & consumption
                        └────┬────┘
                             │ deficit signal / projections
                        ┌────▼────┐
                        │  REAP   │  crop allocation & AI decisions
                        └────┬────┘
                             │ all decisions & state
                        ┌────▼────┐
                        │  RELAY  │  audit log & Earth uplink
                        └─────────┘
```

Each subsystem is narrow in scope but the chain is robust. GUARD can't feed the crew. SILO can't grow crops. PULSE can't detect storms. But together, under ACRES, they keep four humans alive on Mars for 450 sols — through hunger periods, dust storms, crop failures, and equipment faults — without a single resupply.

---

*ACRES — because survival on Mars isn't a single system problem.*
