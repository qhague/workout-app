import { useState, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DB } from '../db';
import { syncData } from '../api';
import { checkSetPR, getWorkoutPRs } from '../utils/prUtils';
import { computeWorkoutVolume, computeSetCount } from '../utils/statsUtils';
import { getSettings } from '../utils/settings';
import ExerciseModal from './ExerciseModal';

const WORKOUT_TYPES = ['Upper','Lower','Push','Pull','Legs','Full Body','Cardio','Other'];

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function getLastSession(history, exId) {
  for (let i = history.length - 1; i >= 0; i--) {
    const found = history[i].exercises?.find(e => e.id === exId);
    if (found?.sets?.length > 0) return { date: history[i].date, sets: found.sets };
  }
  return null;
}

// ── Summary Modal ─────────────────────────────────────────────────────────────
function SummaryModal({ workout, priorHistory, onClose }) {
  const duration = Math.round((workout.duration || 0) / 60);
  const volume   = Math.round(computeWorkoutVolume(workout));
  const sets     = computeSetCount(workout);
  const prs      = getWorkoutPRs(workout, priorHistory);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ height: 'auto', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🏁</div>
          <h2 style={{ fontSize: 22, color: 'var(--accent)' }}>Workout Complete!</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{workout.name}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Duration', value: `${duration} min` },
            { label: 'Sets',     value: sets },
            { label: 'Volume',   value: volume ? `${volume.toLocaleString()} lb` : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {prs.length > 0 && (
          <div style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)' }}>🏆 New Personal Records</div>
            {prs.map((pr, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                <strong>{pr.exercise}</strong> — {pr.type}: {pr.value}
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary" style={{ padding: 14 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

// ── Rest Timer Bar ────────────────────────────────────────────────────────────
function RestTimerBar({ seconds, total, onSkip, onAdd }) {
  const pct = Math.max(0, seconds / total) * 100;
  return (
    <div style={{
      position: 'fixed', bottom: 65, left: 0, right: 0,
      background: 'var(--bg-card)', borderTop: '1px solid var(--border)', zIndex: 90,
      padding: '10px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rest</span>
        <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: seconds <= 10 ? 'var(--danger)' : 'var(--accent)' }}>
          {formatTime(seconds)}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={onAdd}>+30s</button>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={onSkip}>Skip</button>
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 1s linear' }} />
      </div>
    </div>
  );
}

// ── Per-exercise persistent note ──────────────────────────────────────────────
function ExerciseNote({ exId }) {
  const saved = (DB.get('exerciseNotes') || {})[exId] || '';
  const [open, setOpen] = useState(!!saved);
  const [text, setText] = useState(saved);

  function handleChange(val) {
    setText(val);
    const notes = DB.get('exerciseNotes') || {};
    if (val.trim()) notes[exId] = val;
    else delete notes[exId];
    DB.set('exerciseNotes', notes);
  }

  return (
    <div style={{ marginBottom: open ? 10 : 6 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 11, padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          📝 <span style={{ textDecoration: 'underline dotted' }}>add note</span>
        </button>
      ) : (
        <div style={{ position: 'relative' }}>
          <textarea
            autoFocus={!saved}
            className="input-field"
            rows={2}
            style={{
              fontSize: 12, padding: '6px 28px 6px 8px',
              minHeight: 0, resize: 'none', color: 'var(--text-muted)',
              lineHeight: 1.4, marginBottom: 0,
            }}
            placeholder="Note to self for next time…"
            value={text}
            onChange={e => handleChange(e.target.value)}
          />
          <button
            onClick={() => { if (!text.trim()) setOpen(false); else setOpen(false); }}
            style={{
              position: 'absolute', top: 5, right: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}

// ── Sortable Exercise Card ────────────────────────────────────────────────────
function ExerciseCard({ ex, exIdx, isEdit, lastSession, history, settings, onUpdate, onRemove, onRestStart }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id + '_' + exIdx });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.15 : 1 };

  const hasWeight = ex.fields.includes('weight');
  const hasReps   = ex.fields.includes('reps');
  const hasTime   = ex.fields.includes('time');
  const unit      = settings.unit || 'lbs';

  function updateSet(setIdx, field, val) {
    const sets = [...ex.sets];
    sets[setIdx] = { ...sets[setIdx], [field]: val };
    onUpdate(exIdx, { ...ex, sets });
  }

  function toggleSet(setIdx) {
    const sets = [...ex.sets];
    const wasCompleted = sets[setIdx].completed;
    sets[setIdx] = { ...sets[setIdx], completed: !wasCompleted };
    onUpdate(exIdx, { ...ex, sets });
    if (!wasCompleted) onRestStart(); // set just got checked
  }

  function addSet() {
    const last = ex.sets[ex.sets.length - 1];
    const newSet = { weight: last?.weight || '', reps: last?.reps || '', time: last?.time || '', completed: false };
    if (settings.showRPE) newSet.rpe = '';
    onUpdate(exIdx, { ...ex, sets: [...ex.sets, newSet] });
  }

  function removeSet(setIdx) {
    if (ex.sets.length === 1) { onRemove(exIdx); return; }
    onUpdate(exIdx, { ...ex, sets: ex.sets.filter((_, i) => i !== setIdx) });
  }

  function handleEnter(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = Array.from(document.querySelectorAll('.set-input'));
    const i = inputs.indexOf(e.target);
    if (i > -1 && i < inputs.length - 1) inputs[i + 1].focus();
    else e.target.blur();
  }

  return (
    <div ref={setNodeRef} style={style} className={`card exercise-card${isDragging ? ' dragging' : ''}`}>
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
          <strong style={{ fontSize: 18 }}>{ex.name}</strong>
        </div>
        <button className="btn" style={{ width: 'auto', padding: '6px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => onRemove(exIdx)}>✕</button>
      </div>

      <ExerciseNote exId={ex.id} />

      {lastSession && !isEdit && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
            Last session <span style={{ color: 'var(--accent)' }}>{lastSession.date}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {lastSession.sets.map((s, i) => {
              const parts = [];
              if (hasWeight && s.weight) parts.push(`${s.weight}${unit}`);
              if (hasReps   && s.reps)   parts.push(`${s.reps}r`);
              if (hasTime   && s.time)   parts.push(`${s.time}s`);
              return (
                <span key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', fontSize: 11, color: 'var(--text-muted)' }}>
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
            <th style={{ width: '14%' }}>Set</th>
            {hasWeight && <th>{unit.charAt(0).toUpperCase() + unit.slice(1)}</th>}
            {hasReps   && <th>Reps</th>}
            {hasTime   && <th>Sec</th>}
            {settings.showRPE && <th>RPE</th>}
            <th style={{ width: '18%' }}>Done</th>
          </tr>
        </thead>
        <tbody>
          {ex.sets.map((set, setIdx) => {
            const prs = isEdit ? [] : checkSetPR(set, ex.id, history);
            return (
              <tr key={setIdx}>
                <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                  <span style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', marginRight: 4 }} onClick={() => removeSet(setIdx)}>✕</span>
                  {setIdx + 1}
                  {prs.length > 0 && <span title="Personal Record!" style={{ marginLeft: 4, fontSize: 12 }}>🏆</span>}
                </td>
                {hasWeight && (
                  <td>
                    <input type="number" inputMode="decimal" enterKeyHint="next" className="set-input"
                      value={set.weight} onChange={e => updateSet(setIdx, 'weight', e.target.value)}
                      onKeyDown={handleEnter} placeholder={unit} />
                  </td>
                )}
                {hasReps && (
                  <td>
                    <input type="number" inputMode="numeric" enterKeyHint="next" className="set-input"
                      value={set.reps} onChange={e => updateSet(setIdx, 'reps', e.target.value)}
                      onKeyDown={handleEnter} placeholder="reps" />
                  </td>
                )}
                {hasTime && (
                  <td>
                    <input type="number" inputMode="numeric" enterKeyHint="next" className="set-input"
                      value={set.time} onChange={e => updateSet(setIdx, 'time', e.target.value)}
                      onKeyDown={handleEnter} placeholder="sec" />
                  </td>
                )}
                {settings.showRPE && (
                  <td>
                    <input type="number" inputMode="numeric" className="set-input" min="1" max="10"
                      value={set.rpe || ''} onChange={e => updateSet(setIdx, 'rpe', e.target.value)}
                      placeholder="1-10" />
                  </td>
                )}
                <td>
                  <button className={`check-btn${set.completed ? ' done' : ''}`} onClick={() => toggleSet(setIdx)}>✔</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn" style={{ fontSize: 13, padding: 10 }} onClick={addSet}>+ Set</button>
      </div>
    </div>
  );
}

// ── Main Workout ──────────────────────────────────────────────────────────────
export default function Workout({ activeWorkout, onSave, onNav, userId }) {
  const [showModal,   setShowModal]   = useState(false);
  const [showSummary, setShowSummary] = useState(null); // finished workout object
  const [priorHistory, setPriorHistory] = useState(null);
  const [activeId,    setActiveId]    = useState(null);
  const [, setTick] = useState(0);
  const [rest, setRest] = useState(null); // { remaining, total }
  const timerRef   = useRef(null);
  const restRef    = useRef(null);
  const settings   = getSettings();

  const w = activeWorkout;
  const history = DB.get('workouts') || [];
  const isEdit  = w?.isTemplateEdit;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  // Workout timer
  useEffect(() => {
    if (!w || isEdit) return;
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [w?.startTime, isEdit]);

  // Rest timer countdown
  useEffect(() => {
    if (!rest) { clearInterval(restRef.current); return; }
    restRef.current = setInterval(() => {
      setRest(r => {
        if (!r || r.remaining <= 1) { clearInterval(restRef.current); return null; }
        return { ...r, remaining: r.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(restRef.current);
  }, [rest?.remaining === rest?.total]); // only restart when a new timer begins

  function startRest() {
    if (isEdit) return;
    const total = settings.restSeconds || 90;
    clearInterval(restRef.current);
    setRest({ remaining: total, total });
  }

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
    onSave({ ...w, exercises: w.exercises.filter((_, i) => i !== exIdx) });
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIdx = w.exercises.findIndex((_, i) => w.exercises[i].id + '_' + i === active.id);
    const newIdx = w.exercises.findIndex((_, i) => w.exercises[i].id + '_' + i === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onSave({ ...w, exercises: arrayMove([...w.exercises], oldIdx, newIdx) });
  }

  function addExercise(exDef) {
    const existing = w.exercises.findIndex(e => e.id === exDef.id);
    if (existing >= 0) {
      const ex = w.exercises[existing];
      const hasData = ex.sets.some(s => s.weight || s.reps || s.time || s.completed);
      if (hasData && !confirm(`Already added ${exDef.name} with data. Remove it anyway?`)) return;
      onSave({ ...w, exercises: w.exercises.filter((_, i) => i !== existing) });
    } else {
      const newEx = {
        id: exDef.id, name: exDef.name, fields: exDef.fields,
        sets: [{ weight: '', reps: '', time: '', completed: false }],
      };
      if (settings.showRPE) newEx.sets[0].rpe = '';
      onSave({ ...w, exercises: [...w.exercises, newEx] });
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
    const snapshot = [...(DB.get('workouts') || [])]; // capture PRs against history before save
    let finalMs = Date.now() - w.startTime - w.pauseTime;
    if (w.isPaused) finalMs -= (Date.now() - w.lastPauseStart);
    const finished = { ...w, duration: Math.floor(finalMs / 1000) };

    const saveTemplate = confirm('Save this workout as a template for future use?');
    if (saveTemplate) {
      const templates = DB.get('templates') || [];
      templates.push({ name: w.name, type: w.type, exercises: JSON.parse(JSON.stringify(w.exercises)), date: new Date().toLocaleDateString(), favorite: false });
      DB.set('templates', templates);
    }

    const workouts = DB.get('workouts') || [];
    workouts.push(finished);
    DB.set('workouts', workouts);
    onSave(null);
    clearInterval(timerRef.current);
    clearInterval(restRef.current);
    setRest(null);
    syncData(userId, null);

    setPriorHistory(snapshot);
    setShowSummary(finished);
  }

  function saveEditedTemplate() {
    const templates = DB.get('templates') || [];
    templates[w.templateIdx] = { name: w.name, type: w.type, exercises: w.exercises, date: new Date().toLocaleDateString() };
    DB.set('templates', templates);
    onSave(null);
    onNav('home');
  }

  function cancelWorkout() {
    const msg = isEdit ? 'Discard changes to this template?' : "Cancel this workout? It won't be saved.";
    if (!confirm(msg)) return;
    clearInterval(timerRef.current);
    clearInterval(restRef.current);
    onSave(null);
    onNav('home');
  }

  const sortableIds = w.exercises.map((ex, i) => ex.id + '_' + i);
  const activeEx = activeId
    ? w.exercises.find((ex, i) => ex.id + '_' + i === activeId)
    : null;

  return (
    <>
      {showModal && (
        <ExerciseModal selectedIds={w.exercises.map(e => e.id)} onToggle={addExercise} onClose={() => setShowModal(false)} />
      )}
      {showSummary && (
        <SummaryModal
          workout={showSummary}
          priorHistory={priorHistory || []}
          onClose={() => { setShowSummary(null); onNav('home'); }}
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
            <select className="input-field" style={{ width: '35%', padding: 8, margin: 0 }} value={w.type} onChange={e => onSave({ ...w, type: e.target.value })}>
              {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" className="input-field" style={{ width: '65%', padding: 8, margin: 0 }} value={w.name} onChange={e => onSave({ ...w, name: e.target.value })} />
          </>
        ) : (
          <>
            <div className="badge type-badge" style={{ display: 'inline-block', fontSize: 14, padding: '4px 8px' }}>{w.type}</div>
            <strong style={{ marginLeft: 8 }}>{w.name}</strong>
          </>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={(event) => { setActiveId(null); handleDragEnd(event); }}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {w.exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={ex.id + '_' + exIdx}
              ex={ex}
              exIdx={exIdx}
              isEdit={isEdit}
              lastSession={getLastSession(history, ex.id)}
              history={history}
              settings={settings}
              onUpdate={updateExercise}
              onRemove={removeExercise}
              onRestStart={startRest}
            />
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {activeEx ? (
            <div className="card exercise-card" style={{
              borderColor: 'var(--accent)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
              cursor: 'grabbing',
            }}>
              <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span className="drag-handle" style={{ color: 'var(--accent)' }}>⠿</span>
                  <strong style={{ fontSize: 18 }}>{activeEx.name}</strong>
                </div>
                <span className="badge type-badge">{activeEx.sets.length} sets</span>
              </div>
              {activeEx.sets.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {activeEx.sets.slice(0, 5).map((s, i) => {
                    const parts = [];
                    if (s.weight) parts.push(`${s.weight}`);
                    if (s.reps)   parts.push(`×${s.reps}`);
                    if (s.time)   parts.push(`${s.time}s`);
                    return (
                      <span key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', fontSize: 11, color: 'var(--text-muted)' }}>
                        {parts.join(' ') || `Set ${i + 1}`}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div style={{ padding: 12, paddingBottom: rest ? 120 : 40 }}>
        <button className="btn" style={{ borderStyle: 'dashed', padding: 16 }} onClick={() => setShowModal(true)}>
          🔍 Add Exercise
        </button>
      </div>

      {rest && (
        <RestTimerBar
          seconds={rest.remaining}
          total={rest.total}
          onSkip={() => { clearInterval(restRef.current); setRest(null); }}
          onAdd={() => setRest(r => r ? { ...r, remaining: r.remaining + 30 } : null)}
        />
      )}
    </>
  );
}
