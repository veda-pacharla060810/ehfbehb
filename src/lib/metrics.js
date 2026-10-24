// All analytics are computed from recorded data only. Nothing here guesses
// about activity that was not logged in the app.
import { addDays, daysBetween, fmtMinutes, startOfDay, startOfWeek, toKey, fromKey } from './date.js';
import { sum } from './util.js';

export const focusMin = (sessions) => sum(sessions.map((s) => s.actualSec)) / 60;
export const plannedMin = (sessions) => sum(sessions.map((s) => s.plannedSec)) / 60;

export function sessionsBetween(sessions, from, to) {
  const a = +from;
  const b = +to;
  return sessions.filter((s) => s.startedAt >= a && s.startedAt < b);
}
export function completedBetween(tasks, from, to) {
  const a = +from;
  const b = +to;
  return tasks.filter((t) => t.status === 'done' && t.completedAt >= a && t.completedAt < b);
}

export function dayRange(date = new Date()) {
  const s = startOfDay(date);
  return [s, addDays(s, 1)];
}
export function weekRange(date, weekStart) {
  const s = startOfWeek(date, weekStart);
  return [s, addDays(s, 7)];
}

// Daily buckets for the last `n` days (oldest first).
export function dailySeries(data, n, end = new Date()) {
  const last = startOfDay(end);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(last, -i);
    const next = addDays(d, 1);
    const ss = sessionsBetween(data.sessions, d, next);
    out.push({
      key: toKey(d),
      date: d,
      focus: Math.round(focusMin(ss)),
      planned: Math.round(plannedMin(ss)),
      sessions: ss.length,
      completedSessions: ss.filter((s) => s.outcome === 'completed').length,
      tasks: completedBetween(data.tasks, d, next).length,
    });
  }
  return out;
}

// Weekly buckets for the last `n` weeks (oldest first).
export function weeklySeries(data, n, weekStart, end = new Date()) {
  const cur = startOfWeek(end, weekStart);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = addDays(cur, -7 * i);
    const e = addDays(s, 7);
    const ss = sessionsBetween(data.sessions, s, e);
    out.push({
      key: toKey(s),
      date: s,
      focus: Math.round(focusMin(ss)),
      planned: Math.round(plannedMin(ss)),
      sessions: ss.length,
      tasks: completedBetween(data.tasks, s, e).length,
    });
  }
  return out;
}

/*
 * Task completion rate for a period:
 *   completed in the period ÷ (completed in the period + open tasks that were due
 *   on or before the period's last day).
 * Undated open tasks are not counted against you. Deleted tasks are not counted at all.
 */
export function completionRate(tasks, from, to) {
  const done = completedBetween(tasks, from, to).length;
  const lastKey = toKey(addDays(to, -1));
  const open = tasks.filter((t) => t.status !== 'done' && t.due && t.due <= lastKey).length;
  const total = done + open;
  return { done, open, total, rate: total >= 3 ? done / total : null };
}

/*
 * Consistency score (last 7 days, including today):
 *   days with at least one session that reached its planned length ÷ 7.
 * Shown only once at least 3 sessions have been recorded overall.
 */
export function consistency(sessions, end = new Date()) {
  if (sessions.length < 3) return { score: null, days: 0 };
  const last = startOfDay(end);
  const keys = new Set();
  sessions.forEach((s) => {
    if (s.outcome !== 'completed') return;
    const diff = daysBetween(s.startedAt, last);
    if (diff >= 0 && diff < 7) keys.add(toKey(s.startedAt));
  });
  return { score: keys.size / 7, days: keys.size };
}

// Contract success from explicitly reviewed outcomes only.
export function contractStats(contracts, from = null, to = null) {
  const reviewed = contracts.filter(
    (c) => ['fulfilled', 'partial', 'not-fulfilled'].includes(c.status) && (!from || (c.reviewedAt >= +from && c.reviewedAt < +to)),
  );
  const fulfilled = reviewed.filter((c) => c.status === 'fulfilled').length;
  const partial = reviewed.filter((c) => c.status === 'partial').length;
  return {
    reviewed: reviewed.length,
    fulfilled,
    partial,
    notFulfilled: reviewed.length - fulfilled - partial,
    rate: reviewed.length >= 2 ? fulfilled / reviewed.length : null,
    awaiting: contracts.filter((c) => c.status === 'review').length,
  };
}

export function pct(v) {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

// Describes a change between two periods, or null when there is no basis for comparison.
export function compare(curr, prev, unit = 'min') {
  if (!prev && !curr) return null;
  if (!prev) return { text: 'nothing recorded in the previous period', dir: 'flat' };
  const diff = curr - prev;
  if (Math.abs(diff) < 1) return { text: 'about the same', dir: 'flat' };
  const label = unit === 'min' ? fmtMinutes(Math.abs(diff)) : `${Math.abs(Math.round(diff))}`;
  return { text: `${label} ${diff > 0 ? 'more' : 'less'}`, dir: diff > 0 ? 'up' : 'down' };
}

/*
 * Deterministic weekly summary sentences built from recorded data only.
 */
export function weeklySummary(data, weekStartKey, prefs) {
  const s = fromKey(weekStartKey);
  const e = addDays(s, 7);
  const ss = sessionsBetween(data.sessions, s, e);
  const done = completedBetween(data.tasks, s, e);
  const focus = Math.round(focusMin(ss));
  const lines = [];

  if (!ss.length && !done.length) {
    lines.push('No focus sessions or completed tasks were recorded this week.');
    return { lines, focus, done, sessions: ss };
  }
  const activeDays = new Set(ss.map((x) => toKey(x.startedAt))).size;
  if (ss.length) {
    lines.push(
      `You recorded ${fmtMinutes(focus)} of focus across ${ss.length} session${ss.length === 1 ? '' : 's'} on ${activeDays} day${activeDays === 1 ? '' : 's'}.`,
    );
  }
  if (done.length) lines.push(`${done.length} task${done.length === 1 ? ' was' : 's were'} completed.`);

  const goal = prefs.goals.weeklyFocusMin;
  if (goal > 0) {
    const ratio = focus / goal;
    lines.push(ratio >= 1 ? `The weekly focus goal of ${fmtMinutes(goal)} was reached.` : `That is ${Math.round(ratio * 100)}% of the weekly focus goal of ${fmtMinutes(goal)}.`);
  }
  const planned = plannedMin(ss);
  const early = ss.filter((x) => x.outcome === 'ended-early').length;
  if (ss.length >= 3 && planned > 0) {
    const ratio = focus / planned;
    if (early) lines.push(`${early} session${early === 1 ? '' : 's'} ended before the planned time; recorded focus was ${Math.round(ratio * 100)}% of what was planned.`);
    else lines.push('Every session ran for its full planned time.');
  }
  const cs = contractStats(data.contracts, s, e);
  if (cs.reviewed) {
    lines.push(`Focus Contracts reviewed: ${cs.fulfilled} fulfilled, ${cs.partial} partly, ${cs.notFulfilled} not this time.`);
  }
  const byDay = {};
  ss.forEach((x) => (byDay[toKey(x.startedAt)] = (byDay[toKey(x.startedAt)] || 0) + x.actualSec / 60));
  const top = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  if (top && activeDays > 1) {
    lines.push(`Most focus was recorded on ${fromKey(top[0]).toLocaleDateString(undefined, { weekday: 'long' })} (${fmtMinutes(top[1])}).`);
  }
  return { lines, focus, done, sessions: ss };
}
