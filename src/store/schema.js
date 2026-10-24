import { uid } from '../lib/util.js';

export const SCHEMA_VERSION = 1;

// Soft pastel swatches for categories. `ink` keeps text readable on `bg`.
export const PASTELS = {
  rose: { name: 'Rose', bg: '#F6DCE2', ink: '#86394F', dot: '#D58FA2' },
  blush: { name: 'Blush', bg: '#F9E6E3', ink: '#874237', dot: '#E3A69B' },
  mauve: { name: 'Mauve', bg: '#ECDFE8', ink: '#694460', dot: '#B58BAA' },
  lilac: { name: 'Lilac', bg: '#E6E1F0', ink: '#4F4570', dot: '#A79BCB' },
  sage: { name: 'Sage', bg: '#DEE9DA', ink: '#435F3D', dot: '#93B08B' },
  peach: { name: 'Peach', bg: '#F8E5D8', ink: '#7D4E36', dot: '#E0AA88' },
  butter: { name: 'Butter', bg: '#F4ECCF', ink: '#665420', dot: '#D2BC70' },
  mist: { name: 'Mist', bg: '#DFE7EC', ink: '#3C5666', dot: '#93ADBD' },
  silver: { name: 'Silver', bg: '#E9E7EC', ink: '#524D59', dot: '#ABA6B3' },
};
export const PASTEL_KEYS = Object.keys(PASTELS);

export const EVENT_TYPES = {
  exam: { label: 'Exam', icon: 'exam', color: 'rose' },
  assignment: { label: 'Assignment', icon: 'doc', color: 'mauve' },
  personal: { label: 'Personal', icon: 'leaf', color: 'sage' },
  study: { label: 'Study session', icon: 'book', color: 'silver' },
};

export const DASHBOARD_CARDS = [
  { id: 'priorities', label: "Today's priorities" },
  { id: 'progress', label: 'Daily progress ring' },
  { id: 'timer', label: 'Focus timer' },
  { id: 'schedule', label: "Today's schedule" },
  { id: 'focusSummary', label: 'Focus-time summary' },
  { id: 'taskSummary', label: 'Task-completion summary' },
  { id: 'exam', label: 'Upcoming exam countdown' },
  { id: 'weeklyChart', label: 'Weekly focus chart' },
  { id: 'quickAdd', label: 'Quick-add task' },
  { id: 'continue', label: 'Continue active session' },
  { id: 'demo', label: 'Showcase data' },
];

export function defaultCategories() {
  return [
    { id: 'cat-study', name: 'Studies', color: 'rose' },
    { id: 'cat-projects', name: 'Projects', color: 'mauve' },
    { id: 'cat-personal', name: 'Personal', color: 'sage' },
  ];
}

export function emptyData() {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    categories: defaultCategories(),
    sessions: [],
    contracts: [],
    events: [],
    reviews: {},
    activeSession: null,
    lastFinishedId: null,
  };
}

export function defaultPrefs() {
  return {
    version: SCHEMA_VERSION,
    dashboard: { order: DASHBOARD_CARDS.map((c) => c.id), hidden: [] },
    goals: { dailyFocusMin: 120, weeklyFocusMin: 600, dailyTasks: 3, weeklyTasks: 15 },
    timer: { defaultMin: 25, presets: [25, 45, 60] },
    appearance: { accent: 'rose', botanical: 'full', density: 'comfortable' },
    a11y: { fontScale: 1, motion: 'system' },
    calendar: { weekStart: 1, defaultView: 'month' },
  };
}

/* ---------- safe normalisers: never throw, always return valid shapes ---------- */
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const dateKey = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const hhmm = (v) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : '');

