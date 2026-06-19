import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DB } from '../db';
import { syncData } from '../api';
import ExerciseModal from './ExerciseModal';

const WORKOUT_TYPES = ['Upper', 'Lower', 'Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Other'];

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getLastSession(history, exId) {
  for (let i = history.length - 1; i >= 0; i--) {
    const found = history[i].exercises?.find(e => e.id === exId);
    if (found?.sets?.length > 0) return { date: history[i].date, sets: found.sets };
  }
  return null;
}

// ── Sortable exercise card ────────────────────────────────────────────────────
function ExerciseCard({ ex, exIdx, isEdit, lastSession, onUpdate, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id + '_' + exIdx });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasWeight = ex.fields.includes('weight');
  const hasReps   = ex.fields.includes('reps');
  const hasTime   = ex.fields.includes('time');

  function updateSet(setIdx, field, val) {
    const sets = [...ex.sets];
    sets[setIdx] = { ...sets[setIdx], [field]: val };
    onUpdate(exIdx, { ...ex, sets });
  }

  function toggleSet(setIdx) {
    const sets = [...ex.sets];
    sets[setIdx] = { ...sets[setIdx], completed: !sets[setIdx].completed };
    onUpdate(exIdx, { ...ex, sets });
  }

  function addSet() {
    const sets = [...ex.sets, { weight: '', reps: '', time: '', completed: false }];
    onUpdate(exIdx, { ...ex, sets });
  }

  function removeSet(setIdx) {
    if (ex.sets.length === 1) { onRemove(exIdx); return; }
    const sets = ex.sets.filter((_, i) => i !== setIdx);
    onUpdate(exIdx, { ...ex, sets });
  }

  function handleEnter(e, setIdx, fieldType) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = document.querySelectorAll('.set-input');
    const arr = Array.from(inputs);
    const i = arr.indexOf(e.target);
    if (i > -1 && i < arr.length - 1) arr[i + 1].focus();
    else e.target.blur();
  }

  return (
    <div ref={setNodeRef} style={style} className={`card exercise-card${isDragging ? ' dragging' : ''}`}>
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
          <strong style={{ fontSize: 18 }}>{ex.name}</strong>
        </div>
        <button
          className="btn"
          style={{ width: 'auto', padding: '6px 10px', fontSize: 12, flexShrink: 0 }}
          onClick={() => onRemove(exIdx)}
        >
          ✕
        </button>
      </div>

      {lastSession && !isEdit && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
            Last session <span style={{ color: 'var(--accent)' }}>{lastSession.date}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {lastSession.sets.map((s, i) => {
              const parts = [];
              if (hasWeight && s.weight) parts.push(`${s.weight}lb`);
              if (hasReps   && s.reps)   parts.push(`${s.reps}r`);
              if (hasTime   && s.time)   parts.push(`${s.time}s`);
              return (
                <span key={i} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 5, padding: '3px 7px', fontSize: 11, color: 'var(--text-muted)'
                }}>
                  {parts.join(' · ')}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Set</th>
            {hasWeight && <th>Weight</th>}
            {hasReps   && <th>Reps</th>}
            {hasTime   && <th>Time</th>}
            <th style={{ width: '20%' }}>Done</th>
          </tr>
        </thead>
        <tbody>
          {ex.sets.map((set, setIdx) => (
            <tr key={setIdx}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <span
                  style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', marginRight: 6 }}
                  onClick={() => removeSet(setIdx)}
                >✕</span>
                {setIdx + 1}
              </td>
              {hasWeight && (
                <td>
                  <input
                    type="number" inputMode="decimal" enterKeyHint="next"
                    className="set-input"
                    value={set.weight}
                    onChange={e => updateSet(setIdx, 'weight', e.target.value)}
                    onKeyDown={e => handleEnter(e, setIdx, 'weight')}
                    placeholder="lbs"
                  />
                </td>
              )}
              {hasReps && (
                <td>
                  <input
                    type="number" inputMode="numeric" enterKeyHint="next"
                    className="set-input"
                    value={set.reps}
                    onChange={e => updateSet(setIdx, 'reps', e.target.value)}
                    onKeyDown={e => handleEnter(e, setIdx, 'reps')}
                    placeholder="reps"
                  />
                </td>
              )}
              {hasTime && (
                <td>
                  <input
                    type="number" inputMode="numeric" enterKeyHint="next"
                    className="set-input"
                    value={set.time}
                    onChange={e => updateSet(setIdx, 'time', e.target.value)}
                    onKeyDown={e => handleEnter(e, setIdx, 'time')}
                    placeholder="sec"
                  />
                </td>
              )}
              <td>
                <button className={`check-btn${set.completed ? ' done' : ''}`} onClick={() => toggleSet(setIdx)}>✔</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn" style={{ fontSize: 13, padding: 10 }} onClick={addSet}>+ Set</button>
      </div>
    </div>
  );
}

// ── Main Workout component ────────────────────────────────────────────────────
export default function Workout({ activeWorkout, onSave, onNav, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

  const w = activeWorkout;
  const history = DB.get('workouts') || [];
  const isEdit = w?.isTemplateEdit;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  useEffect(() => {
    if (!w || isEdit) return;
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [w?.startTime, isEdit]);

  if (!w) {
    return (
      <div className="card" style={{ textAlign: 'center', marginTop: 20 }}>
        No active workout.<br /><br />
        <button className="btn btn-primary" onClick={() => onNav('home')}>Go Home</button>
      </div>
    );
  }

  const elapsedSec = (() => {
    let ms = Date.now() - w.startTime - w.pauseTime;
    if (w.isPaused) ms -= (Date.now() - w.lastPauseStart);
    return Math.max(0, Math.floor(ms / 1000));
  })();

  function updateExercise(exIdx, updated) {
    const exercises = [...w.exercises];
    exercises[exIdx] = updated;
    onSave({ ...w, exercises });
  }

  function removeExercise(exIdx) {
    if (!confirm('Remove this entire exercise?')) return;
    const exercises = w.exercises.filter((_, i) => i !== exIdx);
    onSave({ ...w, exercises });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = w.exercises.findIndex((_, i) => w.exercises[i].id + '_' + i === active.id);
    const newIdx = w.exercises.findIndex((_, i) => w.exercises[i].id + '_' + i === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const exercises = arrayMove([...w.exercises], oldIdx, newIdx);
    onSave({ ...w, exercises });
  }

  function addExercise(exDef) {
    const existing = w.exercises.findIndex(e => e.id === exDef.id);
    if (existing >= 0) {
      const ex = w.exercises[existing];
      const hasData = ex.sets.some(s => s.weight || s.reps || s.time || s.completed);
      if (hasData && !confirm(`Already added ${exDef.name} with data. Remove it anyway?`)) return;
      const exercises = w.exercises.filter((_, i) => i !== existing);
      onSave({ ...w, exercises });
    } else {
      const exercises = [...w.exercises, {
        id: exDef.id, name: exDef.name, fields: exDef.fields,
        sets: [{ weight: '', reps: '', time: '', completed: false }],
      }];
      onSave({ ...w, exercises });
    }
  }

  function togglePause() {
    if (w.isPaused) {
      onSave({ ...w, isPaused: false, pauseTime: w.pauseTime + (Date.now() - w.lastPauseStart) });
    } else {
      onSave({ ...w, isPaused: true, lastPauseStart: Date.now() });
    }
  }

  function finishWorkout() {
    const saveTemplate = confirm('Save this workout as a template for future use?');
    let finalMs = Date.now() - w.startTime - w.pauseTime;
    if (w.isPaused) finalMs -= (Date.now() - w.lastPauseStart);
    const finished = { ...w, duration: Math.floor(finalMs / 1000) };

    if (saveTemplate) {
      const templates = DB.get('templates') || [];
      templates.push({ name: w.name, type: w.type, exercises: JSON.parse(JSON.stringify(w.exercises)), date: new Date().toLocaleDateString() });
      DB.set('templates', templates);
    }
    const workouts = DB.get('workouts') || [];
    workouts.push(finished);
    DB.set('workouts', workouts);
    onSave(null);
    clearInterval(timerRef.current);
    syncData(userId, null);
    onNav('home');
  }

  function saveEditedTemplate() {
    const templates = DB.get('templates') || [];
    templates[w.templateIdx] = {
      name: w.name, type: w.type, exercises: w.exercises,
      date: new Date().toLocaleDateString(),
    };
    DB.set('templates', templates);
    onSave(null);
    onNav('home');
  }

  function cancelWorkout() {
    const msg = isEdit ? 'Discard changes to this template?' : 'Cancel this workout? It won\'t be saved.';
    if (!confirm(msg)) return;
    clearInterval(timerRef.current);
    onSave(null);
    onNav('home');
  }

  const sortableIds = w.exercises.map((ex, i) => ex.id + '_' + i);

  return (
    <>
      {showModal && (
        <ExerciseModal
          selectedIds={w.exercises.map(e => e.id)}
          onToggle={addExercise}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="page-header flex-between">
        {isEdit ? (
          <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--accent)' }}>Editing Template</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="timer-display">{formatTime(elapsedSec)}</span>
            <button className="btn" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }} onClick={togglePause}>
              {w.isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" style={{ width: 'auto', padding: '8px 12px', fontSize: 14, background: 'transparent' }} onClick={cancelWorkout}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 14 }} onClick={isEdit ? saveEditedTemplate : finishWorkout}>
            {isEdit ? 'Save' : 'Finish'}
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
        {isEdit ? (
          <>
            <select
              className="input-field"
              style={{ width: '35%', padding: 8, margin: 0 }}
              value={w.type}
              onChange={e => onSave({ ...w, type: e.target.value })}
            >
              {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              className="input-field"
              style={{ width: '65%', padding: 8, margin: 0 }}
              value={w.name}
              onChange={e => onSave({ ...w, name: e.target.value })}
            />
          </>
        ) : (
          <>
            <div className="badge type-badge" style={{ display: 'inline-block', fontSize: 14, padding: '4px 8px' }}>{w.type}</div>
            <strong style={{ marginLeft: 8 }}>{w.name}</strong>
          </>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {w.exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={ex.id + '_' + exIdx}
              ex={ex}
              exIdx={exIdx}
              isEdit={isEdit}
              lastSession={getLastSession(history, ex.id)}
              onUpdate={updateExercise}
              onRemove={removeExercise}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div style={{ padding: 12, paddingBottom: 40 }}>
        <button className="btn" style={{ borderStyle: 'dashed', padding: 16 }} onClick={() => setShowModal(true)}>
          🔍 Add Exercise
        </button>
      </div>
    </>
  );
}
