import { useState, useEffect } from 'react'

interface Message {
  role: 'user' | 'agent'
  text: string
}

const SUGGESTIONS = [
  'What are the optimal conditions for lettuce?',
  'How much water does the crew need daily?',
  'Which crop gives the most calories per m²?',
  'What happens if temperature exceeds 25°C?',
]

const API = 'http://127.0.0.1:8000'

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: "👋 Hi! I'm your Mars Greenhouse AI. Ask me anything about crops, environment, or crew nutrition." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => setOnline(r.ok))
      .catch(() => setOnline(false))
  }, [])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'agent', text: data.response }])
    } catch {
      setMessages(m => [...m, { role: 'agent', text: '⚠️ Could not reach agent. Make sure it is running on port 8000.' }])
      setOnline(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="agent-chat">
      <div className="chat-header">
        🤖 Mars Greenhouse AI Agent
        <span className={`agent-status ${online === true ? 'online' : online === false ? 'offline' : 'checking'}`}>
          {online === true ? '● Online' : online === false ? '● Offline' : '● Checking...'}
        </span>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <span className="msg-label">{m.role === 'user' ? '👤' : '🔴'}</span>
            <span className="msg-text">{m.text}</span>
          </div>
        ))}
        {loading && (
          <div className="chat-msg agent">
            <span className="msg-label">🔴</span>
            <span className="msg-text typing">Thinking...</span>
          </div>
        )}
      </div>
      <div className="chat-suggestions">
        {SUGGESTIONS.map(s => (
          <button key={s} className="suggestion-btn" onClick={() => send(s)}>{s}</button>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Ask the Mars AI agent..."
        />
        <button className="chat-send" onClick={() => send(input)} disabled={loading}>Send</button>
      </div>
    </div>
  )
}
