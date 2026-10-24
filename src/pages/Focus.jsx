import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useTimer } from '../store/TimerContext.jsx';
import { useConfirm } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Icon } from '../components/Icon.jsx';
import { Lotus } from '../components/Lotus.jsx';
import { PageHeader, Card, EmptyState, Field, DemoBadge } from '../components/ui.jsx';
import { fmtClock, fmtMinutes, fmtTimestamp, toKey, fmtDate, todayKey } from '../lib/date.js';
import { navigate } from '../lib/router.js';

function takeSession(key) {
  try {
    const v = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return v;
  } catch {
    return null;
  }
}

export function TimerFace({ size = 300 }) {
  const { active, remainingMs, progress } = useTimer();
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <div className="timer-face" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="timer-track" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="timer-progress"
          fill="none"
          strokeDasharray={`${c * progress} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
        />
      </svg>
      <div className="timer-inner">
        <Lotus size={size * 0.34} water={false} breathing={active?.status === 'running'} />
        <p className="timer-digits" role="timer" aria-live="off">
          {active ? fmtClock(remainingMs) : '—'}
        </p>
        <p className="timer-state">{active ? (active.status === 'paused' ? 'Paused' : 'Focusing') : 'Ready when you are'}</p>
      </div>
    </div>
  );
}

function SetupForm() {
  const { data, prefs, actions } = useStore();
  const presets = prefs.timer.presets;
  const pendingContracts = data.contracts.filter((c) => c.status === 'pending');
  const openTasks = data.tasks.filter((t) => t.status !== 'done').sort((a, b) => a.order - b.order);

  const [initial] = useState(() => {
    const contractId = takeSession('vk:focus-contract');
    const taskId = takeSession('vk:focus-task');
    const c = data.contracts.find((x) => x.id === contractId && x.status === 'pending');
    return { contractId: c?.id || '', taskId: c?.taskId || (data.tasks.some((t) => t.id === taskId) ? taskId : ''), minutes: c?.minutes || prefs.timer.defaultMin };
  });
  const [minutes, setMinutes] = useState(String(initial.minutes));
  const [label, setLabel] = useState('');
  const [taskId, setTaskId] = useState(initial.taskId);
  const [contractId, setContractId] = useState(initial.contractId);
  const [error, setError] = useState('');

  const pickContract = (id) => {
    setContractId(id);
    const c = data.contracts.find((x) => x.id === id);
    if (c) {
      setMinutes(String(c.minutes));
      if (c.taskId) setTaskId(c.taskId);
    }
  };

  const start = (e) => {
    e.preventDefault();
    const m = Number(minutes);
    if (!Number.isFinite(m) || m < 1 || m > 600 || Math.round(m) !== m) {
      setError('Choose a whole number of minutes between 1 and 600.');
      return;
    }
    actions.startSession({ label, taskId: taskId || null, contractId: contractId || null, minutes: m });
  };

  return (
    <form className="setup" onSubmit={start} noValidate>
      <fieldset className="field">
        <legend className="field-label">Duration</legend>
        <div className="preset-row">
          {presets.map((p) => (
            <button key={p} type="button" className="preset" aria-pressed={Number(minutes) === p} onClick={() => (setMinutes(String(p)), setError(''))}>
              {p}
              <span>min</span>
            </button>
          ))}
          <div className="preset-custom">
            <label htmlFor="fs-min" className="visually-hidden">
              Custom minutes
            </label>
            <input
              id="fs-min"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              aria-invalid={!!error}
              onChange={(e) => (setMinutes(e.target.value), setError(''))}
            />
            <span className="muted">min</span>
          </div>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </fieldset>
      <Field label="Session label (optional)" htmlFor="fs-label">
        <input id="fs-label" className="input" maxLength={200} placeholder="e.g. Chemistry past paper" value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="setup-grid">
        <Field label="Link a task (optional)" htmlFor="fs-task">
          <select id="fs-task" className="select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">No task</option>
            {openTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Focus Contract (optional)" htmlFor="fs-contract" hint={pendingContracts.length ? undefined : 'Write one on the Focus Contracts page.'}>
          <select id="fs-contract" className="select" value={contractId} onChange={(e) => pickContract(e.target.value)} disabled={!pendingContracts.length}>
            <option value="">Without a contract</option>
            {pendingContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.intention}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button className="btn btn-primary btn-lg btn-lotus" type="submit">
        <Icon name="play" size={18} /> Start focus
      </button>
    </form>
  );
}

function ActiveControls() {
  const { actions } = useStore();
  const { active } = useTimer();
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <div className="active-panel">
      <p className="active-label">{active.label}</p>
      {active.taskTitle && (
        <p className="muted">
          <Icon name="tasks" size={14} /> {active.taskTitle}
        </p>
      )}
      <div className="timer-controls">
        {active.status === 'running' ? (
          <button className="btn btn-ghost btn-lg" onClick={actions.pauseSession}>
            <Icon name="pause" size={18} /> Pause
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={actions.resumeSession}>
            <Icon name="play" size={18} /> Resume
          </button>
        )}
        <button
          className="btn btn-text btn-lg"
          onClick={async () => {
            const ok = await confirm({
              title: 'End this session now?',
              message: 'The time you have focused so far will be saved. Sessions shorter than one minute are not recorded.',
              confirmLabel: 'End session',
            });
            if (!ok) return;
            const recorded = actions.stopSession();
            toast(recorded ? 'Session saved' : 'Under a minute, so it was not recorded');
          }}
        >
          <Icon name="stop" size={18} /> End
        </button>
      </div>
    </div>
  );
}

function CompletionPanel({ session }) {
  const { data, actions } = useStore();
  const [note, setNote] = useState(session.note || '');
  const [cNote, setCNote] = useState('');
  const contract = session.contractId ? data.contracts.find((c) => c.id === session.contractId) : null;
  const done = session.outcome === 'completed';
  const toast = useToast();

  return (
    <Card className="completion" title={done ? 'Session complete' : 'Session saved'} icon="lotus">
      <div className="completion-body">
        <Lotus size={110} bloom key={session.id} />
        <dl className="facts">
          <div>
            <dt>Planned</dt>
            <dd>{fmtMinutes(session.plannedSec / 60)}</dd>
          </div>
          <div>
            <dt>Focused</dt>
            <dd>{fmtMinutes(session.actualSec / 60)}</dd>
          </div>
          <div>
            <dt>Task</dt>
            <dd>{session.taskTitle || 'None'}</dd>
          </div>
        </dl>
      </div>
      <Field label="Note (optional)" htmlFor="cp-note">
        <textarea
          id="cp-note"
          className="textarea"
          rows={2}
          maxLength={2000}
          value={note}
          placeholder="What did you get done?"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== session.note && actions.updateSession(session.id, { note })}
        />
      </Field>
      {contract && contract.status === 'review' && (
        <div className="contract-review">
          <p className="field-label">Your intention: “{contract.intention}”</p>
          {contract.success && <p className="muted small">Success meant: {contract.success}</p>}
          <Field label="Reflection on the contract (optional)" htmlFor="cp-cnote">
            <input id="cp-cnote" className="input" maxLength={2000} value={cNote} onChange={(e) => setCNote(e.target.value)} />
          </Field>
          <div className="outcome-row" role="group" aria-label="Was the intention fulfilled?">
            {[
              ['fulfilled', 'Fulfilled'],
              ['partial', 'Partly'],
              ['not-fulfilled', 'Not this time'],
            ].map(([v, l]) => (
              <button
                key={v}
                className={`btn btn-ghost outcome-${v}`}
                onClick={() => {
                  actions.reviewContract(contract.id, v, cNote);
                  toast('Contract outcome saved');
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      {contract && contract.status !== 'review' && contract.status !== 'active' && (
        <p className="muted small">Contract outcome recorded: {{ fulfilled: 'fulfilled', partial: 'partly fulfilled', 'not-fulfilled': 'not this time' }[contract.status]}.</p>
      )}
      <div className="completion-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            if (note !== session.note) actions.updateSession(session.id, { note });
            actions.startSession({ label: session.label, taskId: session.taskId, minutes: session.plannedSec / 60 });
          }}
        >
          <Icon name="play" size={16} /> Start another {fmtMinutes(session.plannedSec / 60)}
        </button>
        <button
          className="btn btn-text"
          onClick={() => {
            if (note !== session.note) actions.updateSession(session.id, { note });
            actions.dismissFinished();
          }}
        >
          Done
        </button>
      </div>
    </Card>
  );
}

function History() {
  const { data, actions } = useStore();
  const confirm = useConfirm();
  const [limit, setLimit] = useState(20);
  const groups = useMemo(() => {
    const out = [];
    data.sessions.slice(0, limit).forEach((s) => {
      const k = toKey(s.startedAt);
      const g = out[out.length - 1];
      if (g && g.key === k) g.items.push(s);
      else out.push({ key: k, items: [s] });
    });
    return out;
  }, [data.sessions, limit]);

  if (!data.sessions.length) {
    return <EmptyState icon="clock" title="No sessions yet">Completed and ended sessions appear here as a timeline.</EmptyState>;
  }
  return (
    <div className="timeline">
      {groups.map((g) => (
        <section key={g.key} className="timeline-day">
          <h3 className="timeline-date">
            {g.key === todayKey() ? 'Today' : fmtDate(g.key, { weekday: 'long', month: 'short', day: 'numeric' })}
            <span className="muted"> · {fmtMinutes(g.items.reduce((a, s) => a + s.actualSec, 0) / 60)}</span>
          </h3>
          <ol className="list-reset">
            {g.items.map((s) => (
              <li key={s.id} className={`timeline-item ${s.outcome}`}>
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-content">
                  <p className="timeline-title">{s.label}</p>
                  <p className="timeline-meta">
                    {fmtTimestamp(s.startedAt)} · {fmtMinutes(s.actualSec / 60)} of {fmtMinutes(s.plannedSec / 60)}
                    {s.outcome === 'ended-early' ? ' · ended early' : ' · complete'}
                    {s.taskTitle && s.taskTitle !== s.label ? ` · ${s.taskTitle}` : ''}
                  </p>
                  {s.note && <p className="timeline-note">{s.note}</p>}
                </div>
                <button
                  className="btn-icon btn-sm"
                  aria-label={`Delete session “${s.label}”`}
                  onClick={async () => {
                    if (await confirm({ title: 'Delete this session?', message: 'It will be removed from your history and analytics.', confirmLabel: 'Delete', danger: true })) {
                      actions.deleteSession(s.id);
                    }
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {data.sessions.length > limit && (
        <button className="btn btn-text" onClick={() => setLimit((l) => l + 30)}>
          Show older sessions
        </button>
      )}
    </div>
  );
}

export default function Focus() {
  const { data } = useStore();
  const { active } = useTimer();
  const finished = !active && data.lastFinishedId ? data.sessions.find((s) => s.id === data.lastFinishedId) : null;

  return (
    <div className="page">
      <PageHeader title="Focus Sessions" eyebrow={<DemoBadge />}>
        <button className="btn btn-ghost" onClick={() => navigate('contracts')}>
          <Icon name="contract" size={18} /> Write a contract
        </button>
      </PageHeader>

      <div className="focus-layout">
        <Card className="focus-main" petal>
          <div className="focus-stage">
            <TimerFace />
            <div className="focus-side">{active ? <ActiveControls /> : finished ? null : <SetupForm />}</div>
          </div>
          {finished && <CompletionPanel session={finished} />}
          <p className="fine-print">
            <Icon name="info" size={14} /> The timer keeps time from timestamps, so it stays accurate when you switch sections or tabs, or reload. Browsers may pause
            background pages, so the display catches up when you return. If the browser is fully closed, the session is finalised the next time you open
            vaa kannamma. There are no alarms or notifications.
          </p>
        </Card>
        <Card title="Session history" icon="clock" className="focus-history">
          <History />
        </Card>
      </div>
    </div>
  );
}