function normTask(t, i) {
  if (!isObj(t) || !str(t.title).trim()) return null;
  const status = oneOf(t.status, ['todo', 'doing', 'done'], 'todo');
  return {
    id: str(t.id) || uid('t'),
    title: str(t.title).slice(0, 300),
    notes: str(t.notes).slice(0, 5000),
    priority: oneOf(t.priority, ['high', 'medium', 'low'], 'medium'),
    due: dateKey(t.due),
    categoryId: typeof t.categoryId === 'string' ? t.categoryId : null,
    status,
    completedAt: status === 'done' ? num(t.completedAt, num(t.createdAt, Date.now())) : null,
    createdAt: num(t.createdAt, Date.now()),
    order: num(t.order, i),
    subtasks: arr(t.subtasks)
      .filter((s) => isObj(s) && str(s.title).trim())
      .map((s) => ({ id: str(s.id) || uid('st'), title: str(s.title).slice(0, 300), done: !!s.done })),
  };
}
function normCategory(c) {
  if (!isObj(c) || !str(c.name).trim()) return null;
  return { id: str(c.id) || uid('cat'), name: str(c.name).slice(0, 40), color: oneOf(c.color, PASTEL_KEYS, 'rose') };
}
function normSession(s) {
  if (!isObj(s) || !num(s.startedAt)) return null;
  return {
    id: str(s.id) || uid('s'),
    label: str(s.label, 'Focus session').slice(0, 200),
    taskId: typeof s.taskId === 'string' ? s.taskId : null,
    taskTitle: str(s.taskTitle).slice(0, 300),
    contractId: typeof s.contractId === 'string' ? s.contractId : null,
    plannedSec: Math.max(60, num(s.plannedSec, 1500)),
    actualSec: Math.max(0, num(s.actualSec)),
    startedAt: num(s.startedAt),
    endedAt: num(s.endedAt, num(s.startedAt)),
    outcome: oneOf(s.outcome, ['completed', 'ended-early'], 'completed'),
    note: str(s.note).slice(0, 2000),
  };
}
function normContract(c) {
  if (!isObj(c) || !str(c.intention).trim()) return null;
  return {
    id: str(c.id) || uid('c'),
    intention: str(c.intention).slice(0, 400),
    taskId: typeof c.taskId === 'string' ? c.taskId : null,
    customTask: str(c.customTask).slice(0, 300),
    minutes: Math.max(1, Math.min(600, num(c.minutes, 25))),
    success: str(c.success).slice(0, 600),
    status: oneOf(c.status, ['pending', 'active', 'review', 'fulfilled', 'partial', 'not-fulfilled'], 'pending'),
    sessionId: typeof c.sessionId === 'string' ? c.sessionId : null,
    note: str(c.note).slice(0, 2000),
    createdAt: num(c.createdAt, Date.now()),
    reviewedAt: c.reviewedAt == null ? null : num(c.reviewedAt, null),
  };
}
function normEvent(e) {
  if (!isObj(e) || !str(e.title).trim() || !dateKey(e.date)) return null;
  return {
    id: str(e.id) || uid('e'),
    type: oneOf(e.type, Object.keys(EVENT_TYPES), 'personal'),
    title: str(e.title).slice(0, 200),
    subject: str(e.subject).slice(0, 120),
    topic: str(e.topic).slice(0, 200),
    date: dateKey(e.date),
    time: hhmm(e.time),
    notes: str(e.notes).slice(0, 2000),
  };
}
function normReview(r, key) {
  if (!isObj(r) || !dateKey(key)) return null;
  const f = (k) => str(r[k]).slice(0, 5000);
  return {
    weekStart: key,
    wins: f('wins'),
    unfinished: f('unfinished'),
    challenges: f('challenges'),
    adjustments: f('adjustments'),
    notes: f('notes'),
    nextGoals: f('nextGoals'),
    importantTasks: f('importantTasks'),
    status: oneOf(r.status, ['draft', 'complete', 'skipped'], 'draft'),
    updatedAt: num(r.updatedAt, Date.now()),
  };
}
function normActive(a) {
  if (!isObj(a) || !str(a.id) || !num(a.plannedSec) || !num(a.startedAt)) return null;
  let status = oneOf(a.status, ['running', 'paused'], 'paused');
  const segmentStart = num(a.segmentStart, 0) || null;
  if (status === 'running' && !segmentStart) status = 'paused';
  return {
    id: a.id,
    label: str(a.label, 'Focus session'),
    taskId: typeof a.taskId === 'string' ? a.taskId : null,
    taskTitle: str(a.taskTitle),
    contractId: typeof a.contractId === 'string' ? a.contractId : null,
    plannedSec: Math.max(60, a.plannedSec),
    status,
    startedAt: a.startedAt,
    segmentStart: status === 'running' ? segmentStart : null,
    accumulatedMs: Math.max(0, num(a.accumulatedMs)),
  };
}

