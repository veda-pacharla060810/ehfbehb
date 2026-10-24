import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useConfirm, Modal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Icon } from '../components/Icon.jsx';
import { PageHeader, Card, EmptyState, Field, Segmented, DemoBadge } from '../components/ui.jsx';
import { ExportDialog } from '../components/ExportDialog.jsx';
import { EVENT_TYPES } from '../store/schema.js';
import { addDays, addMonths, daysBetween, fmtDate, fmtTime, fromKey, startOfMonth, startOfWeek, toKey, todayKey, WEEKDAYS, relDays } from '../lib/date.js';
import { eventsToICS, icsToEvents } from '../lib/ics.js';
import { readFileText } from '../lib/util.js';
import { normalizeData } from '../store/schema.js';

// Items shown on a day: calendar events plus task deadlines.
function useDayItems() {
  const { data } = useStore();
  return useMemo(() => {
    const map = new Map();
    const push = (k, it) => (map.has(k) ? map.get(k).push(it) : map.set(k, [it]));
    data.events.forEach((e) => push(e.date, { kind: 'event', id: e.id, type: e.type, title: e.title, time: e.time, event: e }));
    data.tasks.forEach((t) => t.due && push(t.due, { kind: 'task', id: t.id, type: 'task', title: t.title, time: '', done: t.status === 'done', task: t }));
    map.forEach((list) => list.sort((a, b) => (a.time || '99').localeCompare(b.time || '99')));
    return map;
  }, [data.events, data.tasks]);
}

function ItemChip({ it, onOpen, compact }) {
  const meta = it.kind === 'event' ? EVENT_TYPES[it.type] : { label: 'Task deadline', icon: 'tasks', color: 'task' };
  return (
    <button type="button" className={`cal-chip cal-${it.kind === 'event' ? it.type : 'task'} ${it.done ? 'is-done' : ''}`} onClick={(e) => (e.stopPropagation(), onOpen(it))} title={`${meta.label}: ${it.title}`}>
      <Icon name={meta.icon} size={13} />
      {!compact && it.time && <span className="cal-chip-time">{fmtTime(it.time)}</span>}
      <span className="cal-chip-title">{it.title}</span>
      <span className="visually-hidden"> ({meta.label})</span>
    </button>
  );
}

const EMPTY_EVENT = { id: '', type: 'exam', title: '', subject: '', topic: '', date: '', time: '', notes: '' };

