import { useState, useEffect } from 'react';
import { client } from '../lib/client';
import type { Schema } from '../../amplify/data/resource';
import './AgentPanel.css';

type Rec = Schema['AgentRecommendation']['type'];

const severityClass: Record<string, string> = {
  INFO: 'status-info', WARNING: 'status-warn', CRITICAL: 'status-crit',
};
const typeIcon: Record<string, string> = {
  WATERING: '💧', HARVEST: '🌾', CROP_SELECTION: '🌱', NUTRIENT: '🧪', ALERT: '⚠️',
};

export default function AgentPanel() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: "Hello! I'm your Mars Greenhouse AI agent. I monitor your crops, analyze environmental data, and provide recommendations to maximize yield for your 450-day mission. How can I help?" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = client.models.AgentRecommendation.observeQuery().subscribe({
      next: ({ items }) => setRecs(items.sort((a, b) => b.missionDay - a.missionDay)),
    });
    return () => sub.unsubscribe();
  }, []);

  async function markDone(id: string) {
    await client.models.AgentRecommendation.update({ id, actionTaken: true });
  }

  async function sendQuery() {
    if (!query.trim()) return;
    const userMsg = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // TODO: replace with real Strands agent API call
    await new Promise(r => setTimeout(r, 1200));
    setChatHistory(prev => [...prev, {
      role: 'agent',
      text: `[AI Agent] Analyzing "${userMsg}"... Connect the Strands agent backend (agents/ directory) to get real-time recommendations from the Mars Crop Knowledge Base.`,
    }]);
    setLoading(false);
  }

  return (
    <div className="agent-panel">
      <div className="agent-left">
        <h2 className="section-title">AI Recommendations</h2>
        {recs.length === 0 ? (
          <div className="empty">No recommendations yet. The AI agent will populate these as it monitors the greenhouse.</div>
        ) : (
          <div className="recs-list">
            {recs.map(rec => (
              <div className={`card rec-card ${rec.actionTaken ? 'done' : ''}`} key={rec.id}>
                <div className="rec-header">
                  <span className="rec-icon">{typeIcon[rec.type ?? 'ALERT']}</span>
                  <div className="rec-title-wrap">
                    <span className="rec-title">{rec.title}</span>
                    <span className="rec-day">Day {rec.missionDay}</span>
                  </div>
                  <span className={`status-badge ${severityClass[rec.severity ?? 'INFO']}`}>{rec.severity}</span>
                </div>
                <p className="rec-message">{rec.message}</p>
                {!rec.actionTaken
                  ? <button className="action-btn" onClick={() => markDone(rec.id)}>✓ Mark as Done</button>
                  : <span className="done-label">✓ Action taken</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="agent-right">
        <h2 className="section-title">Ask the Agent</h2>
        <div className="chat-window">
          <div className="chat-messages">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <span className="chat-avatar">{msg.role === 'agent' ? '🤖' : '👨‍🚀'}</span>
                <div className="chat-bubble">{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg agent">
                <span className="chat-avatar">🤖</span>
                <div className="chat-bubble typing">Thinking<span className="dots">...</span></div>
              </div>
            )}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendQuery()}
              placeholder="Ask about crops, nutrients, mission planning..."
            />
            <button className="send-btn" onClick={sendQuery} disabled={loading}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
