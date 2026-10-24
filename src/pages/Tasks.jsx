import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useConfirm } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Icon } from '../components/Icon.jsx';
import { PageHeader, Card, EmptyState, Segmented, PriorityChip, CategoryChip, LotusCheck, useSortable, DemoBadge } from '../components/ui.jsx';
import { fmtDate, relDays, todayKey } from '../lib/date.js';
import { navigate } from '../lib/router.js';

const PRI_RANK = { high: 0, medium: 1, low: 2 };
const STATUS = [
  { value: 'todo', label: 'To do' },
  { value: 'doing', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export function DueLabel({ task }) {
  if (!task.due) return null;
  const today = todayKey();
  const overdue = task.status !== 'done' && task.due < today;
  const isToday = task.due === today;
  return (
    <span className={`due ${overdue ? 'is-overdue' : ''} ${isToday ? 'is-today' : ''}`}>
      <Icon name={overdue ? 'alert' : 'clock'} size={14} />
      {overdue ? `Overdue · ${fmtDate(task.due, { month: 'short', day: 'numeric' })}` : isToday ? 'Due today' : `Due ${relDays(task.due)}`}
    </span>
  );
}

export function QuickAdd({ compact = false, onAdded }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [more, setMore] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Write a task name first.');
      return;
    }
    actions.addTask({ title, priority, due: due || null, categoryId: categoryId || null });
    toast(`Added “${title.trim().slice(0, 40)}”`);
    setTitle('');
    setDue('');
    setError('');
    onAdded?.();
  };
  const id = compact ? 'qa-home' : 'qa-tasks';
  return (
    <form className={`quick-add ${compact ? 'is-compact' : ''}`} onSubmit={submit} noValidate>
      <div className="quick-add-row">
        <label htmlFor={`${id}-title`} className="visually-hidden">
          New task
        </label>
        <input
          id={`${id}-title`}
          className="input"
          placeholder="Add a task…"
          value={title}
          maxLength={300}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
        />
        <button className="btn btn-primary" type="submit">
          <Icon name="plus" size={18} /> Add
        </button>
      </div>
      {error && (
        <p className="field-error" id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-text btn-sm" aria-expanded={more} onClick={() => setMore((m) => !m)}>
        <Icon name={more ? 'chevU' : 'chevD'} size={14} /> {more ? 'Fewer options' : 'Priority, date and category'}
      </button>
      {more && (
        <div className="quick-add-more">
          <div className="field">
            <label className="field-label" htmlFor={`${id}-pri`}>
              Priority
            </label>
            <select id={`${id}-pri`} className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${id}-due`}>
              Deadline
            </label>
            <input id={`${id}-due`} type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${id}-cat`}>
              Category
            </label>
            <select id={`${id}-cat`} className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </form>
  );
}

function TaskDetails({ task }) {
  const { data, actions } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [sub, setSub] = useState('');
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [titleErr, setTitleErr] = useState('');
  const base = `td-${task.id}`;

  const commitTitle = () => {
    if (!title.trim()) {
      setTitleErr('A task needs a name.');
      return;
    }
    setTitleErr('');
    if (title.trim() !== task.title) actions.updateTask(task.id, { title: title.trim() });
  };

  return (
    <div className="task-details">
      <div className="field">
        <label className="field-label" htmlFor={`${base}-title`}>
          Name
        </label>
        <input
          id={`${base}-title`}
          className="input"
          value={title}
          maxLength={300}
          aria-invalid={!!titleErr}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
        />
        {titleErr && (
          <p className="field-error" role="alert">
            {titleErr}
          </p>
        )}
      </div>
      <div className="task-details-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${base}-pri`}>
            Priority
          </label>
          <select id={`${base}-pri`} className="select" value={task.priority} onChange={(e) => actions.updateTask(task.id, { priority: e.target.value })}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${base}-due`}>
            Deadline
          </label>
          <input id={`${base}-due`} type="date" className="input" value={task.due || ''} onChange={(e) => actions.updateTask(task.id, { due: e.target.value || null })} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${base}-cat`}>
            Category
          </label>
          <select id={`${base}-cat`} className="select" value={task.categoryId || ''} onChange={(e) => actions.updateTask(task.id, { categoryId: e.target.value || null })}>
            <option value="">None</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${base}-status`}>
            Status
          </label>
          <select id={`${base}-status`} className="select" value={task.status} onChange={(e) => actions.updateTask(task.id, { status: e.target.value })}>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${base}-notes`}>
          Notes
        </label>
        <textarea
          id={`${base}-notes`}
          className="textarea"
          rows={3}
          value={notes}
          maxLength={5000}
          placeholder="Anything worth remembering…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== task.notes && actions.updateTask(task.id, { notes })}
        />
      </div>
      <fieldset className="subtasks">
        <legend className="field-label">
          Subtasks {task.subtasks.length > 0 && <span className="muted">· {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}</span>}
        </legend>
        <ul className="list-reset subtask-list">
          {task.subtasks.map((s) => (
            <li key={s.id} className={`subtask ${s.done ? 'is-done' : ''}`}>
              <LotusCheck size="sm" checked={s.done} label={`Mark subtask “${s.title}” ${s.done ? 'not done' : 'done'}`} onChange={(v) => actions.updateSubtask(task.id, s.id, { done: v })} />
              <span className="subtask-title">{s.title}</span>
              <button className="btn-icon btn-sm" aria-label={`Delete subtask “${s.title}”`} onClick={() => actions.deleteSubtask(task.id, s.id)}>
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="subtask-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!sub.trim()) return;
            actions.addSubtask(task.id, sub);
            setSub('');
          }}
        >
          <label htmlFor={`${base}-sub`} className="visually-hidden">
            New subtask
          </label>
          <input id={`${base}-sub`} className="input input-sm" placeholder="Add a subtask" value={sub} maxLength={300} onChange={(e) => setSub(e.target.value)} />
          <button className="btn btn-ghost btn-sm" type="submit" disabled={!sub.trim()}>
            Add
          </button>
        </form>
      </fieldset>
      <div className="task-details-foot">
        <button
          className="btn btn-text btn-sm"
          onClick={() => {
            sessionStorageSet('vk:focus-task', task.id);
            navigate('focus');
          }}
        >
          <Icon name="timer" size={16} /> Focus on this
        </button>
        <button
          className="btn btn-text btn-sm text-danger"
          onClick={async () => {
            if (await confirm({ title: 'Delete this task?', message: `“${task.title}” will be removed. Past focus sessions keep their record.`, confirmLabel: 'Delete task', danger: true })) {
              actions.deleteTask(task.id);
              toast('Task deleted');
            }
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

export function sessionStorageSet(k, v) {
  try {
    window.sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

function TaskRow({ task, handle, dragging, open, onToggleOpen }) {
  const { data, actions } = useStore();
  const cat = data.categories.find((c) => c.id === task.categoryId);
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <li data-sort-id={task.id} className={`task-row pri-${task.priority} ${task.status === 'done' ? 'is-done' : ''} ${dragging ? 'is-dragging' : ''} ${open ? 'is-open' : ''}`}>
      <div className="task-main">
        {handle && (
          <button {...handle}>
            <Icon name="grip" size={18} />
          </button>
        )}
        <LotusCheck checked={task.status === 'done'} label={`Mark “${task.title}” ${task.status === 'done' ? 'not done' : 'done'}`} onChange={() => actions.toggleTask(task.id)} />
        <button className="task-title-btn" aria-expanded={open} onClick={onToggleOpen}>
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            <PriorityChip priority={task.priority} />
            <CategoryChip category={cat} />
            {task.status === 'doing' && <span className="chip chip-doing">In progress</span>}
            <DueLabel task={task} />
            {task.subtasks.length > 0 && (
              <span className="meta-text">
                <Icon name="check" size={13} /> {subDone}/{task.subtasks.length}
              </span>
            )}
            {task.notes && (
              <span className="meta-text" title="Has notes">
                <Icon name="note" size={13} />
                <span className="visually-hidden">Has notes</span>
              </span>
            )}
          </span>
        </button>
        <span className="task-chevron" aria-hidden="true">
          <Icon name={open ? 'chevU' : 'chevD'} size={18} />
        </span>
      </div>
      {open && <TaskDetails task={task} />}
    </li>
  );
}

function Board({ tasks }) {
  const { data, actions } = useStore();
  const [over, setOver] = useState(null);
  return (
    <div className="board">
      {STATUS.map((col) => {
        const items = tasks.filter((t) => t.status === col.value);
        return (
          <section
            key={col.value}
            className={`board-col ${over === col.value ? 'is-over' : ''}`}
            aria-label={col.label}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col.value);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              if (id) actions.updateTask(id, { status: col.value });
              setOver(null);
            }}
          >
            <h2 className="board-title">
              {col.label} <span className="count">{items.length}</span>
            </h2>
            {items.length === 0 && <p className="board-empty">Drop a task here</p>}
            <ul className="list-reset board-list">
              {items.map((t) => {
                const cat = data.categories.find((c) => c.id === t.categoryId);
                return (
                  <li key={t.id} className={`board-card pri-${t.priority}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}>
                    <p className="board-card-title">{t.title}</p>
                    <div className="task-meta">
                      <PriorityChip priority={t.priority} />
                      <CategoryChip category={cat} />
                      <DueLabel task={t} />
                    </div>
                    <label className="visually-hidden" htmlFor={`bs-${t.id}`}>
                      Status for {t.title}
                    </label>
                    <select id={`bs-${t.id}`} className="select select-sm" value={t.status} onChange={(e) => actions.updateTask(t.id, { status: e.target.value })}>
                      {STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function Tasks() {
  const { data, actions } = useStore();
  const [view, setView] = useState('list');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('manual');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    let list = [...data.tasks].sort((a, b) => a.order - b.order);
    if (view === 'list') {
      if (status === 'open') list = list.filter((t) => t.status !== 'done');
      if (status === 'done') list = list.filter((t) => t.status === 'done');
    }
    if (priority !== 'all') list = list.filter((t) => t.priority === priority);
    if (category === 'none') list = list.filter((t) => !t.categoryId);
    else if (category !== 'all') list = list.filter((t) => t.categoryId === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q));
    }
    if (sort === 'due') list.sort((a, b) => (a.due || '9999') .localeCompare(b.due || '9999'));
    if (sort === 'priority') list.sort((a, b) => PRI_RANK[a.priority] - PRI_RANK[b.priority]);
    if (status === 'done' && sort === 'manual') list.sort((a, b) => b.completedAt - a.completedAt);
    return list;
  }, [data.tasks, view, status, priority, category, query, sort]);

  const ids = filtered.map((t) => t.id);
  const canDrag = sort === 'manual' && status !== 'done' && view === 'list';
  const { containerRef, displayIds, draggingId, handleProps } = useSortable(ids, actions.reorderTasks);
  const byId = new Map(filtered.map((t) => [t.id, t]));

  const total = data.tasks.length;
  const done = data.tasks.filter((t) => t.status === 'done').length;
  const overdue = data.tasks.filter((t) => t.status !== 'done' && t.due && t.due < todayKey()).length;

  return (
    <div className="page">
      <PageHeader title="Tasks" eyebrow={<DemoBadge />}>
        <Segmented
          label="Task view"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List', icon: 'list' },
            { value: 'board', label: 'Board', icon: 'board' },
          ]}
        />
      </PageHeader>

      <div className="tasks-top">
        <Card className="tasks-add" petal={false}>
          <QuickAdd />
        </Card>
        <div className="tasks-stats" aria-label="Task overview">
          <div className="mini-stat">
            <span className="mini-stat-value">{total - done}</span>
            <span className="mini-stat-label">open</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{done}</span>
            <span className="mini-stat-label">done</span>
          </div>
          <div className={`mini-stat ${overdue ? 'is-warn' : ''}`}>
            <span className="mini-stat-value">{overdue}</span>
            <span className="mini-stat-label">overdue</span>
          </div>
        </div>
      </div>

      <div className="filters" role="group" aria-label="Filter tasks">
        {view === 'list' && (
          <Segmented
            size="sm"
            label="Show"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'all', label: 'All' },
              { value: 'done', label: 'Completed' },
            ]}
          />
        )}
        <label className="filter">
          <span className="visually-hidden">Priority</span>
          <select className="select select-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="filter">
          <span className="visually-hidden">Category</span>
          <select className="select select-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">No category</option>
          </select>
        </label>
        <label className="filter">
          <span className="visually-hidden">Sort</span>
          <select className="select select-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="manual">My order</option>
            <option value="due">By deadline</option>
            <option value="priority">By priority</option>
          </select>
        </label>
        <label className="filter filter-search">
          <span className="visually-hidden">Search tasks</span>
          <input className="input input-sm" type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {view === 'board' ? (
        total ? <Board tasks={filtered} /> : <EmptyState title="No tasks yet">Add one above and it will appear in the To do column.</EmptyState>
      ) : filtered.length === 0 ? (
        <Card petal={false}>
          {total === 0 ? (
            <EmptyState title="Your list is clear">Add your first task above. Press Enter to save it quickly.</EmptyState>
          ) : status === 'open' && !query && priority === 'all' && category === 'all' ? (
            <EmptyState title="Everything is done">Nothing open right now. Switch to Completed to see what you finished.</EmptyState>
          ) : (
            <EmptyState icon="list" title="No tasks match these filters" />
          )}
        </Card>
      ) : (
        <>
          {canDrag && <p className="hint">Drag the handle to reorder, or focus it and use the arrow keys.</p>}
          <ul className="list-reset task-list" ref={containerRef}>
            {(canDrag ? displayIds : ids).map((id) => {
              const t = byId.get(id);
              if (!t) return null;
              return (
                <TaskRow
                  key={id}
                  task={t}
                  handle={canDrag ? handleProps(id, t.title) : null}
                  dragging={draggingId === id}
                  open={openId === id}
                  onToggleOpen={() => setOpenId(openId === id ? null : id)}
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
