import { useState } from 'react';
import { DB } from '../db';
import { exportData, syncData } from '../api';
import { computeStats } from '../utils/statsUtils';
import WorkoutDetails from './WorkoutDetails';

const WORKOUT_TYPES = ['Upper','Lower','Push','Pull','Legs','Full Body','Cardio','Other'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getRelativeTime(dateStr) {
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d) / 86400000);
  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(diffDays / 365);
  return `Over ${years} year${years > 1 ? 's' : ''} ago`;
}

const WEIGHT_COMPARISONS = [
  { weight: 14_700_000, emoji: '🗼', label: 'Eiffel Tower' },
  { weight: 4_500_000,  emoji: '🚀', label: 'Space Shuttle' },
  { weight: 450_000,    emoji: '🗽', label: 'Statue of Liberty' },
  { weight: 300_000,    emoji: '🐳', label: 'blue whale' },
  { weight: 90_000,     emoji: '✈️',  label: 'Boeing 737' },
  { weight: 60_000,     emoji: '🐋', label: 'humpback whale' },
  { weight: 28_000,     emoji: '🚌', label: 'city bus' },
  { weight: 13_000,     emoji: '🐘', label: 'elephant' },
  { weight: 2_000,      emoji: '🚗', label: 'small car' },
  { weight: 400,        emoji: '🎹', label: 'grand piano' },
  { weight: 250,        emoji: '🐼', label: 'panda' },
  { weight: 65,         emoji: '🐕', label: 'golden retriever' },
  { weight: 25,         emoji: '🛞', label: 'car tire' },
  { weight: 16,         emoji: '🎳', label: 'bowling ball' },
  { weight: 8.34,       emoji: '💧', label: 'gallon of water' },
  { weight: 4.5,        emoji: '🧱', label: 'brick' },
  { weight: 0.8,        emoji: '🥤', label: 'can of soda' },
];

function getWeightComparison(lbs) {
  for (const { weight, emoji, label } of WEIGHT_COMPARISONS) {
    if (lbs >= weight) {
      return { count: Math.floor(lbs / weight), emoji, label };
    }
  }
  return null;
}

