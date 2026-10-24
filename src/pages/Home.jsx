import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useTimer } from '../store/TimerContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Lotus } from '../components/Lotus.jsx';
import { Card, EmptyState, LotusCheck, PriorityChip, useSortable } from '../components/ui.jsx';
import { LineChart, ProgressRing } from '../components/Charts.jsx';
import { QuickAdd, DueLabel } from './Tasks.jsx';
import { DASHBOARD_CARDS, EVENT_TYPES } from '../store/schema.js';
import { dailySeries, focusMin, sessionsBetween, completedBetween, dayRange, weekRange, completionRate, compare, pct } from '../lib/metrics.js';
import { daysBetween, fmtClock, fmtMinutes, fmtTime, fromKey, fmtDate, todayKey, addDays } from '../lib/date.js';
import { navigate } from '../lib/router.js';

const PRI = { high: 0, medium: 1, low: 2 };

function Priorities() {
  const { data, actions } = useStore();
  const t = todayKey();
  const list = data.tasks
    .filter((x) => x.status !== 'done' && ((x.due && x.due <= t) || x.priority === 'high' || x.status === 'doing'))
    .sort((a, b) => (a.due && a.due < t ? -1 : 0) - (b.due && b.due < t ? -1 : 0) || PRI[a.priority] - PRI[b.priority] || a.order - b.order)
    .slice(0, 5);
  const doneToday = data.tasks.filter((x) => x.status === 'done' && x.completedAt >= +dayRange()[0]).length;
  if (!list.length)
    return (
      <EmptyState title={data.tasks.length ? 'Nothing pressing today' : 'No priorities yet'}>
        {data.tasks.length ? 'Tasks due today, overdue tasks and high-priority tasks appear here.' : 'Add a task with a deadline or high priority and it will show up here.'}
      </EmptyState>
    );
  return (
    <>
      <ul className="list-reset prio-list">
        {list.map((x) => (
          <li key={x.id} className={`prio pri-${x.priority}`}>
            <LotusCheck checked={false} label={`Mark “${x.title}” done`} onChange={() => actions.toggleTask(x.id)} />
            <div className="prio-body">
              <span className="prio-title">{x.title}</span>
              <span className="task-meta">
                <PriorityChip priority={x.priority} />
                <DueLabel task={x} />
              </span>
            </div>
          </li>
        ))}
      </ul>
      {doneToday > 0 && <p className="muted small">{doneToday} completed today.</p>}
    </>
  );
}

function Progress() {
  const { data, prefs } = useStore();
  const [s, e] = dayRange();
  const focus = focusMin(sessionsBetween(data.sessions, s, e));
  const tasks = completedBetween(data.tasks, s, e).length;
  const g = prefs.goals;
  const rings = [];
  if (g.dailyFocusMin) rings.push({ value: focus / g.dailyFocusMin, tone: 'rose' });
  if (g.dailyTasks) rings.push({ value: tasks / g.dailyTasks, tone: 'sage' });
  if (!rings.length)
    return (
      <EmptyState icon="target" title="No daily goals set" action={<button className="btn btn-text btn-sm" onClick={() => navigate('preferences')}>Set goals</button>} />
    );
  return (
    <div className="progress-card">
      <ProgressRing rings={rings} size={148} label={`Today: ${fmtMinutes(focus)} of ${fmtMinutes(g.dailyFocusMin)} focus, ${tasks} of ${g.dailyTasks} tasks`}>
        <span className="ring-big">{g.dailyFocusMin ? `${Math.min(999, Math.round((focus / g.dailyFocusMin) * 100))}%` : tasks}</span>
        <span className="ring-small">{g.dailyFocusMin ? 'of focus goal' : 'tasks'}</span>
      </ProgressRing>
      <ul className="list-reset ring-legend">
        {g.dailyFocusMin > 0 && (
          <li>
            <span className="swatch swatch-rose" /> Focus <strong>{fmtMinutes(focus)}</strong> / {fmtMinutes(g.dailyFocusMin)}
          </li>
        )}
        {g.dailyTasks > 0 && (
          <li>
            <span className="swatch swatch-sage" /> Tasks <strong>{tasks}</strong> / {g.dailyTasks}
          </li>
        )}
      </ul>
    </div>
  );
}

