// desireAction.js — shared data helpers for the Desire Action feature.
// Both the full Desire Action screen and the Home dashboard widget read and
// write the same /roadmap + /roadmap/log backend records, so the bridging
// logic between the app's calendar-day UI and the backend's integer-day
// logs lives here rather than being duplicated (and drifting) in each.

// The backend has no "start date" column for a roadmap, so each one's
// calendar anchor is stored on-device under this key prefix.
export const CURRENT_KEY = 'mv_dt_current';
export const START_KEY_PREFIX = 'mv_dt_start_';

export const DURATIONS = [7, 21, 30, 40, 66];
export const PRACTICE_OPTIONS = [
  'Scripting', 'Visualisation', '369 Method', 'Gratitude', 'Meditation', 'Feel It',
  'Mirror Work', "Ho'oponopono", 'Affirmations', '5×55 Method', 'Pillow Method',
  'Two Cup Method', 'Water Manifestation', 'EFT Tapping', 'Future Self Journaling',
  'Subliminal Listening', 'Vision Board',
];
export const DEFAULT_PRACTICES = ['Scripting', 'Visualisation', 'Gratitude'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtShort(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Map { [dateKey]: {id, practices:{name:true}, note} } derived from the raw
// /roadmap/log/ list, keeping only logs whose `desire` text matches the
// given roadmap's title (the backend has no roadmap_id FK, so the desire
// text is the only association it stores).
export function buildLogsMap(rawLogs, desireTitle) {
  const map = {};
  for (const log of rawLogs || []) {
    if (log.desire !== desireTitle) continue;
    const dateKey = (log.log_date || '').slice(0, 10);
    if (!dateKey) continue;
    const practices = {};
    (log.practices || []).forEach((p) => { practices[p] = true; });
    map[dateKey] = { id: log.id, practices, note: log.action || '' };
  }
  return map;
}

export function dayNumberFor(dateKey, startDate) {
  const diff = Math.round((startOfDay(new Date(dateKey)) - startOfDay(new Date(startDate))) / 86400000) + 1;
  return Math.max(1, Math.min(40, diff)); // backend day logs are capped 1-40
}