function StatCard({ label, value }) {
  return (
    <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Home({ username, userId, activeWorkout, onNav, onLogout, onStartWorkout }) {
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState('Upper');
  const [detailIdx,   setDetailIdx]   = useState(null); // index into reversed history
  const [, forceUpdate] = useState(0);

  const templates = DB.get('templates') || [];
  const sortedTemplates = templates
    .map((t, idx) => ({ ...t, _origIdx: idx }))
    .sort((a, b) => {
      if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  const history   = DB.get('workouts')  || [];
  const program   = DB.get('program')   || {};
  const stats     = computeStats(history);
  const reversedHistory = [...history].reverse();

  const todayKey = DAYS[new Date().getDay()];
  const todayTemplateIdx = program[todayKey] != null ? parseInt(program[todayKey]) : null;
  const todayTemplate = todayTemplateIdx != null ? templates[todayTemplateIdx] : null;

  function startWorkout() {
    const name = workoutName.trim() || 'My Workout';
    onStartWorkout({
      name, type: workoutType,
      date: new Date().toLocaleDateString(),
      startTime: Date.now(), pauseTime: 0,
      lastPauseStart: null, isPaused: false,
      exercises: [], notes: '',
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
      name: template.name, type: template.type,
      date: new Date().toLocaleDateString(),
      startTime: Date.now(), pauseTime: 0,
      lastPauseStart: null, isPaused: false,
      exercises: clonedExercises, notes: '',
    });
    onNav('workout');
  }

  function editTemplate(idx) {
    const template = DB.get('templates')[idx];
    onStartWorkout({ ...JSON.parse(JSON.stringify(template)), isTemplateEdit: true, templateIdx: idx });
    onNav('workout');
  }

  function duplicateTemplate(idx) {
    const copy = JSON.parse(JSON.stringify(templates[idx]));
    copy.name = copy.name + ' (copy)';
    const updated = [...templates, copy];
    DB.set('templates', updated);
    forceUpdate(n => n + 1);
  }

  function deleteTemplate(idx) {
    if (!confirm('Permanently delete this template?')) return;
    const updated = [...templates];
    updated.splice(idx, 1);
    DB.set('templates', updated);
    forceUpdate(n => n + 1);
  }

  function toggleFavorite(origIdx) {
    const updated = [...templates];
    updated[origIdx] = { ...updated[origIdx], favorite: !updated[origIdx].favorite };
    DB.set('templates', updated);
    syncData(userId, null);
    forceUpdate(n => n + 1);
  }

  function setProgramDay(day, val) {
    const updated = { ...program, [day]: val === '' ? null : parseInt(val) };
    DB.set('program', updated);
    forceUpdate(n => n + 1);
  }

  // Called from WorkoutDetails when user repeats or saves as template
  function repeatWorkout(w) {
    const clonedExercises = JSON.parse(JSON.stringify(w.exercises)).map(ex => {
      ex.sets.forEach(s => { s.completed = false; });
      return ex;
    });
    onStartWorkout({
      name: w.name, type: w.type,
      date: new Date().toLocaleDateString(),
      startTime: Date.now(), pauseTime: 0,
      lastPauseStart: null, isPaused: false,
      exercises: clonedExercises, notes: '',
    });
    onNav('workout');
  }

  function saveHistoryAsTemplate(w) {
    const templates = DB.get('templates') || [];
    templates.push({ name: w.name, type: w.type, exercises: JSON.parse(JSON.stringify(w.exercises)), date: new Date().toLocaleDateString(), favorite: false });
    DB.set('templates', templates);
    alert(`"${w.name}" saved as template.`);
    forceUpdate(n => n + 1);
  }

  function deleteHistoryWorkout(originalIdx) {
    if (!confirm('Delete this workout from history?')) return;
    const workouts = DB.get('workouts') || [];
    workouts.splice(originalIdx, 1);
    DB.set('workouts', workouts);
    setDetailIdx(null);
    forceUpdate(n => n + 1);
  }

  return (
    <>
      {detailIdx != null && reversedHistory[detailIdx] && (
        <WorkoutDetails
          workout={reversedHistory[detailIdx]}
          workoutIdx={history.length - 1 - detailIdx}
          onClose={() => setDetailIdx(null)}
          onRepeat={repeatWorkout}
          onSaveTemplate={saveHistoryAsTemplate}
          onDelete={deleteHistoryWorkout}
        />
      )}

      <div className="page-header flex-between">
        <span>Iron Log</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => exportData(userId, username)}>
            ⬇ Export
          </button>
          <button className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={onLogout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Dashboard stats */}
      {history.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <StatCard label="Streak" value={stats.streak > 0 ? `${stats.streak}d` : '—'} />
            <StatCard label="This Week" value={stats.weekCount} />
            <StatCard label="Week Mins" value={stats.weekMins} />
          </div>
          {stats.weekVolume > 0 && (() => {
            const comp = getWeightComparison(stats.weekVolume);
            return (
              <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--text)' }}>
                {stats.weekVolume.toLocaleString()} lbs lifted this week
                {comp && ` = more than ${comp.count} ${comp.label}${comp.count !== 1 ? 's' : ''} ${comp.emoji}`}
              </div>
            );
          })()}
        </div>
      )}

      {/* Today's suggestion */}
      {todayTemplate && !activeWorkout && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex-between">
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>TODAY'S PROGRAM</div>
              <strong>{todayTemplate.name}</strong>{' '}
              <span className="badge type-badge">{todayTemplate.type}</span>
            </div>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => startFromTemplate(todayTemplateIdx)}>
              Start
            </button>
          </div>
        </div>
      )}

      {/* Resume active workout */}
      {activeWorkout && !activeWorkout.isTemplateEdit && (
        <div className="card resume-pulse" style={{ borderColor: 'var(--accent)', cursor: 'pointer' }} onClick={() => onNav('workout')}>
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

      {/* Start new workout */}
      <div className="card">
        <input type="text" className="input-field" placeholder="Workout Name (e.g., Morning Push)"
          value={workoutName} onChange={e => setWorkoutName(e.target.value)} />
        <select className="input-field" value={workoutType} onChange={e => setWorkoutType(e.target.value)}>
          {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary" onClick={startWorkout}>+ Start Empty Workout</button>
      </div>

      {/* Templates */}
      {sortedTemplates.length > 0 && (
        <>
          <div className="page-header" style={{ border: 'none', fontSize: 18, paddingBottom: 0 }}>Templates</div>
          {sortedTemplates.map(t => (
            <div key={t._origIdx} className="card" style={t.favorite ? { borderColor: 'var(--accent)' } : {}}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <div>
                  <strong>{t.name}</strong>{' '}
                  <span className="badge type-badge">{t.type}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {t.exercises.length} Exercises {t.date ? `· ${t.date}` : ''}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => startFromTemplate(t._origIdx)}>
                  Start
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                <button className="btn" style={{ flex: 1, padding: 6, fontSize: 12 }} onClick={() => editTemplate(t._origIdx)}>✎ Edit</button>
                <button className="btn" style={{ flex: 1, padding: 6, fontSize: 12 }} onClick={() => duplicateTemplate(t._origIdx)}>⧉ Copy</button>
                <button className="btn" style={{ flex: 1, padding: 6, fontSize: 12, color: t.favorite ? 'var(--accent)' : 'var(--text-muted)' }} onClick={() => toggleFavorite(t._origIdx)}>
                  {t.favorite ? '★' : '☆'} Favorite
                </button>
                <button className="btn btn-danger" style={{ flex: 1, padding: 6, fontSize: 12 }} onClick={() => deleteTemplate(t._origIdx)}>✕ Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Weekly Program */}
      {templates.length > 0 && (
        <>
          <div className="page-header" style={{ border: 'none', fontSize: 18, paddingBottom: 0 }}>Weekly Program</div>
          <div className="card">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Assign templates to days. Today's assignment shows as a quick-start card.
            </div>
            {DAY_LABELS.map((label, i) => (
              <div key={label} className="flex-between" style={{ marginBottom: 8 }}>
                <span style={{ width: 36, fontWeight: 600, fontSize: 13, color: DAYS[i] === todayKey ? 'var(--accent)' : 'var(--text)' }}>{label}</span>
                <select
                  className="input-field"
                  style={{ margin: 0, fontSize: 13, padding: '6px 8px', flex: 1, marginLeft: 8 }}
                  value={program[DAYS[i]] != null ? program[DAYS[i]] : ''}
                  onChange={e => setProgramDay(DAYS[i], e.target.value)}
                >
                  <option value="">— Rest —</option>
                  {templates.map((t, idx) => <option key={idx} value={idx}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent History */}
      <div className="page-header" style={{ border: 'none', fontSize: 18, paddingBottom: 0 }}>Recent History</div>
      {reversedHistory.slice(0, 15).map((w, idx) => (
        <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => setDetailIdx(idx)}>
          <div className="flex-between">
            <strong>{w.name} <span className="badge type-badge">{w.type}</span></strong>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.date}</div>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 'bold' }}>{getRelativeTime(w.date)}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            ⏱ {Math.round((w.duration || 0) / 60)} mins · 🏋️ {w.exercises.length} exercises
          </div>
        </div>
      ))}
      {history.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No completed workouts yet.</div>
      )}
    </>
  );
}
