import { useEffect, useRef } from 'react';
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Filler,
} from 'chart.js';
import { DB } from '../db';
import { buildExerciseChartData } from '../utils/statsUtils';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

export default function ExerciseChart({ exercise, onClose }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const history   = DB.get('workouts') || [];
  const points    = buildExerciseChartData(exercise.id, history);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: points.map(p => p.date),
        datasets: [{
          label: 'Max Weight',
          data: points.map(p => p.value),
          borderColor: '#c8ff00',
          backgroundColor: 'rgba(200,255,0,0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#c8ff00',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { ticks: { color: '#888', maxTicksLimit: 6 }, grid: { color: '#2e2e2e' } },
          y: { ticks: { color: '#888' }, grid: { color: '#2e2e2e' }, beginAtZero: false },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ height: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3>{exercise.name}</h3>
          <button className="btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onClose}>Close</button>
        </div>
        {points.length < 2 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            Not enough data yet.<br />
            <span style={{ fontSize: 12 }}>Complete 2+ workouts with this exercise to see a chart.</span>
          </div>
        ) : (
          <div style={{ height: 260, position: 'relative' }}>
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
