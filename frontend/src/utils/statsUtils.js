/**
 * Total volume (weight × reps) for completed sets in one workout.
 */
export function computeWorkoutVolume(workout) {
  let vol = 0;
  for (const ex of workout.exercises || []) {
    for (const s of ex.sets || []) {
      if (s.completed) {
        const w = parseFloat(s.weight) || 0;
        const r = parseFloat(s.reps)   || 0;
        vol += w * r;
      }
    }
  }
  return vol;
}

/**
 * Total completed sets across a workout.
 */
export function computeSetCount(workout) {
  return (workout.exercises || []).reduce((n, ex) =>
    n + (ex.sets || []).filter(s => s.completed).length, 0);
}

/**
 * Home dashboard stats from all workout history.
 */
export function computeStats(history) {
  if (!history.length) return { streak: 0, weekCount: 0, weekVolume: 0, weekMins: 0 };

  // Streak — consecutive calendar days (most recent first)
  const daySet = new Set(history.map(w => normDate(w.date)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(d.toLocaleDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // This week (Mon–Sun)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = history.filter(w => {
    const d = new Date(w.date);
    return d >= weekStart;
  });

  const weekCount  = thisWeek.length;
  const weekVolume = thisWeek.reduce((s, w) => s + computeWorkoutVolume(w), 0);
  const weekMins   = thisWeek.reduce((s, w) => s + Math.round((w.duration || 0) / 60), 0);

  return { streak, weekCount, weekVolume, weekMins };
}

function normDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Build chart data for an exercise — max weight per session date.
 */
export function buildExerciseChartData(exId, history) {
  const points = [];
  for (const workout of [...history].reverse()) {
    const ex = workout.exercises?.find(e => e.id === exId);
    if (!ex) continue;
    const weights = (ex.sets || [])
      .filter(s => s.completed && parseFloat(s.weight) > 0)
      .map(s => parseFloat(s.weight));
    if (!weights.length) continue;
    points.push({ date: workout.date, value: Math.max(...weights) });
  }
  return points.reverse();
}
