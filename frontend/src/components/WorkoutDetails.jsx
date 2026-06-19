export default function WorkoutDetails({ workout: w, workoutIdx, onClose, onRepeat, onSaveTemplate, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 18 }}>{w.name}</h3>
          <button className="btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onClose}>Close</button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          {w.date} · {Math.round((w.duration || 0) / 60)} mins
          {w.type && <span className="badge type-badge" style={{ marginLeft: 8 }}>{w.type}</span>}
        </div>

        {w.notes && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            {w.notes}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {onRepeat && (
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={() => onRepeat(w)}>
              ▶ Do Again
            </button>
          )}
          {onSaveTemplate && (
            <button className="btn" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={() => onSaveTemplate(w)}>
              ⊕ Save as Template
            </button>
          )}
          {onDelete && (
            <button className="btn btn-danger" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={() => onDelete(workoutIdx)}>
              🗑 Delete
            </button>
          )}
        </div>

        <div className="search-list" style={{ paddingRight: 5 }}>
          {(w.exercises || []).map((ex, i) => (
            <div key={i} style={{ marginBottom: 15, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: 4 }}>{ex.name}</div>
              {ex.notes && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>{ex.notes}</div>
              )}
              {(ex.sets || []).map((s, j) => (
                <div key={j} style={{ display: 'flex', gap: 10, color: 'var(--text-muted)', fontSize: 13, marginBottom: 2 }}>
                  <span style={{ minWidth: 40 }}>Set {j + 1}:</span>
                  <span>
                    {s.weight ? `${s.weight}lb ` : ''}
                    {s.reps   ? `× ${s.reps} ` : ''}
                    {s.time   ? `${s.time}s ` : ''}
                    {s.rpe    ? <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>RPE {s.rpe}</span> : ''}
                  </span>
                  {s.completed && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✔</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
