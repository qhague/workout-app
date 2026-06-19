import { useState } from 'react';
import { DB } from '../db';
import { exportData } from '../api';
import WorkoutDetails from './WorkoutDetails';

const WORKOUT_TYPES = ['Upper', 'Lower', 'Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Other'];

function getRelativeTime(dateStr) {
  const workoutDate = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - workoutDate) / 86400000);
  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(diffDays / 365);
  return `Over ${years} year${years > 1 ? 's' : ''} ago`;
}

export default function Home({ username, userId, activeWorkout, onNav, onLogout, onStartWorkout }) {
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState('Upper');
  const [detailWorkout, setDetailWorkout] = useState(null);
  const [, forceUpdate] = useState(0);

  const templates = DB.get('templates') || [];
  const history   = DB.get('workouts')  || [];

  function startWorkout() {
    const name = workoutName.trim() || 'My Workout';
    onStartWorkout({
      name, type: workoutType,
      date: new Date().toLocaleDateString(),
      startTime: Date.now(),
      pauseTime: 0,
      lastPauseStart: null,
      isPaused: false,
      exercises: [],
    });
    onNav('workout');
  }

  function startFromTemplate(idx) {
    const template = templates[idx];
    const clonedExercises = JSON.parse(JSON.stringify(template.exercises)).map(ex => {
      ex.sets.forEach(s => { s.completed = false; });
      return ex;
    });
    onStartWorkout({
      name: template.name,
      type: template.type,
      date: new Date().toLocaleDateString(),
      startTime: Date.now(),
      pauseTime: 0,
      lastPauseStart: null,
      isPaused: false,
      exercises: clonedExercises,
    });
    onNav('workout');
  }

  function editTemplate(idx) {
    const template = DB.get('templates')[idx];
    onStartWorkout({
      ...JSON.parse(JSON.stringify(template)),
      isTemplateEdit: true,
      templateIdx: idx,
    });
    onNav('workout');
  }

  function deleteTemplate(idx) {
    if (!confirm('Permanently delete this template?')) return;
    const templates = DB.get('templates') || [];
    templates.splice(idx, 1);
    DB.set('templates', templates);
    forceUpdate(n => n + 1);
  }

  async function handleExport() {
    await exportData(userId, username);
  }

  return (
    <>
      {detailWorkout && (
        <WorkoutDetails workout={detailWorkout} onClose={() => setDetailWorkout(null)} />
      )}

      <div className="page-header flex-between">
        <span>Iron Log</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={handleExport}>
            ⬇ Export
          </button>
          <button className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={onLogout}>
            Log Out
          </button>
        </div>
      </div>

      {activeWorkout && !activeWorkout.isTemplateEdit && (
        <div className="card" style={{ borderColor: 'var(--accent)', cursor: 'pointer' }} onClick={() => onNav('workout')}>
          <div className="flex-between">
            <div>
              <strong>Resume: {activeWorkout.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {activeWorkout.isPaused ? 'Paused' : 'In Progress'} · {activeWorkout.type}
              </div>
            </div>
            <span style={{ color: 'var(--accent)', fontSize: 20 }}>▶</span>
          </div>
        </div>
      )}

      <div className="card">
        <input
          type="text"
          className="input-field"
          placeholder="Workout Name (e.g., Morning Push)"
          value={workoutName}
          onChange={e => setWorkoutName(e.target.value)}
        />
        <select className="input-field" value={workoutType} onChange={e => setWorkoutType(e.target.value)}>
          {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary" onClick={startWorkout}>+ Start Empty Workout</button>
      </div>

      {templates.length > 0 && (
        <>
          <div className="page-header" style={{ border: 'none', fontSize: 18, paddingBottom: 0 }}>Templates</div>
          {templates.map((t, idx) => (
            <div key={idx} className="card">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <div>
                  <strong>{t.name}</strong>{' '}
                  <span className="badge type-badge">{t.type}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {t.exercises.length} Exercises {t.date ? `· ${t.date}` : ''}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => startFromTemplate(idx)}>
                  Start
                </button>
              </div>
              <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                <button className="btn" style={{ width: '48%', padding: 6, fontSize: 12 }} onClick={() => editTemplate(idx)}>✎ Edit</button>
                <button className="btn btn-danger" style={{ width: '48%', padding: 6, fontSize: 12 }} onClick={() => deleteTemplate(idx)}>✕ Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="page-header" style={{ border: 'none', fontSize: 18, paddingBottom: 0 }}>Recent History</div>
      {[...history].reverse().slice(0, 10).map((w, idx) => (
        <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => setDetailWorkout(w)}>
          <div className="flex-between">
            <strong>{w.name} <span className="badge type-badge">{w.type}</span></strong>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.date}</div>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 'bold' }}>{getRelativeTime(w.date)}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            ⏱ {Math.round(w.duration / 60)} mins · 🏋️ {w.exercises.length} exercises
          </div>
        </div>
      ))}

      {history.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No completed workouts yet.
        </div>
      )}
    </>
  );
}
