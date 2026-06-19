import { DB, DEFAULT_EXERCISES } from './db';

export async function apiCall(endpoint, data) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error('Server error:', await res.text());
      return { error: `Server error (${res.status})` };
    }
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return { error: 'Network error. Server might be offline.' };
  }
}

export async function syncData(userId, activeWorkout) {
  if (!userId) return;
  return apiCall('/sync_data', {
    user_id: userId,
    workouts:      DB.get('workouts')   || [],
    templates:     DB.get('templates')  || [],
    exercises:     DB.get('exercises')  || DEFAULT_EXERCISES,
    activeWorkout: activeWorkout ?? null,
  });
}

export async function exportData(userId, username) {
  await apiCall('/sync_data', {
    user_id:       userId,
    workouts:      DB.get('workouts')   || [],
    templates:     DB.get('templates')  || [],
    exercises:     DB.get('exercises')  || DEFAULT_EXERCISES,
    activeWorkout: DB.get('activeWorkout') ?? null,
  });

  const res = await fetch('/export_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) { alert('Export failed.'); return; }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ironlog_${username}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
