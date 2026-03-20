# 🔴 Mars Greenhouse Control System

> Autonomous AI-powered agriculture management for the Red Planet

An intelligent greenhouse control system designed for a 450-day Mars surface mission, managing crop production for a crew of 4 astronauts. Built for the START Hack 2026 Syngenta Challenge.

## 🎯 The Challenge

NASA's late 2030s Mars missions require autonomous food production systems capable of sustaining crews during extended surface stays. This system demonstrates how AI agents can optimize Martian agriculture by balancing nutritional requirements, resource constraints, and extreme environmental conditions.

## ✨ Features

### 🤖 AI Greenhouse Agent
- Real-time crop recommendations powered by AWS Bedrock AgentCore
- Access to Mars Crop Knowledge Base via MCP server
- Intelligent allocation optimization based on area, environment, and crew needs
- Natural language interface for querying crop data and environmental conditions

### 📊 Live Dashboard
- Real-time sensor monitoring (temperature, humidity, CO2, PAR, pH, nutrients, O2, power)
- Autonomous decision logging with AWS service attribution
- Equipment health monitoring with anomaly detection

### 🌱 Digital Twin Simulation
- Multi-planet support (Mars, Moon, Titan, Earth baseline, custom environments)
- Dynamic crop growth modeling with 5 crop types:
  - **Lettuce**: Fast-growing micronutrient source (30-45 days)
  - **Potato**: Primary caloric backbone (70-120 days)
  - **Radish**: Quick buffer crop (21-30 days)
  - **Beans**: Protein powerhouse with nitrogen fixation (50-70 days)
  - **Herbs**: Crew morale enhancer (30 days)
- Real-time yield forecasting with SageMaker integration
- Environmental hazard simulation (dust storms, radiation, equipment failures)
- Water recycling efficiency tracking

### 🎮 Mission Simulation
- Fast-forward through 450-day mission scenarios
- Adjustable greenhouse area (2-600 m²)
- AI-recommended crop allocation based on area and environment
- Performance scoring: nutrition, protein, water efficiency


## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+ (for AI agent)
- AWS credentials (Workshop Studio)

### 1. Install Dependencies
```bash
npm install
cd agents && pip install -r requirements.txt
```

### 2. Configure MCP Server
The Mars Crop Knowledge Base is pre-configured in `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "mars-kb": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "env": {
        "MCP_ENDPOINT": "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp"
      }
    }
  }
}
```

### 3. Start the Agent
```bash
cd agents
python agent.py
```
Agent runs on `http://127.0.0.1:8000`

### 4. Start the Frontend
```bash
npm run dev
```
Dashboard available at `http://localhost:5173`

### 5. (Optional) Start Amplify Sandbox
```bash
npx ampx sandbox
```

## 🎮 Usage

### Control Center Dashboard
1. Monitor live greenhouse sensors with real-time updates
2. Chat with the AI agent to query crop data and get recommendations
3. Review autonomous decisions made by the AgentCore system
4. Inspect digital twin crop zones with detailed growth metrics
5. Track equipment health and mission status

### Mission Simulation
1. Select target environment (Mars, Moon, Titan, or custom)
2. Click "🤖 AI Recommend" to get optimal crop allocation for your area
3. Adjust greenhouse area (2-600 m²) and crop percentages
4. Choose start mode:
   - **New Mission (Sol 0)**: Start from scratch
   - **Join Current (Sol 127)**: Jump to current mission day
5. Run simulation and monitor performance scores
6. Iterate on allocation based on AI recommendations

## 📊 Scoring Metrics

- **Nutrient Score**: Caloric output vs. crew requirements (3000 kcal/day/person)
- **Protein Score**: Protein production vs. crew needs (90g/day/person)
- **Water Efficiency**: Recycling performance vs. target rates
- **Overall Mission Viability**: Weighted composite score

## 🌍 Multi-Planet Support

| Planet | Gravity | Solar Flux | Yield Mod | Water Recycle | Challenges |
|--------|---------|------------|-----------|---------------|------------|
| Mars | 0.38g | 43% | 85% | 88% | Dust storms, radiation |
| Moon | 0.17g | 100% | 80% | 92% | Extreme radiation, no atmosphere |
| Titan | 0.14g | 1% | 70% | 95% | Minimal sunlight, extreme cold |
| Earth | 1.00g | 100% | 100% | 80% | Baseline comparison |

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Python (Strands Agents SDK), AWS Amplify Gen 2
- **AI/ML**: AWS Bedrock AgentCore, Amazon SageMaker
- **Infrastructure**: Terraform, Kubernetes (EKS), Docker
- **Data**: DynamoDB, S3, AWS Managed Blockchain
- **Monitoring**: AWS Lookout for Equipment, CloudWatch

## 📁 Project Structure

```
mars-greenhouse-control/
├── src/                    # React frontend
│   ├── App.tsx            # Main dashboard
│   ├── AgentChat.tsx      # AI chat interface
│   └── MissionSim.tsx     # Simulation engine
├── agents/                 # Python AI agent
│   ├── agent.py           # Strands SDK agent
│   └── requirements.txt
├── amplify/               # AWS Amplify backend
│   ├── auth/              # Cognito setup
│   ├── data/              # GraphQL schema
│   └── backend.ts
├── terraform/             # Infrastructure as Code
│   └── main.tf            # EKS, VPC, networking
├── k8s/                   # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── .kiro/                 # AI assistant config
    └── settings/mcp.json  # MCP server config
```

## 🎯 Key Innovations

1. **AI-Driven Optimization**: Real-time crop allocation recommendations based on area, environment, and mission phase
2. **Multi-Planet Scalability**: Configurable environmental parameters for any celestial body
3. **Digital Twin Accuracy**: Science-based growth models with realistic failure rates and environmental stressors
4. **Autonomous Decision Making**: AgentCore system makes adjustments without human intervention
5. **Blockchain Audit Trail**: Immutable record of all agent actions for mission accountability
6. **Crew-Centric Design**: Balances nutrition, morale (herbs), and resource efficiency




## 🤝 Team

Built with ❤️ for START Hack 2026 Syngenta Challenge



---

**Mission Status**: ✅ Operational | **Sol**: 127/450 | **Crew Health**: 94/100 | **System**: Autonomous
