import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { PageHeader, Card, EmptyState, Segmented, DemoBadge } from '../components/ui.jsx';
import { LineChart, Legend, Meter } from '../components/Charts.jsx';
import { ExportDialog } from '../components/ExportDialog.jsx';
import {
  dailySeries,
  weeklySeries,
  focusMin,
  plannedMin,
  sessionsBetween,
  completedBetween,
  completionRate,
  consistency,
  contractStats,
  pct,
  compare,
  dayRange,
  weekRange,
  weeklySummary,
} from '../lib/metrics.js';
import { addDays, fmtMinutes, startOfDay, toKey, fmtDate, startOfWeek } from '../lib/date.js';
import { toCSV } from '../lib/util.js';
import { navigate } from '../lib/router.js';

function Stat({ label, value, sub, dir, icon }) {
  return (
    <div className="stat">
      <p className="stat-label">
        {icon && <Icon name={icon} size={15} />}
        {label}
      </p>
      <p className="stat-value">{value}</p>
      {sub && (
        <p className={`stat-sub ${dir ? `dir-${dir}` : ''}`}>
          {dir === 'up' && <Icon name="chevU" size={13} />}
          {dir === 'down' && <Icon name="chevD" size={13} />}
          {sub}
        </p>
      )}
    </div>
  );
}

function GoalRow({ label, value, target, unit }) {
  const fmt = (v) => (unit === 'min' ? fmtMinutes(v) : `${Math.round(v)}`);
  if (!target) return null;
  return (
    <div className="goal-row">
      <div className="goal-text">
        <span>{label}</span>
        <span className="muted">
          {fmt(value)} / {fmt(target)} {unit === 'tasks' ? 'tasks' : ''}
        </span>
      </div>
      <Meter value={value / target} tone={value >= target ? 'sage' : 'rose'} label={`${label}: ${Math.round((value / target) * 100)}%`} />
    </div>
  );
}

