import { useState, useEffect } from 'react';
import { client } from '../lib/client';
import type { Schema } from '../../amplify/data/resource';
import './CropsPanel.css';

type Crop = Schema['Crop']['type'];
type CropStatus = 'PLANNED' | 'GROWING' | 'HARVESTED' | 'FAILED';

const statusColor: Record<CropStatus, string> = {
  GROWING: 'status-ok',
  PLANNED: 'status-info',
  HARVESTED: 'status-warn',
  FAILED: 'status-crit',
};

const cropEmoji: Record<string, string> = {
  LETTUCE: '🥬', POTATO: '🥔', RADISH: '🌰', BEAN: '🫘', PEA: '🟢', HERB: '🌿',
};

const EMPTY_FORM = { name: '', type: 'LETTUCE' as const, zone: 'A', plantedDay: 1, harvestDay: 30 };

export default function CropsPanel() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filter, setFilter] = useState<CropStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const sub = client.models.Crop.observeQuery().subscribe({
      next: ({ items }) => { setCrops(items); setLoading(false); },
      error: () => setLoading(false),
    });
    return () => sub.unsubscribe();
  }, []);

  async function addCrop() {
    if (!form.name.trim()) return;
    await client.models.Crop.create({ ...form, status: 'PLANNED' });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function updateStatus(id: string, status: CropStatus) {
    await client.models.Crop.update({ id, status });
  }

  async function deleteCrop(id: string) {
    await client.models.Crop.delete({ id });
  }

  const filtered = filter === 'ALL' ? crops : crops.filter(c => c.status === filter);

  return (
    <div className="crops-panel">
      <div className="crops-header">
        <h2 className="section-title">Crop Management</h2>
        <div className="crops-header-right">
          <div className="filter-btns">
            {(['ALL', 'GROWING', 'PLANNED', 'HARVESTED', 'FAILED'] as const).map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <button className="add-btn" onClick={() => setShowForm(v => !v)}>+ Add Crop</button>
        </div>
      </div>

      {showForm && (
        <div className="card add-form">
          <div className="form-row">
            <input className="form-input" placeholder="Crop name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}>
              {['LETTUCE','POTATO','RADISH','BEAN','PEA','HERB'].map(t => <option key={t}>{t}</option>)}
            </select>
            <input className="form-input" placeholder="Zone" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
            <input className="form-input" type="number" placeholder="Planted day" value={form.plantedDay} onChange={e => setForm(f => ({ ...f, plantedDay: +e.target.value }))} />
            <input className="form-input" type="number" placeholder="Harvest day" value={form.harvestDay} onChange={e => setForm(f => ({ ...f, harvestDay: +e.target.value }))} />
            <button className="action-btn" onClick={addCrop}>Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading crops...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No crops yet. Add your first crop above.</div>
      ) : (
        <div className="crops-grid">
          {filtered.map(crop => (
            <div className="card crop-card" key={crop.id}>
              <div className="crop-card-header">
                <span className="crop-emoji">{cropEmoji[crop.type ?? 'HERB']}</span>
                <div>
                  <div className="crop-name">{crop.name}</div>
                  <div className="crop-zone">Zone {crop.zone}</div>
                </div>
                <span className={`status-badge ${statusColor[crop.status as CropStatus ?? 'PLANNED']}`}>
                  {crop.status}
                </span>
              </div>
              <div className="crop-days">Day {crop.plantedDay} → {crop.harvestDay}</div>
              <div className="crop-actions">
                {crop.status === 'PLANNED' && <button className="action-btn" onClick={() => updateStatus(crop.id, 'GROWING')}>Start Growing</button>}
                {crop.status === 'GROWING' && <button className="action-btn" onClick={() => updateStatus(crop.id, 'HARVESTED')}>Harvest</button>}
                <button className="delete-btn" onClick={() => deleteCrop(crop.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