const clean = (list, fn) => arr(list).map(fn).filter(Boolean);
const dedupe = (list) => {
  const seen = new Set();
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
};

// Accepts anything (including corrupted or older data) and returns a valid dataset.
export function normalizeData(raw) {
  if (!isObj(raw)) return emptyData();
  // Future migrations hook: if (raw.version < 2) raw = migrate1to2(raw);
  const reviews = {};
  if (isObj(raw.reviews)) {
    for (const [k, v] of Object.entries(raw.reviews)) {
      const r = normReview(v, k);
      if (r) reviews[k] = r;
    }
  }
  const categories = dedupe(clean(raw.categories, normCategory));
  return {
    version: SCHEMA_VERSION,
    tasks: dedupe(clean(raw.tasks, normTask)),
    categories: Array.isArray(raw.categories) ? categories : defaultCategories(),
    sessions: dedupe(clean(raw.sessions, normSession)),
    contracts: dedupe(clean(raw.contracts, normContract)),
    events: dedupe(clean(raw.events, normEvent)),
    reviews,
    activeSession: normActive(raw.activeSession),
    lastFinishedId: typeof raw.lastFinishedId === 'string' ? raw.lastFinishedId : null,
  };
}

export function normalizePrefs(raw) {
  const d = defaultPrefs();
  if (!isObj(raw)) return d;
  const known = DASHBOARD_CARDS.map((c) => c.id);
  const order = arr(raw.dashboard?.order).filter((id) => known.includes(id));
  known.forEach((id) => !order.includes(id) && order.push(id));
  const presets = arr(raw.timer?.presets)
    .map((n) => Math.round(num(n)))
    .filter((n) => n >= 1 && n <= 600)
    .slice(0, 5);
  return {
    version: SCHEMA_VERSION,
    dashboard: { order: [...new Set(order)], hidden: arr(raw.dashboard?.hidden).filter((id) => known.includes(id)) },
    goals: {
      dailyFocusMin: Math.max(0, Math.round(num(raw.goals?.dailyFocusMin, d.goals.dailyFocusMin))),
      weeklyFocusMin: Math.max(0, Math.round(num(raw.goals?.weeklyFocusMin, d.goals.weeklyFocusMin))),
      dailyTasks: Math.max(0, Math.round(num(raw.goals?.dailyTasks, d.goals.dailyTasks))),
      weeklyTasks: Math.max(0, Math.round(num(raw.goals?.weeklyTasks, d.goals.weeklyTasks))),
    },
    timer: {
      defaultMin: Math.min(600, Math.max(1, Math.round(num(raw.timer?.defaultMin, 25)))),
      presets: presets.length ? presets : d.timer.presets,
    },
    appearance: {
      accent: oneOf(raw.appearance?.accent, ['rose', 'lotus', 'mauve', 'sage'], 'rose'),
      botanical: oneOf(raw.appearance?.botanical, ['full', 'subtle', 'off'], 'full'),
      density: oneOf(raw.appearance?.density, ['comfortable', 'compact'], 'comfortable'),
    },
    a11y: {
      fontScale: oneOf(raw.a11y?.fontScale, [1, 1.125, 1.25], 1),
      motion: oneOf(raw.a11y?.motion, ['system', 'reduce', 'full'], 'system'),
    },
    calendar: {
      weekStart: oneOf(raw.calendar?.weekStart, [0, 1], 1),
      defaultView: oneOf(raw.calendar?.defaultView, ['month', 'week', 'day'], 'month'),
    },
  };
}
