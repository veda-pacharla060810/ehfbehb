import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Icon } from '../components/Icon.jsx';
import { Lotus } from '../components/Lotus.jsx';
import { PageHeader, Card, Field, DemoBadge } from '../components/ui.jsx';
import { Meter } from '../components/Charts.jsx';
import { addDays, fmtDate, fmtMinutes, fromKey, startOfWeek, toKey } from '../lib/date.js';
import { weeklySummary, contractStats, sessionsBetween, focusMin } from '../lib/metrics.js';

const FIELDS = [
  ['wins', 'Wins of the week', 'What went well, however small?'],
  ['unfinished', 'Unfinished tasks', 'What is carrying over, and does it still matter?'],
  ['challenges', 'Challenges', 'What got in the way?'],
  ['adjustments', 'Possible adjustments', 'One or two things to try differently.'],
  ['nextGoals', 'Goals for next week', ''],
  ['importantTasks', 'Important tasks for the upcoming week', ''],
  ['notes', 'Personal notes and journaling', 'Anything else on your mind.'],
];

export default function WeeklyReview() {
  const { data, prefs, actions } = useStore();
  const toast = useToast();
  const ws = prefs.calendar.weekStart;
  const thisWeek = toKey(startOfWeek(new Date(), ws));
  const [week, setWeek] = useState(thisWeek);
  const saved = data.reviews[week];
  const blank = Object.fromEntries(FIELDS.map(([k]) => [k, '']));
  const [draft, setDraft] = useState({ ...blank, ...saved });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft({ ...blank, ...data.reviews[week] });
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

  const start = fromKey(week);
  const end = addDays(start, 7);
  const summary = useMemo(() => weeklySummary(data, week, prefs), [data, week, prefs]);
  const cs = contractStats(data.contracts, start, end);
  const lastKey = toKey(addDays(end, -1));
  const unfinished = data.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= lastKey).slice(0, 8);
  const upcoming = data.tasks
    .filter((t) => t.status !== 'done' && t.due && t.due > lastKey && t.due <= toKey(addDays(end, 6)))
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8);
  const prevFocus = focusMin(sessionsBetween(data.sessions, addDays(start, -7), start));
  const goal = prefs.goals.weeklyFocusMin;

  const save = (status) => {
    actions.saveReview(week, { ...draft, status });
    setDirty(false);
    toast(status === 'complete' ? 'Weekly review complete' : status === 'skipped' ? 'Week skipped. You can come back any time.' : 'Draft saved');
  };
  const status = saved?.status;
  const isFuture = week > thisWeek;

  return (
    <div className="page">
      <PageHeader title="Weekly Review" eyebrow={<DemoBadge />}>
        <div className="week-picker">
          <button className="btn-icon" aria-label="Previous week" onClick={() => setWeek(toKey(addDays(start, -7)))}>
            <Icon name="chevL" />
          </button>
          <span className="week-picker-label" aria-live="polite">
            {week === thisWeek ? 'This week' : `Week of ${fmtDate(week, { month: 'short', day: 'numeric' })}`}
            <span className="muted">
              {fmtDate(week, { month: 'short', day: 'numeric' })} – {fmtDate(toKey(addDays(start, 6)), { month: 'short', day: 'numeric' })}
            </span>
          </span>
          <button className="btn-icon" aria-label="Next week" onClick={() => setWeek(toKey(addDays(start, 7)))} disabled={isFuture}>
            <Icon name="chevR" />
          </button>
        </div>
      </PageHeader>

      <div className="review-layout">
        <div className="stack">
          <Card title="The week in numbers" icon="analytics">
            <div className="review-stats">
              <div className="mini-stat">
                <span className="mini-stat-value">{fmtMinutes(summary.focus)}</span>
                <span className="mini-stat-label">focus{prevFocus || summary.focus ? ` · prev. ${fmtMinutes(prevFocus)}` : ''}</span>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-value">{summary.sessions.length}</span>
                <span className="mini-stat-label">sessions</span>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-value">{summary.done.length}</span>
                <span className="mini-stat-label">tasks done</span>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-value">
                  {cs.fulfilled}/{cs.reviewed}
                </span>
                <span className="mini-stat-label">contracts fulfilled</span>
              </div>
            </div>
            {goal > 0 && (
              <div className="goal-row">
                <div className="goal-text">
                  <span>Weekly focus goal</span>
                  <span className="muted">
                    {fmtMinutes(summary.focus)} / {fmtMinutes(goal)}
                  </span>
                </div>
                <Meter value={summary.focus / goal} tone={summary.focus >= goal ? 'sage' : 'rose'} label="Weekly focus goal progress" />
              </div>
            )}
          </Card>
          <Card title="Summary" icon="review">
            <ul className="summary-lines">
              {summary.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <p className="muted small">Written from what was recorded in the app this week. Nothing is inferred.</p>
          </Card>
          <Card title="Still open from this week" icon="tasks">
            {unfinished.length ? (
              <ul className="plain-list">
                {unfinished.map((t) => (
                  <li key={t.id}>
                    {t.title} <span className="muted small">· due {fmtDate(t.due, { month: 'short', day: 'numeric' })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No open tasks were due by the end of this week.</p>
            )}
            <h3 className="sub-title">Due next week</h3>
            {upcoming.length ? (
              <ul className="plain-list">
                {upcoming.map((t) => (
                  <li key={t.id}>
                    {t.title} <span className="muted small">· {fmtDate(t.due)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nothing dated for next week yet.</p>
            )}
          </Card>
        </div>

        <Card className={`review-journal ${status === 'complete' ? 'is-complete' : ''}`} title="Reflection" icon="book">
          {status && (
            <p className={`review-status status-${status}`}>
              {status === 'complete' && (
                <>
                  <Lotus size={44} bloom water={false} /> Review complete
                </>
              )}
              {status === 'draft' && 'Draft saved. Come back to finish it whenever you like.'}
              {status === 'skipped' && 'You skipped this week. Fill it in any time if you change your mind.'}
            </p>
          )}
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              save('complete');
            }}
          >
            {FIELDS.map(([k, label, hint]) => (
              <Field key={k} label={label} htmlFor={`rv-${k}`} hint={hint || undefined}>
                <textarea
                  id={`rv-${k}`}
                  className="textarea journal"
                  rows={k === 'notes' ? 4 : 2}
                  maxLength={5000}
                  value={draft[k] || ''}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, [k]: e.target.value }));
                    setDirty(true);
                  }}
                />
              </Field>
            ))}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lotus">
                <Icon name="lotus" size={16} /> Complete review
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => save('draft')}>
                Save draft
              </button>
              <button type="button" className="btn btn-text" onClick={() => save('skipped')}>
                Skip this week
              </button>
              {dirty && <span className="muted small">Unsaved changes</span>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
