// Local-time date helpers. Day keys are "YYYY-MM-DD" in the viewer's own time zone.
export const DAY_MS = 86400000;
export const pad = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
export function fromKey(k) {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export const todayKey = () => toKey(new Date());
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
export function startOfWeek(d, weekStart = 1) {
  const x = startOfDay(d);
  const diff = (x.getDay() - weekStart + 7) % 7;
  return addDays(x, -diff);
}
export function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
export function addMonths(d, n) {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
// Whole calendar days from a to b (DST-safe).
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}
export function sameDay(a, b) {
  return toKey(a) === toKey(b);
}

export function fmtMinutes(min) {
  const m = Math.round(min || 0);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
export function fmtDate(key, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (!key) return '';
  return fromKey(key).toLocaleDateString(undefined, opts);
}
export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function fmtTimestamp(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function relDays(key) {
  if (!key) return '';
  const n = daysBetween(new Date(), fromKey(key));
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
