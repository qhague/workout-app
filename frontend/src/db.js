const PREFIX = 'ironlog_';

export const DB = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + key));
    } catch {
      return null;
    }
  },
  set: (key, val) => localStorage.setItem(PREFIX + key, JSON.stringify(val)),
  clear: () => localStorage.clear(),
};

export const DEFAULT_EXERCISES = [
  { id: 'bench',    name: 'Bench Press',      fields: ['weight', 'reps'] },
  { id: 'squat',    name: 'Barbell Squat',    fields: ['weight', 'reps'] },
  { id: 'deadlift', name: 'Deadlift',          fields: ['weight', 'reps'] },
  { id: 'ohp',      name: 'Overhead Press',   fields: ['weight', 'reps'] },
  { id: 'pullup',   name: 'Pull-Ups',          fields: ['weight', 'reps'] },
  { id: 'row',      name: 'Barbell Row',       fields: ['weight', 'reps'] },
  { id: 'curl',     name: 'Bicep Curl',        fields: ['weight', 'reps'] },
  { id: 'plank',    name: 'Plank',             fields: ['time'] },
  { id: 'run',      name: 'Treadmill',         fields: ['time'] },
  { id: 'bike',     name: 'Stationary Bike',   fields: ['time'] },
];

export function getExercises() {
  return DB.get('exercises') || DEFAULT_EXERCISES;
}
