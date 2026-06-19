import { useState } from 'react';
import { getExercises } from '../db';

export default function ExerciseModal({ selectedIds, onToggle, onClose }) {
  const [query, setQuery] = useState('');

  const allExercises = getExercises();
  const filtered = allExercises
    .filter(ex => ex.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  function fieldLabel(ex) {
    return [
      ex.fields.includes('weight') ? 'Weight' : '',
      ex.fields.includes('reps')   ? 'Reps'   : '',
      ex.fields.includes('time')   ? 'Time'   : '',
    ].filter(Boolean).join(' + ');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>Add Exercise</h2>
          <button className="btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onClose}>Done</button>
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="Search exercises..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className="search-list">
          {filtered.map(ex => {
            const selected = selectedIds.includes(ex.id);
            return (
              <div
                key={ex.id}
                className="search-item"
                style={selected ? { backgroundColor: 'rgba(200,255,0,0.1)', borderColor: 'var(--accent)' } : {}}
                onClick={() => onToggle(ex)}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fieldLabel(ex)}</div>
                </div>
                <span style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 'bold' }}>
                  {selected ? '✓' : '+'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