function TimerCard() {
  const { prefs, actions } = useStore();
  const { active, remainingMs, progress } = useTimer();
  if (active)
    return (
      <div className="mini-timer">
        <p className="mini-timer-digits">{fmtClock(remainingMs)}</p>
        <div className="meter">
          <span className="meter-fill meter-rose" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="muted small">{active.label}</p>
        <div className="btn-wrap">
          {active.status === 'running' ? (
            <button className="btn btn-ghost btn-sm" onClick={actions.pauseSession}>
              <Icon name="pause" size={14} /> Pause
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={actions.resumeSession}>
              <Icon name="play" size={14} /> Resume
            </button>
          )}
          <button className="btn btn-text btn-sm" onClick={() => navigate('focus')}>
            Open timer
          </button>
        </div>
      </div>
    );
  return (
    <div className="mini-timer">
      <p className="muted small">Start a quiet session</p>
      <div className="preset-row">
        {prefs.timer.presets.map((p) => (
          <button key={p} className="preset preset-sm" onClick={() => actions.startSession({ minutes: p })}>
            {p}
            <span>min</span>
          </button>
        ))}
      </div>
      <button className="btn btn-text btn-sm" onClick={() => navigate('focus')}>
        Label, task or contract…
      </button>
    </div>
  );
}

