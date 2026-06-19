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

  // Streak — consecutive workout days, with 1 rest-day grace before breaking
  const daySet = new Set(history.map(w => normDate(w.date)));
  let streak = 0;
  let restDaysUsed = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(d.toLocaleDateString())) {
      streak++;
      restDaysUsed = 0;       // reset grace on any workout day
    } else if (i === 0) {
      // today with no workout yet — don't penalise
    } else if (restDaysUsed < 1) {
      restDaysUsed++;          // use the one grace rest day
    } else {
      break;                   // second consecutive rest day — streak ends
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
 * Epley estimated 1RM: weight × (1 + reps / 30)
 * Returns null for sets with no weight or reps (e.g. timed exercises).
 */
export function epley1RM(weight, reps) {
  const w = parseFloat(weight);
  const r = parseFloat(reps);
  if (!w || !r || r <= 0) return null;
  return Math.round(w * (1 + r / 30));
}

/**
 * Build chart data for an exercise per session.
 * Returns an array of { date, est1RM, volume } — one point per session.
 * est1RM: best Epley-estimated 1RM across all completed sets.
 * volume: total weight × reps for all completed sets.
 */
export function buildExerciseChartData(exId, history) {
  const points = [];
  for (const workout of [...history].reverse()) {
    const ex = workout.exercises?.find(e => e.id === exId);
    if (!ex) continue;

    let best1RM = null;
    let volume  = 0;

    for (const s of ex.sets || []) {
      if (!s.completed) continue;
      const w = parseFloat(s.weight) || 0;
      const r = parseFloat(s.reps)   || 0;
      volume += w * r;
      const est = epley1RM(s.weight, s.reps);
      if (est && (best1RM === null || est > best1RM)) best1RM = est;
    }

    if (best1RM !== null || volume > 0) {
      points.push({ date: workout.date, est1RM: best1RM, volume: Math.round(volume) });
    }
  }
  return points.reverse();
}
