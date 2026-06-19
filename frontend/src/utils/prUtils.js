/**
 * Returns personal bests for an exercise across all history.
 * { maxWeight, maxReps, bestTime }  (each may be null)
 */
export function getPersonalBests(exId, history) {
  let maxWeight = null; // { weight, reps, date }
  let maxReps   = null; // { reps, weight, date }
  let bestTime  = null; // { time, date }

  for (const workout of history) {
    const ex = workout.exercises?.find(e => e.id === exId);
    if (!ex) continue;
    for (const s of ex.sets || []) {
      const w = parseFloat(s.weight);
      const r = parseFloat(s.reps);
      const t = parseFloat(s.time);
      if (!isNaN(w) && w > 0) {
        if (!maxWeight || w > maxWeight.weight || (w === maxWeight.weight && r > maxWeight.reps)) {
          maxWeight = { weight: w, reps: r || 0, date: workout.date };
        }
      }
      if (!isNaN(r) && r > 0) {
        if (!maxReps || r > maxReps.reps) {
          maxReps = { reps: r, weight: w || 0, date: workout.date };
        }
      }
      if (!isNaN(t) && t > 0) {
        if (!bestTime || t > bestTime.time) {
          bestTime = { time: t, date: workout.date };
        }
      }
    }
  }
  return { maxWeight, maxReps, bestTime };
}

/**
 * Returns which PR types a set beats given history (not including current workout).
 * Returns array of strings: 'weight' | 'reps' | 'time'
 */
export function checkSetPR(set, exId, history) {
  const bests = getPersonalBests(exId, history);
  const prs = [];
  const w = parseFloat(set.weight);
  const r = parseFloat(set.reps);
  const t = parseFloat(set.time);

  if (!isNaN(w) && w > 0 && set.completed) {
    if (!bests.maxWeight || w > bests.maxWeight.weight) prs.push('weight');
  }
  if (!isNaN(r) && r > 0 && set.completed) {
    if (!bests.maxReps || r > bests.maxReps.reps) prs.push('reps');
  }
  if (!isNaN(t) && t > 0 && set.completed) {
    if (!bests.bestTime || t > bests.bestTime.time) prs.push('time');
  }
  return prs;
}

/**
 * Returns all PRs achieved in a finished workout (vs prior history).
 */
export function getWorkoutPRs(workout, priorHistory) {
  const prs = [];
  for (const ex of workout.exercises || []) {
    const bests = getPersonalBests(ex.id, priorHistory);
    for (const s of ex.sets || []) {
      if (!s.completed) continue;
      const w = parseFloat(s.weight);
      const r = parseFloat(s.reps);
      const t = parseFloat(s.time);
      if (!isNaN(w) && w > 0 && (!bests.maxWeight || w > bests.maxWeight.weight)) {
        prs.push({ exercise: ex.name, type: 'Weight', value: `${w}lb` });
      }
      if (!isNaN(r) && r > 0 && (!bests.maxReps || r > bests.maxReps.reps)) {
        prs.push({ exercise: ex.name, type: 'Reps', value: `${r}` });
      }
      if (!isNaN(t) && t > 0 && (!bests.bestTime || t > bests.bestTime.time)) {
        prs.push({ exercise: ex.name, type: 'Time', value: `${t}s` });
      }
    }
  }
  // deduplicate by exercise+type
  const seen = new Set();
  return prs.filter(p => {
    const key = p.exercise + p.type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
