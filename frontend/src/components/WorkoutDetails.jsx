export default function WorkoutDetails({ workout: w, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3>{w.name} Details</h3>
          <button className="btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onClose}>Close</button>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 15 }}>
          {w.date} · {Math.round(w.duration / 60)} mins
        </div>
        <div className="search-list" style={{ paddingRight: 5 }}>
          {w.exercises.map((ex, i) => (
            <div key={i} style={{ marginBottom: 15, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{ex.name}</div>
              <div style={{ fontSize: 13, marginTop: 5 }}>
                {ex.sets.map((s, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, color: 'var(--text-muted)' }}>
                    <span>Set {j + 1}:</span>
                    <span>
                      {s.weight ? `${s.weight}lb` : ''}{' '}
                      {s.reps   ? `× ${s.reps}`   : ''}{' '}
                      {s.time   ? `${s.time}s`     : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
