import { useState } from 'react';
import { DB, DEFAULT_EXERCISES, getExercises } from '../db';

export default function Exercises({ onSync }) {
  const [newName,   setNewName]   = useState('');
  const [fields,    setFields]    = useState({ weight: true, reps: true, time: false });
  const [, forceUpdate] = useState(0);

  const exercises = [...getExercises()].sort((a, b) => a.name.localeCompare(b.name));
  const allExercises = getExercises();

  function toggleField(f) {
    const next = { ...fields, [f]: !fields[f] };
    const anyOn = Object.values(next).some(Boolean);
    if (!anyOn) return;
    setFields(next);
  }

  function addExercise() {
    const name = newName.trim();
    if (!name) return alert('Enter an exercise name.');
    const activeFields = Object.entries(fields).filter(([, on]) => on).map(([f]) => f);
    if (!activeFields.length) return alert('Select at least one field.');
    const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const updated = [...getExercises(), { id, name, fields: activeFields }];
    DB.set('exercises', updated);
    setNewName('');
    onSync();
    forceUpdate(n => n + 1);
  }

  function deleteExercise(realIdx) {
    const ex = allExercises[realIdx];
    if (!confirm(`Remove "${ex.name}"?`)) return;
    const updated = allExercises.filter((_, i) => i !== realIdx);
    DB.set('exercises', updated);
    onSync();
    forceUpdate(n => n + 1);
  }

  function resetExercises() {
    if (!confirm('Reset to default exercise list? Your custom exercises will be removed.')) return;
    DB.set('exercises', DEFAULT_EXERCISES);
    onSync();
    forceUpdate(n => n + 1);
  }

  function fieldLabel(ex) {
    return [
      ex.fields.includes('weight') ? 'Weight' : '',
      ex.fields.includes('reps')   ? 'Reps'   : '',
      ex.fields.includes('time')   ? 'Time'   : '',
    ].filter(Boolean).join(' + ');
  }

  return (
    <>
      <div className="page-header">Exercises</div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Add New Exercise</div>
        <input
          type="text"
          className="input-field"
          placeholder="Exercise name (e.g., Tricep Pushdown)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addExercise()}
        />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Track fields (select at least one):
        </div>
        <div className="field-toggles">
          {['weight', 'reps', 'time'].map(f => (
            <button
              key={f}
              className={`field-toggle${fields[f] ? ' on' : ''}`}
              onClick={() => toggleField(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={addExercise}>+ Add Exercise</button>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          All Exercises <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({exercises.length})</span>
        </div>
        {exercises.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '12px 0' }}>No exercises yet.</div>
        ) : exercises.map(ex => {
          const realIdx = allExercises.findIndex(e => e.id === ex.id);
          return (
            <div key={ex.id} className="ex-row">
              <div>
                <div style={{ fontWeight: 600 }}>{ex.name}</div>
                <div className="ex-meta">{fieldLabel(ex)}</div>
              </div>
              <button className="del-btn" onClick={() => deleteExercise(realIdx)}>✕</button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <button className="btn btn-danger" onClick={resetExercises}>↺ Reset to Defaults</button>
      </div>
    </>
  );
}
