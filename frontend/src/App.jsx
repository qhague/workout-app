import { useState, useCallback, useRef } from 'react';
import { DB, DEFAULT_EXERCISES } from './db';
import { syncData } from './api';
import Auth from './components/Auth';
import Home from './components/Home';
import Workout from './components/Workout';
import Calendar from './components/Calendar';
import Exercises from './components/Exercises';

const VIEWS = ['home', 'workout', 'calendar', 'exercises'];

export default function App() {
  const [userId,       setUserId]       = useState(() => DB.get('user_id'));
  const [username,     setUsername]     = useState(() => DB.get('username'));
  const [view,         setView]         = useState(() => DB.get('user_id') ? 'home' : 'auth');
  const [activeWorkout, setActiveWorkoutState] = useState(() => DB.get('activeWorkout'));

  // Ensure default exercises exist
  if (!DB.get('exercises')) DB.set('exercises', DEFAULT_EXERCISES);

  const syncTimeoutRef = useRef(null);

  const debounceSync = useCallback((workout) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncData(DB.get('user_id'), workout ?? DB.get('activeWorkout'));
    }, 1500);
  }, []);

  function saveActiveWorkout(workout) {
    setActiveWorkoutState(workout);
    DB.set('activeWorkout', workout);
    debounceSync(workout);
  }

  function handleLogin(data, user) {
    DB.set('user_id',   data.user_id);
    DB.set('username',  user);
    DB.set('workouts',  data.workouts  || []);
    DB.set('templates', data.templates || []);
    if (data.exercises) DB.set('exercises', data.exercises);
    if (data.activeWorkout) {
      DB.set('activeWorkout', data.activeWorkout);
      setActiveWorkoutState(data.activeWorkout);
    } else {
      DB.set('activeWorkout', null);
      setActiveWorkoutState(null);
    }
    setUserId(data.user_id);
    setUsername(user);
    setView('home');
  }

  function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    syncData(userId, activeWorkout).finally(() => {
      DB.clear();
      setUserId(null);
      setUsername(null);
      setActiveWorkoutState(null);
      setView('auth');
    });
  }

  function nav(v) {
    setView(v);
  }

  if (view === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <>
      <div className="main-content">
        {view === 'home' && (
          <Home
            username={username}
            userId={userId}
            activeWorkout={activeWorkout}
            onNav={nav}
            onLogout={handleLogout}
            onStartWorkout={saveActiveWorkout}
          />
        )}
        {view === 'workout' && (
          <Workout
            activeWorkout={activeWorkout}
            onSave={saveActiveWorkout}
            onNav={nav}
            userId={userId}
          />
        )}
        {view === 'calendar' && <Calendar onStartWorkout={saveActiveWorkout} onNav={nav} />}
        {view === 'exercises' && <Exercises onSync={debounceSync} />}
      </div>

      <nav className="bottom-nav">
        {VIEWS.map(v => (
          <button
            key={v}
            className={`nav-btn${view === v ? ' active' : ''}`}
            onClick={() => nav(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </nav>
    </>
  );
}
