import { DB } from '../db';

const DEFAULTS = {
  restSeconds: 90,
  unit: 'lbs',
  showRPE: false,
};

export function getSettings() {
  return { ...DEFAULTS, ...(DB.get('settings') || {}) };
}

export function saveSettings(settings) {
  DB.set('settings', settings);
}
