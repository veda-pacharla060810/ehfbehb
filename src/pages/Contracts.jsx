import React, { useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useTimer } from '../store/TimerContext.jsx';
import { useConfirm } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Icon } from '../components/Icon.jsx';
import { PageHeader, Card, EmptyState, Field, DemoBadge } from '../components/ui.jsx';
import { contractStats, pct } from '../lib/metrics.js';
import { fmtMinutes } from '../lib/date.js';
import { navigate } from '../lib/router.js';

const OUTCOME = {
  fulfilled: { label: 'Fulfilled', icon: 'check' },
  partial: { label: 'Partly fulfilled', icon: 'target' },
  'not-fulfilled': { label: 'Not this time', icon: 'leaf' },
};

function ContractForm() {
  const { data, actions } = useStore();
  const { active } = useTimer();
  const toast = useToast();
  const openTasks = data.tasks.filter((t) => t.status !== 'done');
  const [intention, setIntention] = useState('');
  const [taskId, setTaskId] = useState('');
  const [customTask, setCustomTask] = useState('');
  const [minutes, setMinutes] = useState('45');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  const submit = (startNow) => (e) => {
    e?.preventDefault();
    const errs = {};
    if (!intention.trim()) errs.intention = 'Write what you intend to do.';
    const m = Number(minutes);
    if (!Number.isFinite(m) || m < 1 || m > 600 || Math.round(m) !== m) errs.minutes = 'Use whole minutes between 1 and 600.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const c = actions.addContract({ intention, taskId: taskId || null, customTask, minutes: m, success });
    setIntention('');
    setSuccess('');
    setCustomTask('');
    if (startNow) {
      actions.startSession({ contractId: c.id, taskId: c.taskId, minutes: c.minutes });
      navigate('focus');
    } else {
      toast('Contract saved for later');
    }
  };

  return (
    <form className="contract-form" onSubmit={submit(false)} noValidate>
      <Field label="Intention" htmlFor="cf-int" error={errors.intention} hint="Be specific: what will exist when you are done?">
        <textarea id="cf-int" className="textarea" rows={2} maxLength={400} value={intention} aria-invalid={!!errors.intention} onChange={(e) => setIntention(e.target.value)} placeholder="Finish the summary sheet for carbonyl reactions" />
      </Field>
      <div className="setup-grid">
        <Field label="Task" htmlFor="cf-task">
          <select id="cf-task" className="select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Custom (type below)</option>
            {openTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time commitment (minutes)" htmlFor="cf-min" error={errors.minutes}>
          <input id="cf-min" className="input" type="number" min={1} max={600} value={minutes} aria-invalid={!!errors.minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
      </div>
      {!taskId && (
        <Field label="Custom task (optional)" htmlFor="cf-custom">
          <input id="cf-custom" className="input" maxLength={300} value={customTask} onChange={(e) => setCustomTask(e.target.value)} placeholder="e.g. Deep work block" />
        </Field>
      )}
      <Field label="Success looks like (optional)" htmlFor="cf-succ">
        <input id="cf-succ" className="input" maxLength={600} value={success} onChange={(e) => setSuccess(e.target.value)} placeholder="All six questions attempted and marked" />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-lotus" onClick={submit(true)} disabled={!!active} title={active ? 'A session is already running' : undefined}>
          <Icon name="play" size={16} /> Save and start session
        </button>
        <button type="submit" className="btn btn-ghost">
          Save for later
        </button>
      </div>
      {active && <p className="muted small">A session is already running. Save this contract and start it afterwards.</p>}
    </form>
  );
}

function ReviewInline({ contract }) {
  const { actions } = useStore();
  const [note, setNote] = useState('');
  return (
    <div className="contract-review">
      <label className="field-label" htmlFor={`rv-${contract.id}`}>
        How did it go? (optional note)
      </label>
      <input id={`rv-${contract.id}`} className="input" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="outcome-row" role="group" aria-label="Was the intention fulfilled?">
        {Object.entries(OUTCOME).map(([v, o]) => (
          <button key={v} className={`btn btn-ghost btn-sm outcome-${v}`} onClick={() => actions.reviewContract(contract.id, v, note)}>
            <Icon name={o.icon} size={14} /> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ContractItem({ c }) {
  const { data, actions } = useStore();
  const { active } = useTimer();
  const confirm = useConfirm();
  const task = data.tasks.find((t) => t.id === c.taskId);
  const session = data.sessions.find((s) => s.id === c.sessionId);
  const o = OUTCOME[c.status];
  return (
    <li className={`contract status-${c.status}`}>
      <div className="contract-head">
        <p className="contract-intent">{c.intention}</p>
        {o && (
          <span className={`chip outcome-chip outcome-${c.status}`}>
            <Icon name={o.icon} size={13} /> {o.label}
          </span>
        )}
        {c.status === 'active' && <span className="chip chip-doing">In session</span>}
      </div>
      <p className="contract-meta">
        {fmtMinutes(c.minutes)} · {task ? task.title : c.customTask || 'No task linked'}
        {session ? ` · focused ${fmtMinutes(session.actualSec / 60)}` : ''}
      </p>
      {c.success && <p className="contract-success">Success: {c.success}</p>}
      {c.note && <p className="contract-note">“{c.note}”</p>}
      {c.status === 'review' && <ReviewInline contract={c} />}
      <div className="contract-actions">
        {c.status === 'pending' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={!!active}
            onClick={() => {
              actions.startSession({ contractId: c.id, taskId: c.taskId, minutes: c.minutes });
              navigate('focus');
            }}
          >
            <Icon name="play" size={14} /> Start session
          </button>
        )}
        {c.status === 'active' && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('focus')}>
            Go to timer
          </button>
        )}
        {c.status !== 'active' && (
          <button
            className="btn btn-text btn-sm"
            onClick={async () => {
              if (await confirm({ title: 'Delete this contract?', message: 'Its outcome will no longer count in Analytics.', confirmLabel: 'Delete', danger: true })) actions.deleteContract(c.id);
            }}
          >
            <Icon name="trash" size={14} /> Delete
          </button>
        )}
      </div>
    </li>
  );
}

export default function Contracts() {
  const { data } = useStore();
  const stats = contractStats(data.contracts);
  const pending = data.contracts.filter((c) => ['pending', 'active', 'review'].includes(c.status));
  const history = data.contracts.filter((c) => OUTCOME[c.status]).sort((a, b) => (b.reviewedAt || 0) - (a.reviewedAt || 0));

  return (
    <div className="page">
      <PageHeader title="Focus Contracts" eyebrow={<DemoBadge />} />
      <p className="lede">Set an intention before you begin. Afterwards, note honestly how it went. Unfinished intentions are useful information, nothing more.</p>
      <div className="contracts-layout">
        <Card title="New contract" icon="contract">
          <ContractForm />
        </Card>
        <div className="stack">
          <Card title="Waiting for you" icon="clock">
            {pending.length ? (
              <ul className="list-reset contract-list">
                {pending.map((c) => (
                  <ContractItem key={c.id} c={c} />
                ))}
              </ul>
            ) : (
              <EmptyState title="No open contracts">Contracts you save for later, or that need a review after a session, show up here.</EmptyState>
            )}
          </Card>
          <Card title="Outcomes" icon="target">
            {stats.reviewed ? (
              <div className="contract-stats">
                <div className="mini-stat">
                  <span className="mini-stat-value">{pct(stats.rate)}</span>
                  <span className="mini-stat-label">fulfilled{stats.rate == null ? ' (needs 2+ reviews)' : ''}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat-value">{stats.fulfilled}</span>
                  <span className="mini-stat-label">fulfilled</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat-value">{stats.partial}</span>
                  <span className="mini-stat-label">partly</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat-value">{stats.notFulfilled}</span>
                  <span className="mini-stat-label">not this time</span>
                </div>
              </div>
            ) : (
              <p className="muted">Outcomes appear once you review a contract. A finished timer never marks a contract fulfilled on its own.</p>
            )}
          </Card>
        </div>
      </div>
      <Card title="Contract history" icon="book">
        {history.length ? (
          <ul className="list-reset contract-list contract-history">
            {history.map((c) => (
              <ContractItem key={c.id} c={c} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviewed contracts yet" />
        )}
      </Card>
    </div>
  );
}