function Schedule() {
  const { data } = useStore();
  const t = todayKey();
  const items = [
    ...data.events.filter((e) => e.date === t).map((e) => ({ id: e.id, time: e.time, title: e.title, icon: EVENT_TYPES[e.type].icon, kind: e.type, sub: EVENT_TYPES[e.type].label })),
    ...data.tasks.filter((x) => x.due === t).map((x) => ({ id: x.id, time: '', title: x.title, icon: 'tasks', kind: 'task', sub: x.status === 'done' ? 'Task · done' : 'Task due', done: x.status === 'done' })),
  ].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  return (
    <>
      <p className="schedule-date">{fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      {items.length ? (
        <ul className="list-reset schedule">
          {items.map((it) => (
            <li key={it.id} className={`schedule-item cal-${it.kind} ${it.done ? 'is-done' : ''}`}>
              <span className="schedule-time">{it.time ? fmtTime(it.time) : it.kind === 'task' ? 'Due' : 'All day'}</span>
              <Icon name={it.icon} size={16} />
              <span className="schedule-body">
                <span>{it.title}</span>
                <span className="muted small">{it.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="calendar" title="A clear day" action={<button className="btn btn-text btn-sm" onClick={() => navigate('calendar')}>Open calendar</button>} />
      )}
    </>
  );
}

function FocusSummary() {
  const { data, prefs } = useStore();
  const [ds, de] = dayRange();
  const [ys, ye] = dayRange(addDays(new Date(), -1));
  const [ws, we] = weekRange(new Date(), prefs.calendar.weekStart);
  const today = focusMin(sessionsBetween(data.sessions, ds, de));
  const yest = focusMin(sessionsBetween(data.sessions, ys, ye));
  const week = focusMin(sessionsBetween(data.sessions, ws, we));
  const cmp = compare(Math.round(today), Math.round(yest));
  if (!data.sessions.length) return <EmptyState icon="timer" title="No focus recorded yet">Your first session will show up here.</EmptyState>;
  return (
    <div className="pair">
      <div className="mini-stat">
        <span className="mini-stat-value">{fmtMinutes(today)}</span>
        <span className="mini-stat-label">today{cmp ? ` · ${cmp.text} than yesterday` : ''}</span>
      </div>
      <div className="mini-stat">
        <span className="mini-stat-value">{fmtMinutes(week)}</span>
        <span className="mini-stat-label">this week{prefs.goals.weeklyFocusMin ? ` · goal ${fmtMinutes(prefs.goals.weeklyFocusMin)}` : ''}</span>
      </div>
    </div>
  );
}

function TaskSummary() {
  const { data, prefs } = useStore();
  const [ds, de] = dayRange();
  const [ws, we] = weekRange(new Date(), prefs.calendar.weekStart);
  const today = completedBetween(data.tasks, ds, de).length;
  const week = completedBetween(data.tasks, ws, we).length;
  const rate = completionRate(data.tasks, ws, we);
  if (!data.tasks.length) return <EmptyState icon="tasks" title="No tasks yet" />;
  return (
    <div className="pair">
      <div className="mini-stat">
        <span className="mini-stat-value">{today}</span>
        <span className="mini-stat-label">done today</span>
      </div>
      <div className="mini-stat">
        <span className="mini-stat-value">{week}</span>
        <span className="mini-stat-label">done this week</span>
      </div>
      <div className="mini-stat">
        <span className="mini-stat-value">{pct(rate.rate)}</span>
        <span className="mini-stat-label">{rate.rate == null ? 'rate needs 3+ tasks' : 'weekly completion'}</span>
      </div>
    </div>
  );
}

function ExamCountdown() {
  const { data } = useStore();
  const t = todayKey();
  const exams = data.events.filter((e) => e.type === 'exam' && e.date >= t).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = exams[0];
  if (!next) return <EmptyState icon="exam" title="No upcoming exams" action={<button className="btn btn-text btn-sm" onClick={() => navigate('calendar')}>Add an exam</button>} />;
  const n = daysBetween(new Date(), fromKey(next.date));
  return (
    <div className="exam-card">
      <p className="exam-num">
        {n === 0 ? 'Today' : n}
        {n > 0 && <span>{n === 1 ? 'day' : 'days'}</span>}
      </p>
      <div>
        <p className="strong">{next.title}</p>
        <p className="muted small">
          {[next.subject, next.topic].filter(Boolean).join(' · ')}
          <br />
          {fmtDate(next.date, { weekday: 'long', month: 'short', day: 'numeric' })}
          {next.time ? ` · ${fmtTime(next.time)}` : ''}
        </p>
        {exams.length > 1 && <p className="muted small">Then: {exams[1].title}, {fmtDate(exams[1].date, { month: 'short', day: 'numeric' })}</p>}
      </div>
    </div>
  );
}

function WeeklyChart() {
  const { data } = useStore();
  const series = useMemo(() => dailySeries(data, 7), [data]);
  if (!data.sessions.length) return <EmptyState icon="analytics" title="Your week will draw itself here" />;
  return (
    <LineChart
      compact
      height={130}
      labels={series.map((d) => d.date.toLocaleDateString(undefined, { weekday: 'narrow' }))}
      tooltipLabels={series.map((d) => fmtDate(d.key, { weekday: 'long', month: 'short', day: 'numeric' }))}
      ariaLabel="Focus minutes over the last 7 days"
      series={[{ name: 'Focus', values: series.map((d) => d.focus), tone: 'rose', area: true }]}
      yFormat={(v) => fmtMinutes(v)}
    />
  );
}

function ContinueSession() {
  const { data, actions } = useStore();
  const { active, remainingMs } = useTimer();
  const last = data.lastFinishedId ? data.sessions.find((s) => s.id === data.lastFinishedId) : null;
  if (active)
    return (
      <div className="continue">
        <Lotus size={56} water={false} breathing={active.status === 'running'} />
        <div>
          <p className="strong">{active.label}</p>
          <p className="muted small">
            {active.status === 'paused' ? 'Paused' : 'Running'} · {fmtClock(remainingMs)} left
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('focus')}>
            Continue
          </button>
        </div>
      </div>
    );
  if (last)
    return (
      <div className="continue">
        <Lotus size={56} water={false} />
        <div>
          <p className="strong">Last session {last.outcome === 'completed' ? 'complete' : 'saved'}</p>
          <p className="muted small">
            {last.label} · {fmtMinutes(last.actualSec / 60)}
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => actions.startSession({ label: last.label, taskId: last.taskId, minutes: last.plannedSec / 60 })}>
            <Icon name="play" size={14} /> Go again
          </button>
        </div>
      </div>
    );
  return <EmptyState icon="timer" title="No session in progress" />;
}

function DemoControl() {
  const { mode, setMode } = useStore();
  return (
    <div className="stack-sm">
      <p className="muted small">
        {mode === 'demo' ? 'You are looking at sample records. Your own data is safe and unchanged.' : 'Preview vaa kannamma with clearly labelled sample data. Your records are kept separately.'}
      </p>
      <button className={`btn btn-sm ${mode === 'demo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(mode === 'demo' ? 'personal' : 'demo')}>
        <Icon name="sparkle" size={14} /> {mode === 'demo' ? 'Back to my data' : 'View sample data'}
      </button>
    </div>
  );
}

const CARD_VIEWS = {
  priorities: { C: Priorities, icon: 'flag', link: 'tasks', wide: true },
  progress: { C: Progress, icon: 'target' },
  timer: { C: TimerCard, icon: 'timer', link: 'focus' },
  schedule: { C: Schedule, icon: 'calendar', link: 'calendar' },
  focusSummary: { C: FocusSummary, icon: 'clock', link: 'analytics' },
  taskSummary: { C: TaskSummary, icon: 'tasks', link: 'analytics' },
  exam: { C: ExamCountdown, icon: 'exam', link: 'calendar' },
  weeklyChart: { C: WeeklyChart, icon: 'analytics', link: 'analytics', wide: true },
  quickAdd: { C: () => <QuickAdd compact />, icon: 'plus' },
  continue: { C: ContinueSession, icon: 'lotus' },
  demo: { C: DemoControl, icon: 'sparkle' },
};

export default function Home() {
  const { prefs, setPrefs } = useStore();
  const [editing, setEditing] = useState(false);
  const hidden = new Set(prefs.dashboard.hidden);
  const visible = prefs.dashboard.order.filter((id) => (editing ? true : !hidden.has(id)));
  const reorder = (ids) =>
    setPrefs((p) => {
      // Merge the visible order back into the full order.
      const rest = p.dashboard.order.filter((id) => !ids.includes(id));
      return { ...p, dashboard: { ...p.dashboard, order: [...ids, ...rest] } };
    });
  const { containerRef, displayIds, draggingId, handleProps } = useSortable(visible, reorder);
  const toggleHidden = (id) =>
    setPrefs((p) => ({ ...p, dashboard: { ...p.dashboard, hidden: p.dashboard.hidden.includes(id) ? p.dashboard.hidden.filter((x) => x !== id) : [...p.dashboard.hidden, id] } }));

  return (
    <div className="page page-home">
      <header className="greeting">
        <Lotus size={112} bloom className="greeting-lotus" />
        <h1 className="greeting-text" tabIndex={-1} data-page-title>
          vaa kannamma
        </h1>
      </header>

      <div className="dash-bar">
        <button className={`btn btn-sm ${editing ? 'btn-primary' : 'btn-text'}`} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          <Icon name={editing ? 'check' : 'settings'} size={16} /> {editing ? 'Done customizing' : 'Customize'}
        </button>
        {editing && <span className="muted small">Drag cards by the handle, or focus a handle and use arrow keys. Use the eye to show or hide.</span>}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState title="All cards are hidden" action={<button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Customize dashboard</button>} />
        </Card>
      ) : (
        <div className={`dash ${editing ? 'is-editing' : ''}`} ref={containerRef}>
          {displayIds.map((id) => {
            const v = CARD_VIEWS[id];
            const meta = DASHBOARD_CARDS.find((c) => c.id === id);
            if (!v || !meta) return null;
            const isHidden = hidden.has(id);
            return (
              <Card
                key={id}
                data-sort-id={id}
                className={`dash-card ${v.wide ? 'is-wide' : ''} ${draggingId === id ? 'is-dragging' : ''} ${isHidden ? 'is-hidden-card' : ''}`}
                title={meta.label}
                icon={v.icon}
                actions={
                  editing ? (
                    <>
                      <button className="btn-icon btn-sm" aria-label={`${isHidden ? 'Show' : 'Hide'} ${meta.label}`} aria-pressed={!isHidden} onClick={() => toggleHidden(id)}>
                        <Icon name={isHidden ? 'eyeOff' : 'eye'} size={16} />
                      </button>
                      <button {...handleProps(id, meta.label)}>
                        <Icon name="grip" size={18} />
                      </button>
                    </>
                  ) : v.link ? (
                    <button className="btn-icon btn-sm" aria-label={`Open ${meta.label}`} onClick={() => navigate(v.link)}>
                      <Icon name="chevR" size={16} />
                    </button>
                  ) : null
                }
              >
                <div className="dash-body" inert={editing ? '' : undefined}>
                  <v.C />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
