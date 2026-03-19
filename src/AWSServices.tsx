const services = [
  {
    category: 'AI & Agents',
    items: [
      { name: 'Amazon Bedrock AgentCore', desc: 'Multi-agent AI orchestration for autonomous crop planning and decision-making', status: 'active', badge: 'CORE' },
      { name: 'Amazon Bedrock (Nova)', desc: 'LLM powering the greenhouse AI agent chat and explainable AI recommendations', status: 'active', badge: 'ACTIVE' },
      { name: 'Amazon SageMaker', desc: 'Predictive yield forecasting models trained on Mars crop simulation data', status: 'mock', badge: 'MOCK' },
      { name: 'Amazon Braket', desc: 'Quantum optimization for multi-variable resource allocation across crop cycles', status: 'mock', badge: 'MOCK' },
    ]
  },
  {
    category: 'Data & IoT',
    items: [
      { name: 'AWS IoT Core', desc: 'Simulated sensor data streaming from greenhouse temperature, humidity, CO2 sensors', status: 'mock', badge: 'MOCK' },
      { name: 'Amazon Kinesis', desc: 'Real-time data streams for sensor telemetry and event-driven architecture', status: 'mock', badge: 'MOCK' },
      { name: 'AWS IoT TwinMaker', desc: 'Digital twin simulation of the Mars greenhouse environment and crop state', status: 'mock', badge: 'MOCK' },
      { name: 'AWS Ground Station', desc: 'Mars-Earth communication relay for remote greenhouse telemetry uplink', status: 'mock', badge: 'MOCK' },
    ]
  },
  {
    category: 'Storage & Analytics',
    items: [
      { name: 'Amazon DynamoDB', desc: 'Mission state, crop allocation, and sensor history persistence', status: 'active', badge: 'ACTIVE' },
      { name: 'Amazon S3', desc: 'Mars Crop Knowledge Base document storage and model artifacts', status: 'active', badge: 'ACTIVE' },
      { name: 'AWS HealthLake', desc: 'Astronaut biometric and nutritional health data for crew wellness tracking', status: 'mock', badge: 'MOCK' },
      { name: 'Amazon Managed Blockchain', desc: 'Immutable audit log of all autonomous agent decisions for mission accountability', status: 'mock', badge: 'MOCK' },
    ]
  },
  {
    category: 'Operations & Frontend',
    items: [
      { name: 'AWS Amplify Gen2', desc: 'React frontend hosting, authentication, and GraphQL API for the dashboard', status: 'active', badge: 'ACTIVE' },
      { name: 'Amazon Cognito', desc: 'Mission crew authentication and role-based access control', status: 'active', badge: 'ACTIVE' },
      { name: 'Amazon Lookout for Equipment', desc: 'Anomaly detection on greenhouse hardware sensors to predict equipment failure', status: 'mock', badge: 'MOCK' },
      { name: 'AWS Lambda', desc: 'Event-driven functions for autonomous responses to environmental threshold breaches', status: 'active', badge: 'ACTIVE' },
    ]
  },
]

const architecture = [
  { from: 'IoT Core / Kinesis', to: 'Lambda', label: 'Sensor Events' },
  { from: 'Lambda', to: 'Bedrock AgentCore', label: 'Trigger Agent' },
  { from: 'Bedrock AgentCore', to: 'SageMaker', label: 'Yield Forecast' },
  { from: 'Bedrock AgentCore', to: 'DynamoDB', label: 'Store Decision' },
  { from: 'Bedrock AgentCore', to: 'IoT TwinMaker', label: 'Update Twin' },
  { from: 'Amplify', to: 'Bedrock AgentCore', label: 'User Query' },
]

export default function AWSServices() {
  return (
    <div className="aws-view">
      <div className="aws-header-row">
        <div>
          <h2>AWS Architecture</h2>
          <p className="aws-sub">Services powering the Mars Greenhouse — active integrations and planned mocks shown</p>
        </div>
        <div className="aws-legend">
          <span className="badge-active">ACTIVE</span> Live integration
          <span className="badge-mock">MOCK</span> Planned / Demo
          <span className="badge-core">CORE</span> Central service
        </div>
      </div>

      {services.map(cat => (
        <div key={cat.category} className="aws-category">
          <h3 className="aws-cat-title">{cat.category}</h3>
          <div className="aws-grid">
            {cat.items.map(s => (
              <div key={s.name} className={`aws-card ${s.status}`}>
                <div className="aws-card-top">
                  <span className="aws-name">{s.name}</span>
                  <span className={`aws-badge badge-${s.status}`}>{s.badge}</span>
                </div>
                <p className="aws-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="aws-category">
        <h3 className="aws-cat-title">Event-Driven Architecture Flow</h3>
        <div className="arch-flow">
          {architecture.map((a, i) => (
            <div key={i} className="arch-step">
              <div className="arch-box">{a.from}</div>
              <div className="arch-arrow">
                <span className="arch-label">{a.label}</span>
                <span>&#8594;</span>
              </div>
              <div className="arch-box highlight">{a.to}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="aws-note">
        * MOCK services are architecturally integrated in the design but use simulated data for this demo.
        All ACTIVE services are live and functional in the current deployment.
      </div>
    </div>
  )
}
