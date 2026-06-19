import { useEffect, useRef, useState } from 'react';
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js';
import { DB } from '../db';
import { buildExerciseChartData } from '../utils/statsUtils';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const MODES = ['1RM', 'Volume', 'Both'];

export default function ExerciseChart({ exercise, onClose }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [mode, setMode] = useState('Both');

  const history = DB.get('workouts') || [];
  const points  = buildExerciseChartData(exercise.id, history);
  const hasData = points.some(p => p.est1RM || p.volume);

  useEffect(() => {
    if (!canvasRef.current || !hasData) return;

    const labels = points.map(p => p.date);
    const show1RM    = mode === '1RM'    || mode === 'Both';
    const showVolume = mode === 'Volume' || mode === 'Both';

    const datasets = [];

    if (show1RM) {
      datasets.push({
        label: 'Est. 1RM (lb)',
        data: points.map(p => p.est1RM),
        borderColor: '#c8ff00',
        backgroundColor: mode === 'Both' ? 'transparent' : 'rgba(200,255,0,0.1)',
        fill: mode !== 'Both',
        tension: 0.35,
        pointBackgroundColor: '#c8ff00',
        pointRadius: 4,
        yAxisID: 'y',
      });
    }

    if (showVolume) {
      datasets.push({
        label: 'Session Volume (lb)',
        data: points.map(p => p.volume),
        borderColor: '#38bdf8',
        backgroundColor: mode === 'Both' ? 'transparent' : 'rgba(56,189,248,0.1)',
        fill: mode !== 'Both',
        tension: 0.35,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4,
        borderDash: mode === 'Both' ? [4, 3] : [],
        yAxisID: mode === 'Both' ? 'y2' : 'y',
      });
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: mode === 'Both',
            labels: { color: '#888', boxWidth: 16, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toLocaleString() : '—'}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#888', maxTicksLimit: 6 },
            grid: { color: '#2e2e2e' },
          },
          y: {
            position: 'left',
            ticks: { color: show1RM ? '#c8ff00' : '#38bdf8' },
            grid: { color: '#2e2e2e' },
            beginAtZero: false,
            title: {
              display: mode === 'Both',
              text: 'Est. 1RM (lb)',
              color: '#c8ff00',
              font: { size: 11 },
            },
          },
          ...(mode === 'Both' ? {
            y2: {
              position: 'right',
              ticks: { color: '#38bdf8' },
              grid: { drawOnChartArea: false },
              beginAtZero: false,
              title: {
                display: true,
                text: 'Volume (lb)',
                color: '#38bdf8',
                font: { size: 11 },
              },
            },
          } : {}),
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [mode, hasData]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ height: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 18 }}>{exercise.name}</h3>
          <button className="btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onClose}>Close</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {MODES.map(m => (
            <button
              key={m}
              className={`field-toggle${mode === m ? ' on' : ''}`}
              style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Legend hint */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
          {mode === '1RM' && '📈 Estimated 1RM normalises different rep ranges — a set of 110lb×12 will score higher than 120lb×5.'}
          {mode === 'Volume' && '📦 Session volume = total weight moved (weight × reps across all completed sets).'}
          {mode === 'Both' && '🟡 Est. 1RM (left axis)  ·  🔵 Volume (right axis, dashed)'}
        </div>

        {!hasData || points.length < 2 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            Not enough data yet.<br />
            <span style={{ fontSize: 12 }}>Log 2+ sessions with this exercise to see a chart.</span>
          </div>
        ) : (
          <div style={{ height: 280, position: 'relative' }}>
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