export default function Analytics() {
  const { data, prefs } = useStore();
  const [range, setRange] = useState('7');
  const [exporting, setExporting] = useState(null);
  const ws = prefs.calendar.weekStart;
  const now = new Date();

  const m = useMemo(() => {
    const days = Number(range);
    const weekly = range === '84';
    const series = weekly ? weeklySeries(data, 12, ws) : dailySeries(data, days);
    const end = addDays(startOfDay(now), 1);
    const start = weekly ? startOfWeek(addDays(now, -77), ws) : addDays(end, -days);
    const prevStart = addDays(start, -(weekly ? 84 : days));
    const ss = sessionsBetween(data.sessions, start, end);
    const prevSS = sessionsBetween(data.sessions, prevStart, start);
    const [ds, de] = dayRange(now);
    const [ys, ye] = dayRange(addDays(now, -1));
    const [wks, wke] = weekRange(now, ws);
    const [lws, lwe] = [addDays(wks, -7), wks];
    return {
      series,
      weekly,
      focus: focusMin(ss),
      planned: plannedMin(ss),
      prevFocus: focusMin(prevSS),
      sessionsCount: ss.length,
      early: ss.filter((s) => s.outcome === 'ended-early').length,
      completion: completionRate(data.tasks, start, end),
      tasksDone: completedBetween(data.tasks, start, end).length,
      prevTasksDone: completedBetween(data.tasks, prevStart, start).length,
      consistency: consistency(data.sessions),
      contracts: contractStats(data.contracts, start, end),
      today: focusMin(sessionsBetween(data.sessions, ds, de)),
      yesterday: focusMin(sessionsBetween(data.sessions, ys, ye)),
      week: focusMin(sessionsBetween(data.sessions, wks, wke)),
      lastWeek: focusMin(sessionsBetween(data.sessions, lws, lwe)),
      todayTasks: completedBetween(data.tasks, ds, de).length,
      yesterdayTasks: completedBetween(data.tasks, ys, ye).length,
      weekTasks: completedBetween(data.tasks, wks, wke).length,
      lastWeekTasks: completedBetween(data.tasks, lws, lwe).length,
      summary: weeklySummary(data, toKey(wks), prefs),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, range, ws, prefs]);

  const labels = m.series.map((d) =>
    m.weekly ? d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : Number(range) <= 7 ? d.date.toLocaleDateString(undefined, { weekday: 'short' }) : d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  );
  const tipLabels = m.series.map((d) => (m.weekly ? `Week of ${fmtDate(d.key, { month: 'short', day: 'numeric' })}` : fmtDate(d.key, { weekday: 'long', month: 'short', day: 'numeric' })));
  const hasData = data.sessions.length > 0 || data.tasks.some((t) => t.status === 'done');
  const focusCmp = compare(Math.round(m.focus), Math.round(m.prevFocus));
  const taskCmp = compare(m.tasksDone, m.prevTasksDone, 'count');
  const periodName = m.weekly ? 'previous 12 weeks' : `previous ${range} days`;

  const csvSessions = () =>
    toCSV([
      ['date', 'start_time', 'label', 'task', 'planned_minutes', 'actual_minutes', 'outcome', 'note'],
      ...data.sessions.map((s) => [toKey(s.startedAt), new Date(s.startedAt).toTimeString().slice(0, 5), s.label, s.taskTitle, Math.round(s.plannedSec / 60), Math.round(s.actualSec / 6) / 10, s.outcome, s.note]),
    ]);
  const csvDaily = () =>
    toCSV([
      ['date', 'focus_minutes', 'planned_minutes', 'sessions', 'tasks_completed'],
      ...dailySeries(data, 90).map((d) => [d.key, d.focus, d.planned, d.sessions, d.tasks]),
    ]);

  return (
    <div className="page">
      <PageHeader title="Analytics" eyebrow={<DemoBadge />}>
        <Segmented
          size="sm"
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 days' },
            { value: '28', label: '4 weeks' },
            { value: '84', label: '12 weeks' },
          ]}
        />
      </PageHeader>

      {!hasData ? (
        <Card>
          <EmptyState icon="analytics" title="Nothing to analyse yet" action={<button className="btn btn-primary" onClick={() => navigate('focus')}>Start a focus session</button>}>
            Analytics are calculated only from sessions and tasks you record here. Once you finish a session or complete a task, figures will appear.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="stats-row">
            <Stat icon="timer" label="Focus time" value={fmtMinutes(m.focus)} sub={focusCmp ? `${focusCmp.text} than the ${periodName}` : null} dir={focusCmp?.dir} />
            <Stat
              icon="tasks"
              label="Task completion"
              value={pct(m.completion.rate)}
              sub={m.completion.rate == null ? 'Needs at least 3 dated or completed tasks' : `${m.completion.done} of ${m.completion.total} eligible tasks`}
            />
            <Stat icon="lotus" label="Consistency (7 days)" value={pct(m.consistency.score)} sub={m.consistency.score == null ? 'Needs at least 3 sessions' : `${m.consistency.days} of 7 days with a full session`} />
            <Stat
              icon="contract"
              label="Contracts fulfilled"
              value={pct(m.contracts.rate)}
              sub={m.contracts.reviewed ? `${m.contracts.fulfilled} of ${m.contracts.reviewed} reviewed` : 'No reviewed contracts in this range'}
            />
          </div>

          <div className="analytics-grid">
            <Card title="Focus: planned and actual" icon="analytics" className="span-2">
              <Legend
                items={[
                  { name: 'Actual focus', tone: 'rose' },
                  { name: 'Planned', tone: 'mauve', dashed: true },
                ]}
              />
              <LineChart
                labels={labels}
                tooltipLabels={tipLabels}
                ariaLabel={`Focus minutes per ${m.weekly ? 'week' : 'day'}, actual and planned`}
                series={[
                  { name: 'Actual focus', values: m.series.map((d) => d.focus), tone: 'rose', area: true },
                  { name: 'Planned', values: m.series.map((d) => d.planned), tone: 'mauve', dashed: true },
                ]}
                yFormat={(v) => fmtMinutes(v)}
              />
              <p className="muted small">
                {m.sessionsCount
                  ? `${m.sessionsCount} sessions recorded. Actual focus was ${m.planned ? Math.round((m.focus / m.planned) * 100) : 0}% of planned time${m.early ? `; ${m.early} ended early` : ''}.`
                  : 'No sessions in this range.'}
              </p>
            </Card>

            <Card title="Tasks completed" icon="tasks">
              <LineChart
                labels={labels}
                tooltipLabels={tipLabels}
                ariaLabel={`Tasks completed per ${m.weekly ? 'week' : 'day'}`}
                height={200}
                integer
                series={[{ name: 'Completed', values: m.series.map((d) => d.tasks), tone: 'sage', area: true }]}
                yFormat={(v) => String(Math.round(v))}
              />
              <p className={`muted small`}>{taskCmp ? `${m.tasksDone} completed, ${taskCmp.text} than the ${periodName}.` : `${m.tasksDone} completed.`}</p>
            </Card>

            <Card title="Goals" icon="target">
              <div className="stack-sm">
                <GoalRow label="Focus today" value={m.today} target={prefs.goals.dailyFocusMin} unit="min" />
                <GoalRow label="Focus this week" value={m.week} target={prefs.goals.weeklyFocusMin} unit="min" />
                <GoalRow label="Tasks today" value={m.todayTasks} target={prefs.goals.dailyTasks} unit="tasks" />
                <GoalRow label="Tasks this week" value={m.weekTasks} target={prefs.goals.weeklyTasks} unit="tasks" />
              </div>
              <button className="btn btn-text btn-sm" onClick={() => navigate('preferences')}>
                Adjust goals
              </button>
            </Card>

            <Card title="Comparisons" icon="analytics">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="visually-hidden">Measure</span>
                    </th>
                    <th scope="col">Now</th>
                    <th scope="col">Before</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Focus: today vs yesterday</th>
                    <td>{fmtMinutes(m.today)}</td>
                    <td>{m.yesterday || m.today ? fmtMinutes(m.yesterday) : '—'}</td>
                  </tr>
                  <tr>
                    <th scope="row">Focus: this week vs last</th>
                    <td>{fmtMinutes(m.week)}</td>
                    <td>{m.lastWeek || m.week ? fmtMinutes(m.lastWeek) : '—'}</td>
                  </tr>
                  <tr>
                    <th scope="row">Tasks: today vs yesterday</th>
                    <td>{m.todayTasks}</td>
                    <td>{m.yesterdayTasks}</td>
                  </tr>
                  <tr>
                    <th scope="row">Tasks: this week vs last</th>
                    <td>{m.weekTasks}</td>
                    <td>{m.lastWeekTasks}</td>
                  </tr>
                </tbody>
              </table>
              <p className="muted small">Week-to-date figures compare a partial week with a full one.</p>
            </Card>

            <Card title="Contract outcomes" icon="contract">
              {m.contracts.reviewed ? (
                <>
                  <div className="outcome-bars">
                    {[
                      ['Fulfilled', m.contracts.fulfilled, 'sage'],
                      ['Partly', m.contracts.partial, 'mauve'],
                      ['Not this time', m.contracts.notFulfilled, 'silver'],
                    ].map(([l, v, tone]) => (
                      <div key={l} className="goal-row">
                        <div className="goal-text">
                          <span>{l}</span>
                          <span className="muted">{v}</span>
                        </div>
                        <Meter value={v / m.contracts.reviewed} tone={tone} label={`${l}: ${v}`} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted">No contracts were reviewed in this range.</p>
              )}
              {m.contracts.awaiting > 0 && (
                <button className="btn btn-text btn-sm" onClick={() => navigate('contracts')}>
                  {m.contracts.awaiting} waiting for a review
                </button>
              )}
            </Card>

            <Card title="This week in brief" icon="review" className="span-all">
              <ul className="summary-lines">
                {m.summary.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
              <button className="btn btn-text btn-sm" onClick={() => navigate('review')}>
                Open weekly review
              </button>
            </Card>
          </div>

          <details className="card explain">
            <summary>How these numbers are calculated</summary>
            <dl>
              <dt>Focus time</dt>
              <dd>The sum of time you actually spent in sessions started with the timer here. Paused time is not counted. Nothing outside this app is measured.</dd>
              <dt>Task completion</dt>
              <dd>Tasks completed in the range ÷ (those tasks + open tasks that were due by the end of the range). Undated open tasks are not held against you. Deleted tasks are not counted. Shown once there are at least 3 eligible tasks.</dd>
              <dt>Consistency</dt>
              <dd>The number of days in the last 7 (including today) with at least one session that ran for its full planned length, divided by 7.</dd>
              <dt>Planned vs actual</dt>
              <dd>Planned is the length you chose when starting each session; actual is the focused time recorded before it finished or you ended it.</dd>
              <dt>Contracts fulfilled</dt>
              <dd>Only outcomes you marked yourself count. A contract is never marked fulfilled just because the timer finished. Shown once at least 2 contracts are reviewed.</dd>
            </dl>
          </details>

          <div className="export-row">
            <button className="btn btn-ghost btn-sm" onClick={() => setExporting('sessions')}>
              <Icon name="download" size={16} /> Sessions CSV
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setExporting('daily')}>
              <Icon name="download" size={16} /> Daily totals CSV (90 days)
            </button>
          </div>
        </>
      )}

      <ExportDialog
        open={!!exporting}
        onClose={() => setExporting(null)}
        title="Export as CSV"
        type="text/csv"
        filename={exporting === 'daily' ? 'vaa-kannamma-daily.csv' : 'vaa-kannamma-sessions.csv'}
        text={exporting === 'daily' ? csvDaily() : exporting === 'sessions' ? csvSessions() : ''}
      />
    </div>
  );
}
