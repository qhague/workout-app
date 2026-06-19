import { useState } from 'react';
import { DB, DEFAULT_EXERCISES, getExercises } from '../db';
import { getSettings, saveSettings } from '../utils/settings';
import ExerciseChart from './ExerciseChart';

const MUSCLE_GROUPS = ['', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Cardio', 'Other'];

export default function Exercises({ onSync }) {
  const [newName,    setNewName]    = useState('');
  const [newGroup,   setNewGroup]   = useState('');
  const [fields,     setFields]     = useState({ weight: true, reps: true, time: false });
  const [filterGroup, setFilterGroup] = useState('');
  const [chartEx,    setChartEx]    = useState(null);
  const [settings,   setSettingsState] = useState(() => getSettings());
  const [, forceUpdate] = useState(0);

  const allExercises = getExercises();
  const exercises = [...allExercises]
    .filter(ex => !filterGroup || (ex.muscleGroup || '') === filterGroup)
    .sort((a, b) => a.name.localeCompare(b.name));

  function toggleField(f) {
    const next = { ...fields, [f]: !fields[f] };
    if (!Object.values(next).some(Boolean)) return;
    setFields(next);
  }

  function addExercise() {
    const name = newName.trim();
    if (!name) return alert('Enter an exercise name.');
    const activeFields = Object.entries(fields).filter(([, on]) => on).map(([f]) => f);
    if (!activeFields.length) return alert('Select at least one field.');
    const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    DB.set('exercises', [...getExercises(), { id, name, fields: activeFields, muscleGroup: newGroup }]);
    setNewName('');
    onSync();
    forceUpdate(n => n + 1);
  }

  function deleteExercise(id) {
    const ex = allExercises.find(e => e.id === id);
    if (!confirm(`Remove "${ex?.name}"?`)) return;
    DB.set('exercises', allExercises.filter(e => e.id !== id));
    onSync();
    forceUpdate(n => n + 1);
  }

  function resetExercises() {
    if (!confirm('Reset to default exercise list? Your custom exercises will be removed.')) return;
    DB.set('exercises', DEFAULT_EXERCISES);
    onSync();
    forceUpdate(n => n + 1);
  }

  function updateSetting(key, val) {
    const next = { ...settings, [key]: val };
    setSettingsState(next);
    saveSettings(next);
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
      {chartEx && <ExerciseChart exercise={chartEx} onClose={() => setChartEx(null)} />}

      <div className="page-header">Exercises</div>

      {/* Settings */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Settings</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>Weight unit</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['lbs', 'kg'].map(u => (
              <button
                key={u}
                className={`field-toggle${settings.unit === u ? ' on' : ''}`}
                style={{ flex: 'none', padding: '6px 16px' }}
                onClick={() => updateSetting('unit', u)}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>Rest timer (seconds)</span>
          <input
            type="number"
            className="input-field"
            style={{ width: 80, margin: 0, padding: '6px 8px', textAlign: 'center' }}
            value={settings.restSeconds}
            onChange={e => updateSetting('restSeconds', parseInt(e.target.value) || 90)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14 }}>Show RPE column</span>
          <button
            className={`field-toggle${settings.showRPE ? ' on' : ''}`}
            style={{ flex: 'none', padding: '6px 16px' }}
            onClick={() => updateSetting('showRPE', !settings.showRPE)}
          >
            {settings.showRPE ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Add new exercise */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Add New Exercise</div>
        <input
          type="text" className="input-field"
          placeholder="Exercise name (e.g., Tricep Pushdown)"
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addExercise()}
        />
        <select className="input-field" value={newGroup} onChange={e => setNewGroup(e.target.value)}>
          <option value="">— Muscle group (optional) —</option>
          {MUSCLE_GROUPS.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Track fields:</div>
        <div className="field-toggles">
          {['weight', 'reps', 'time'].map(f => (
            <button key={f} className={`field-toggle${fields[f] ? ' on' : ''}`} onClick={() => toggleField(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={addExercise}>+ Add Exercise</button>
      </div>

      {/* Exercise library */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>
            All Exercises <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({exercises.length})</span>
          </div>
          <select
            className="input-field"
            style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: 12 }}
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
          >
            <option value="">All groups</option>
            {MUSCLE_GROUPS.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {exercises.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '12px 0' }}>No exercises match.</div>
        ) : exercises.map(ex => (
          <div key={ex.id} className="ex-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{ex.name}</div>
              <div className="ex-meta">
                {fieldLabel(ex)}
                {ex.muscleGroup && <span className="badge" style={{ marginLeft: 6, background: '#1a1a1a' }}>{ex.muscleGroup}</span>}
              </div>
            </div>
            <button
              className="btn"
              style={{ width: 'auto', padding: '4px 10px', fontSize: 12, marginRight: 6 }}
              onClick={() => setChartEx(ex)}
            >
              📈
            </button>
            <button className="del-btn" onClick={() => deleteExercise(ex.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="card">
        <button className="btn btn-danger" onClick={resetExercises}>↺ Reset to Defaults</button>
      </div>
    </>
  );
}