function EventDialog({ open, initial, onClose }) {
  const { actions } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [ev, setEv] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setEv((x) => ({ ...x, [k]: e.target.value }));

  const save = (e) => {
    e.preventDefault();
    const errs = {};
    if (!ev.title.trim()) errs.title = 'Give the event a title.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) errs.date = 'Choose a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    actions.saveEvent({ ...ev, title: ev.title.trim() });
    toast(ev.id ? 'Event updated' : 'Event added');
    onClose();
  };
  const showStudyFields = ev.type === 'exam' || ev.type === 'assignment' || ev.type === 'study';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ev.id ? 'Edit event' : 'New event'}
      footer={
        <>
          {ev.id && (
            <button
              className="btn btn-text text-danger mr-auto"
              onClick={async () => {
                if (await confirm({ title: 'Delete this event?', message: `“${ev.title}” will be removed from your calendar.`, confirmLabel: 'Delete', danger: true })) {
                  actions.deleteEvent(ev.id);
                  onClose();
                }
              }}
            >
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <form onSubmit={save} className="stack" noValidate>
        <fieldset className="field">
          <legend className="field-label">Type</legend>
          <div className="type-row">
            {Object.entries(EVENT_TYPES).map(([k, t]) => (
              <label key={k} className={`type-opt cal-${k} ${ev.type === k ? 'is-on' : ''}`}>
                <input type="radio" name="ev-type" value={k} checked={ev.type === k} onChange={set('type')} />
                <Icon name={t.icon} size={16} /> {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Title" htmlFor="ev-title" error={errors.title}>
          <input id="ev-title" className="input" maxLength={200} value={ev.title} aria-invalid={!!errors.title} onChange={set('title')} />
        </Field>
        {showStudyFields && (
          <div className="setup-grid">
            <Field label="Subject" htmlFor="ev-subject">
              <input id="ev-subject" className="input" maxLength={120} value={ev.subject} onChange={set('subject')} />
            </Field>
            <Field label="Unit or topic" htmlFor="ev-topic">
              <input id="ev-topic" className="input" maxLength={200} value={ev.topic} onChange={set('topic')} />
            </Field>
          </div>
        )}
        <div className="setup-grid">
          <Field label="Date" htmlFor="ev-date" error={errors.date}>
            <input id="ev-date" type="date" className="input" value={ev.date} aria-invalid={!!errors.date} onChange={set('date')} />
          </Field>
          <Field label="Time (optional)" htmlFor="ev-time">
            <input id="ev-time" type="time" className="input" value={ev.time} onChange={set('time')} />
          </Field>
        </div>
        <Field label="Notes (optional)" htmlFor="ev-notes">
          <textarea id="ev-notes" className="textarea" rows={2} maxLength={2000} value={ev.notes} onChange={set('notes')} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function TaskDialog({ item, onClose }) {
  const { actions } = useStore();
  if (!item) return null;
  const t = item.task;
  return (
    <Modal
      open
      onClose={onClose}
      title="Task deadline"
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              actions.toggleTask(t.id);
              onClose();
            }}
          >
            {t.status === 'done' ? 'Mark not done' : 'Mark done'}
          </button>
        </>
      }
    >
      <p className="strong">{t.title}</p>
      <p className="muted">
        Due {fmtDate(t.due, { weekday: 'long', month: 'long', day: 'numeric' })} · {t.priority} priority · {t.status === 'done' ? 'completed' : 'open'}
      </p>
      <p className="muted small">Edit the task itself on the Tasks page.</p>
    </Modal>
  );
}

function Agenda({ dayKey, items, onOpen, onAdd }) {
  return (
    <div className="agenda">
      <div className="agenda-head">
        <h3 className="agenda-title">{dayKey === todayKey() ? 'Today' : fmtDate(dayKey, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        <button className="btn btn-text btn-sm" onClick={() => onAdd(dayKey)}>
          <Icon name="plus" size={14} /> Add
        </button>
      </div>
      {items.length ? (
        <ul className="list-reset agenda-list">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`}>
              <button className={`agenda-item cal-${it.kind === 'event' ? it.type : 'task'} ${it.done ? 'is-done' : ''}`} onClick={() => onOpen(it)}>
                <span className="agenda-time">{it.time ? fmtTime(it.time) : it.kind === 'task' ? 'Due' : 'All day'}</span>
                <span className="agenda-icon">
                  <Icon name={it.kind === 'event' ? EVENT_TYPES[it.type].icon : 'tasks'} size={16} />
                </span>
                <span className="agenda-body">
                  <span className="agenda-name">{it.title}</span>
                  <span className="agenda-sub">
                    {it.kind === 'event' ? [EVENT_TYPES[it.type].label, it.event.subject, it.event.topic].filter(Boolean).join(' · ') : `Task deadline${it.done ? ' · done' : ''}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Nothing scheduled.</p>
      )}
    </div>
  );
}

function Countdowns({ onOpen }) {
  const { data } = useStore();
  const t = todayKey();
  const upcoming = [
    ...data.events.filter((e) => e.date >= t && (e.type === 'exam' || e.type === 'assignment')).map((e) => ({ kind: 'event', id: e.id, type: e.type, title: e.title, date: e.date, time: e.time, event: e })),
    ...data.tasks.filter((x) => x.due && x.due >= t && x.status !== 'done' && x.priority === 'high').map((x) => ({ kind: 'task', id: x.id, type: 'task', title: x.title, date: x.due, time: '', task: x })),
  ]
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 8);
  if (!upcoming.length) return <EmptyState icon="exam" title="No upcoming exams or deadlines">Add an exam or assignment to see a countdown.</EmptyState>;
  return (
    <ul className="list-reset countdowns">
      {upcoming.map((u) => {
        const n = daysBetween(new Date(), fromKey(u.date));
        return (
          <li key={`${u.kind}-${u.id}`}>
            <button className={`countdown cal-${u.kind === 'event' ? u.type : 'task'}`} onClick={() => onOpen(u)}>
              <span className="countdown-num">
                <strong>{n}</strong>
                <span>{n === 1 ? 'day' : 'days'}</span>
              </span>
              <span className="countdown-body">
                <span className="countdown-title">{u.title}</span>
                <span className="countdown-sub">
                  {u.kind === 'event' ? EVENT_TYPES[u.type].label : 'High-priority task'} · {fmtDate(u.date)} {u.time ? `· ${fmtTime(u.time)}` : ''}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function CalendarPage() {
  const { data, prefs, actions } = useStore();
  const toast = useToast();
  const items = useDayItems();
  const [view, setView] = useState(prefs.calendar.defaultView);
  const [cursor, setCursor] = useState(todayKey());
  const [dialog, setDialog] = useState(null); // event object
  const [taskItem, setTaskItem] = useState(null);
  const [exporting, setExporting] = useState(null);
  const fileRef = useRef(null);
  const ws = prefs.calendar.weekStart;
  const cur = fromKey(cursor);

  const open = (it) => (it.kind === 'event' ? setDialog({ ...EMPTY_EVENT, ...it.event }) : setTaskItem(it));
  const add = (dateKey) => setDialog({ ...EMPTY_EVENT, date: dateKey || cursor });

  const shift = (dir) => {
    if (view === 'month') setCursor(toKey(addMonths(cur, dir)));
    else setCursor(toKey(addDays(cur, dir * (view === 'week' ? 7 : 1))));
  };

  const title =
    view === 'month'
      ? cur.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${fmtDate(toKey(startOfWeek(cur, ws)), { month: 'short', day: 'numeric' })} – ${fmtDate(toKey(addDays(startOfWeek(cur, ws), 6)), { month: 'short', day: 'numeric', year: 'numeric' })}`
        : fmtDate(cursor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const weekdays = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(i + ws) % 7]);

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileText(file);
      let events;
      if (/\.ics$/i.test(file.name) || text.includes('BEGIN:VCALENDAR')) events = icsToEvents(text);
      else {
        let obj;
        try {
          obj = JSON.parse(text);
        } catch {
          throw new Error('That file is not valid JSON or iCalendar.');
        }
        events = normalizeData({ events: Array.isArray(obj) ? obj : obj.events }).events;
      }
      if (!events.length) throw new Error('No valid events were found in that file.');
      actions.importEvents(events);
      toast(`Imported ${events.length} event${events.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast(err.message || 'Import failed.', { tone: 'warn', duration: 7000 });
    }
  };

  let body;
  if (view === 'month') {
    const start = startOfWeek(startOfMonth(cur), ws);
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    body = (
      <div className="month">
        <div className="month-head" aria-hidden="true">
          {weekdays.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="month-grid">
          {days.map((d) => {
            const k = toKey(d);
            const list = items.get(k) || [];
            const outside = d.getMonth() !== cur.getMonth();
            return (
              <div
                key={k}
                role="button"
                tabIndex={0}
                className={`month-cell ${outside ? 'is-outside' : ''} ${k === todayKey() ? 'is-today' : ''} ${k === cursor ? 'is-selected' : ''}`}
                onClick={() => setCursor(k)}
                onDoubleClick={() => add(k)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), setCursor(k))}
                aria-label={`${fmtDate(k, { weekday: 'long', month: 'long', day: 'numeric' })}, ${list.length} item${list.length === 1 ? '' : 's'}`}
              >
                <span className="month-day">{d.getDate()}</span>
                <div className="month-items">
                  {list.slice(0, 3).map((it) => (
                    <ItemChip key={`${it.kind}-${it.id}`} it={it} onOpen={open} compact />
                  ))}
                  {list.length > 3 && <span className="more">+{list.length - 3} more</span>}
                </div>
                {list.length > 0 && (
                  <span className="month-dots" aria-hidden="true">
                    {list.slice(0, 4).map((it) => (
                      <i key={`${it.kind}-${it.id}`} className={`cal-dot cal-${it.kind === 'event' ? it.type : 'task'}`} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (view === 'week') {
    const start = startOfWeek(cur, ws);
    body = (
      <div className="week">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, i);
          const k = toKey(d);
          const list = items.get(k) || [];
          return (
            <section key={k} className={`week-col ${k === todayKey() ? 'is-today' : ''}`}>
              <button className="week-head" onClick={() => (setCursor(k), setView('day'))}>
                <span>{WEEKDAYS[d.getDay()]}</span>
                <strong>{d.getDate()}</strong>
              </button>
              <div className="week-items">
                {list.map((it) => (
                  <ItemChip key={`${it.kind}-${it.id}`} it={it} onOpen={open} />
                ))}
                <button className="week-add" onClick={() => add(k)} aria-label={`Add event on ${fmtDate(k)}`}>
                  <Icon name="plus" size={14} />
                </button>
              </div>
            </section>
          );
        })}
      </div>
    );
  } else {
    body = <Agenda dayKey={cursor} items={items.get(cursor) || []} onOpen={open} onAdd={add} />;
  }

  return (
    <div className="page">
      <PageHeader title="Calendar & Exams" eyebrow={<DemoBadge />}>
        <button className="btn btn-primary" onClick={() => add(cursor)}>
          <Icon name="plus" size={18} /> Add event
        </button>
      </PageHeader>

      <div className="cal-layout">
        <Card className="cal-main" petal={false}>
          <div className="cal-toolbar">
            <div className="cal-nav">
              <button className="btn-icon" aria-label="Previous" onClick={() => shift(-1)}>
                <Icon name="chevL" />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCursor(todayKey())}>
                Today
              </button>
              <button className="btn-icon" aria-label="Next" onClick={() => shift(1)}>
                <Icon name="chevR" />
              </button>
              <h2 className="cal-title" aria-live="polite">
                {title}
              </h2>
            </div>
            <Segmented
              size="sm"
              label="Calendar view"
              value={view}
              onChange={setView}
              options={[
                { value: 'month', label: 'Month' },
                { value: 'week', label: 'Week' },
                { value: 'day', label: 'Day' },
              ]}
            />
          </div>
          {body}
          <ul className="cal-legend" aria-label="Legend">
            {Object.entries(EVENT_TYPES).map(([k, t]) => (
              <li key={k} className={`cal-${k}`}>
                <Icon name={t.icon} size={14} /> {t.label}
              </li>
            ))}
            <li className="cal-task">
              <Icon name="tasks" size={14} /> Task deadline
            </li>
          </ul>
        </Card>

        <div className="stack">
          {view === 'month' && (
            <Card petal={false}>
              <Agenda dayKey={cursor} items={items.get(cursor) || []} onOpen={open} onAdd={add} />
            </Card>
          )}
          <Card title="Countdowns" icon="exam">
            <Countdowns onOpen={open} />
          </Card>
          <Card title="Import & export" icon="download" petal={false}>
            <div className="btn-col">
              <button className="btn btn-ghost btn-sm" onClick={() => setExporting('ics')} disabled={!data.events.length}>
                <Icon name="download" size={16} /> Export .ics (Google, Apple, Outlook)
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setExporting('json')} disabled={!data.events.length}>
                <Icon name="download" size={16} /> Export JSON
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> Import .ics or JSON
              </button>
              <input ref={fileRef} type="file" accept=".ics,.json,text/calendar,application/json" hidden onChange={onImport} />
            </div>
            <p className="muted small">Imported events are added to the current dataset. Nothing is replaced.</p>
          </Card>
        </div>
      </div>

      {dialog && <EventDialog open initial={dialog} onClose={() => setDialog(null)} key={dialog.id || dialog.date} />}
      <TaskDialog item={taskItem} onClose={() => setTaskItem(null)} />
      <ExportDialog
        open={!!exporting}
        onClose={() => setExporting(null)}
        title="Export calendar"
        filename={exporting === 'ics' ? 'vaa-kannamma-calendar.ics' : 'vaa-kannamma-calendar.json'}
        type={exporting === 'ics' ? 'text/calendar' : 'application/json'}
        text={exporting === 'ics' ? eventsToICS(data.events) : JSON.stringify({ app: 'vaa-kannamma', kind: 'calendar', events: data.events }, null, 2)}
      />
    </div>
  );
}
