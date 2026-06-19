import { useState } from 'react';
import { DB } from '../db';
import WorkoutDetails from './WorkoutDetails';

export default function Calendar({ onStartWorkout, onNav }) {
  const [month,    setMonth]    = useState(new Date().getMonth());
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [selected, setSelected] = useState(null); // dateStr
  const [detailW,  setDetailW]  = useState(null); // { workout, idx }

  const history = DB.get('workouts') || [];

  function changeMonth(dir) {
    setMonth(m => {
      const next = m + dir;
      if (next > 11) { setYear(y => y + 1); return 0; }
      if (next < 0)  { setYear(y => y - 1); return 11; }
      return next;
    });
    setSelected(null);
  }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName   = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

  const workoutsByDate = {};
  history.forEach((w, idx) => {
    if (!workoutsByDate[w.date]) workoutsByDate[w.date] = [];
    workoutsByDate[w.date].push({ ...w, _idx: idx });
  });

  const selectedWorkouts = selected ? (workoutsByDate[selected] || []) : [];

  function repeatWorkout(w) {
    const cloned = JSON.parse(JSON.stringify(w.exercises)).map(ex => {
      ex.sets.forEach(s => { s.completed = false; });
      return ex;
    });
    onStartWorkout({
      name: w.name, type: w.type,
      date: new Date().toLocaleDateString(),
      startTime: Date.now(), pauseTime: 0,
      lastPauseStart: null, isPaused: false,
      exercises: cloned, notes: '',
    });
    onNav('workout');
  }

  return (
    <>
      {detailW && (
        <WorkoutDetails
          workout={detailW.workout}
          workoutIdx={detailW.idx}
          onClose={() => setDetailW(null)}
          onRepeat={repeatWorkout}
        />
      )}

      <div className="page-header">Calendar</div>
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <button className="btn" style={{ width: 'auto', padding: '6px 16px' }} onClick={() => changeMonth(-1)}>◀</button>
          <h3 style={{ margin: 0, fontSize: 18 }}>{monthName} {year}</h3>
          <button className="btn" style={{ width: 'auto', padding: '6px 16px' }} onClick={() => changeMonth(1)}>▶</button>
        </div>

        <div className="cal-grid">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="cal-header">{d}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day     = i + 1;
            const dateStr = new Date(year, month, day).toLocaleDateString();
            const ws      = workoutsByDate[dateStr];
            return (
              <div
                key={day}
                className={`cal-day${ws ? ' active' : ''}${selected === dateStr ? ' selected' : ''}`}
                onClick={() => setSelected(selected === dateStr ? null : dateStr)}
              >
                {day}
                {ws && <div className="cal-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day drill-down */}
      {selected && (
        <div className="card">
          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>{selected}</div>
          {selectedWorkouts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Rest day</div>
          ) : selectedWorkouts.map((w, i) => (
            <div
              key={i}
              style={{ cursor: 'pointer', padding: '10px 0', borderBottom: i < selectedWorkouts.length - 1 ? '1px solid var(--border)' : 'none' }}
              onClick={() => setDetailW({ workout: w, idx: w._idx })}
            >
              <div className="flex-between">
                <strong>{w.name} <span className="badge type-badge">{w.type}</span></strong>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>▶ details</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                ⏱ {Math.round((w.duration || 0) / 60)} mins · {w.exercises.length} exercises
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
