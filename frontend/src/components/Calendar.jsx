import { useState } from 'react';
import { DB } from '../db';

export default function Calendar() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState(null);

  const history = DB.get('workouts') || [];

  function changeMonth(dir) {
    setMonth(m => {
      const next = m + dir;
      if (next > 11) { setYear(y => y + 1); return 0; }
      if (next < 0)  { setYear(y => y - 1); return 11; }
      return next;
    });
  }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName   = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

  const workoutsByDate = {};
  history.forEach(w => {
    const d = w.date;
    if (!workoutsByDate[d]) workoutsByDate[d] = [];
    workoutsByDate[d].push(w.type);
  });

  return (
    <>
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
            const day = i + 1;
            const dateStr = new Date(year, month, day).toLocaleDateString();
            const types = workoutsByDate[dateStr];
            return (
              <div
                key={day}
                className={`cal-day${types ? ' active' : ''}`}
                onClick={() => types && setTooltip(tooltip === dateStr ? null : dateStr)}
              >
                {day}
                {types && <div className="cal-dot" />}
              </div>
            );
          })}
        </div>

        {tooltip && workoutsByDate[tooltip] && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
            <strong style={{ color: 'var(--accent)' }}>{tooltip}</strong>
            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              {workoutsByDate[tooltip].join(', ')}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
