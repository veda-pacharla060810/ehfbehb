import { normalizeData, normalizePrefs, SCHEMA_VERSION } from './schema.js';

export const KEYS = {
  prefs: 'vk:v1:prefs',
  mode: 'vk:v1:mode',
  personal: 'vk:v1:data:personal',
  demo: 'vk:v1:data:demo',
};

// Returns { ok, value, corrupt, unavailable }
export function readJSON(key) {
  let raw;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return { ok: false, unavailable: true, value: null };
  }
  if (raw == null) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    // Keep a copy of unreadable data instead of silently discarding it.
    try {
      window.localStorage.setItem(`${key}:corrupt:${Date.now()}`, raw);
    } catch {
      /* storage full or blocked; nothing more we can do */
    }
    return { ok: false, corrupt: true, value: null };
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function storageAvailable() {
  try {
    const k = 'vk:probe';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function loadAll() {
  const notices = [];
  const available = storageAvailable();
  if (!available) notices.push('Browser storage is blocked here, so changes will last only until you close this page.');

  const p = readJSON(KEYS.prefs);
  const personal = readJSON(KEYS.personal);
  const demo = readJSON(KEYS.demo);
  const mode = readJSON(KEYS.mode);
  if (p.corrupt || personal.corrupt) {
    notices.push('Some saved data could not be read. A copy was kept in storage and the app started with what was readable.');
  }
  return {
    available,
    notices,
    prefs: normalizePrefs(p.value),
    personal: normalizeData(personal.value),
    demo: demo.value ? normalizeData(demo.value) : null,
    mode: mode.value === 'demo' ? 'demo' : 'personal',
  };
}

// ----- Backups -----
export const BACKUP_APP = 'vaa-kannamma';

export function makeBackup(prefs, personal) {
  return JSON.stringify(
    { app: BACKUP_APP, kind: 'backup', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), prefs, data: personal },
    null,
    2,
  );
}

// Throws an Error with a readable message when the file is not a valid backup.
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON. Choose a backup exported from vaa kannamma.');
  }
  if (!obj || obj.app !== BACKUP_APP || obj.kind !== 'backup' || typeof obj.data !== 'object') {
    throw new Error('That file is not a vaa kannamma backup.');
  }
  if (typeof obj.schema === 'number' && obj.schema > SCHEMA_VERSION) {
    throw new Error('This backup was made by a newer version of the app and cannot be restored here.');
  }
  return { prefs: normalizePrefs(obj.prefs), data: normalizeData(obj.data), exportedAt: obj.exportedAt };
}
