import React, { useRef, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useConfirm, Modal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Icon } from '../components/Icon.jsx';
import { Lotus } from '../components/Lotus.jsx';
import { PageHeader, Card, Field, Segmented } from '../components/ui.jsx';
import { ExportDialog } from '../components/ExportDialog.jsx';
import { DASHBOARD_CARDS, PASTELS, PASTEL_KEYS } from '../store/schema.js';
import { makeBackup, parseBackup } from '../store/storage.js';
import { readFileText, moveItem } from '../lib/util.js';

const SECTIONS = [
  ['s-dashboard', 'Dashboard'],
  ['s-goals', 'Goals'],
  ['s-timer', 'Focus timer'],
  ['s-appearance', 'Appearance'],
  ['s-a11y', 'Accessibility'],
  ['s-categories', 'Categories'],
  ['s-calendar', 'Calendar'],
  ['s-data', 'Data'],
  ['s-privacy', 'Privacy'],
  ['s-about', 'About'],
];

function NumberSetting({ id, label, value, onCommit, min = 0, max = 10000, suffix, hint }) {
  const [v, setV] = useState(String(value));
  const [err, setErr] = useState('');
  const commit = () => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max || Math.round(n) !== n) {
      setErr(`Enter a whole number from ${min} to ${max}.`);
      return;
    }
    setErr('');
    if (n !== value) onCommit(n);
  };
  return (
    <Field label={label} htmlFor={id} error={err} hint={hint}>
      <div className="input-suffix">
        <input id={id} type="number" className="input" min={min} max={max} value={v} aria-invalid={!!err} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
        {suffix && <span className="muted">{suffix}</span>}
      </div>
    </Field>
  );
}

function CategoryEditor() {
  const { data, actions, mode } = useStore();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [color, setColor] = useState('lilac');
  const [err, setErr] = useState('');
  return (
    <div className="stack">
      {mode === 'demo' && <p className="muted small">You are editing the sample categories.</p>}
      <ul className="list-reset cat-list">
        {data.categories.map((c) => (
          <li key={c.id} className="cat-item">
            <label className="visually-hidden" htmlFor={`cat-n-${c.id}`}>
              Category name
            </label>
            <input
              id={`cat-n-${c.id}`}
              className="input input-sm"
              defaultValue={c.name}
              maxLength={40}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) e.target.value = c.name;
                else if (v !== c.name) actions.updateCategory(c.id, { name: v });
              }}
            />
            <div className="swatches" role="radiogroup" aria-label={`Colour for ${c.name}`}>
              {PASTEL_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={c.color === k}
                  aria-label={PASTELS[k].name}
                  title={PASTELS[k].name}
                  className="swatch-btn"
                  style={{ background: PASTELS[k].bg, borderColor: PASTELS[k].dot }}
                  onClick={() => actions.updateCategory(c.id, { color: k })}
                />
              ))}
            </div>
            <button
              className="btn-icon btn-sm"
              aria-label={`Delete category ${c.name}`}
              onClick={async () => {
                const n = data.tasks.filter((t) => t.categoryId === c.id).length;
                if (await confirm({ title: `Delete “${c.name}”?`, message: n ? `${n} task${n === 1 ? '' : 's'} will keep existing without a category.` : 'No tasks use this category.', confirmLabel: 'Delete', danger: true }))
                  actions.deleteCategory(c.id);
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="cat-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setErr('Name the category.');
          if (data.categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) return setErr('A category with that name already exists.');
          actions.addCategory(name, color);
          setName('');
          setErr('');
        }}
        noValidate
      >
        <Field label="New category" htmlFor="cat-new" error={err}>
          <input id="cat-new" className="input" maxLength={40} value={name} onChange={(e) => (setName(e.target.value), setErr(''))} />
        </Field>
        <div className="swatches" role="radiogroup" aria-label="Colour for new category">
          {PASTEL_KEYS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={color === k} aria-label={PASTELS[k].name} title={PASTELS[k].name} className="swatch-btn" style={{ background: PASTELS[k].bg, borderColor: PASTELS[k].dot }} onClick={() => setColor(k)} />
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" type="submit">
          <Icon name="plus" size={14} /> Add category
        </button>
      </form>
    </div>
  );
}

function DataManagement() {
  const { personal, prefs, dataActions, mode, setMode } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteErr, setPasteErr] = useState('');
  const counts = (d) => `${d.tasks.length} tasks, ${d.sessions.length} sessions, ${d.events.length} events, ${d.contracts.length} contracts, ${Object.keys(d.reviews).length} reviews`;

  const loadBackup = (text) => {
    const b = parseBackup(text);
    setPending(b);
  };

  return (
    <div className="stack">
      <p className="muted">
        Your personal records: <strong>{counts(personal)}</strong>. Backups include personal records and settings only, never the sample data.
      </p>
      <div className="btn-wrap">
        <button className="btn btn-primary" onClick={() => setExporting(true)}>
          <Icon name="download" size={16} /> Export backup
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} /> Restore from file
        </button>
        <button className="btn btn-ghost" onClick={() => (setPasteOpen(true), setPasteErr(''))}>
          <Icon name="copy" size={16} /> Restore from pasted text
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              loadBackup(await readFileText(f));
            } catch (err) {
              toast(err.message, { tone: 'warn', duration: 8000 });
            }
          }}
        />
      </div>

      <div className="danger-zone">
        <div>
          <p className="strong">Showcase data</p>
          <p className="muted small">Restores the sample set to its original state. Personal records are not touched.</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            if (await confirm({ title: 'Reset the sample data?', message: 'Any changes made in showcase mode will be replaced with fresh sample records. Your personal data stays as it is.', confirmLabel: 'Reset sample data' })) {
              dataActions.resetDemo();
              toast('Sample data reset');
            }
          }}
        >
          Reset sample data
        </button>
      </div>
      <div className="danger-zone">
        <div>
          <p className="strong">Reset settings</p>
          <p className="muted small">Goals, timer, appearance, dashboard layout and calendar preferences return to defaults.</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            if (await confirm({ title: 'Reset all settings?', message: 'Your records are kept. Only preferences are reset.', confirmLabel: 'Reset settings', danger: true })) {
              dataActions.resetPrefs();
              toast('Settings reset');
            }
          }}
        >
          Reset settings
        </button>
      </div>
      <div className="danger-zone is-danger">
        <div>
          <p className="strong">Clear personal data</p>
          <p className="muted small">Permanently deletes your tasks, sessions, events, contracts and reviews from this browser. Export a backup first if you might want them.</p>
        </div>
        <button
          className="btn btn-danger btn-sm"
          onClick={async () => {
            if (
              await confirm({
                title: 'Delete all personal data?',
                message: `This removes ${counts(personal)} from this browser. It cannot be undone unless you have a backup.`,
                confirmLabel: 'Delete everything',
                danger: true,
              })
            ) {
              dataActions.clearPersonal();
              if (mode === 'demo') setMode('personal');
              toast('Personal data cleared');
            }
          }}
        >
          Clear personal data
        </button>
      </div>

      <ExportDialog
        open={exporting}
        onClose={() => setExporting(false)}
        title="Export backup"
        filename={`vaa-kannamma-backup-${new Date().toISOString().slice(0, 10)}.json`}
        text={exporting ? makeBackup(prefs, personal) : ''}
      />

      <Modal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Restore from pasted text"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPasteOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                try {
                  loadBackup(pasteText);
                  setPasteOpen(false);
                  setPasteText('');
                } catch (err) {
                  setPasteErr(err.message);
                }
              }}
            >
              Check backup
            </button>
          </>
        }
      >
        <Field label="Backup contents" htmlFor="paste-backup" error={pasteErr}>
          <textarea id="paste-backup" className="textarea mono" rows={8} value={pasteText} onChange={(e) => (setPasteText(e.target.value), setPasteErr(''))} />
        </Field>
      </Modal>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Restore this backup?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                dataActions.replacePersonal(pending.data, pending.prefs);
                setPending(null);
                if (mode === 'demo') setMode('personal');
                toast('Backup restored');
              }}
            >
              Replace my data
            </button>
          </>
        }
      >
        {pending && (
          <>
            <p>
              Backup from <strong>{pending.exportedAt ? new Date(pending.exportedAt).toLocaleString() : 'an unknown date'}</strong> contains {counts(pending.data)}.
            </p>
            <p className="muted">Restoring replaces your current personal records ({counts(personal)}) and settings. Sample data is not affected.</p>
          </>
        )}
      </Modal>
    </div>
  );
}

export default function Settings() {
  const { prefs, setPrefs, mode, setMode, storageOK } = useStore();
  const set = (path, value) =>
    setPrefs((p) => {
      const [a, b] = path.split('.');
      return { ...p, [a]: { ...p[a], [b]: value } };
    });
  const order = prefs.dashboard.order;
  const hidden = new Set(prefs.dashboard.hidden);
  const [presetText, setPresetText] = useState(prefs.timer.presets.join(', '));
  const [presetErr, setPresetErr] = useState('');

  return (
    <div className="page">
      <PageHeader title="Settings" />
      <nav className="settings-toc" aria-label="Settings sections">
        {SECTIONS.map(([id, l]) => (
          <a key={id} href={`#${id}`} onClick={(e) => (e.preventDefault(), document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), document.getElementById(id)?.focus({ preventScroll: true }))}>
            {l}
          </a>
        ))}
      </nav>

      <div className="settings">
        <Card title="Dashboard" icon="home" id="s-dashboard" tabIndex={-1}>
          <p className="muted small">Choose which cards appear on Home and their order. You can also drag cards on Home with “Customize”.</p>
          <ul className="list-reset dash-settings">
            {order.map((id, i) => {
              const c = DASHBOARD_CARDS.find((x) => x.id === id);
              if (!c) return null;
              return (
                <li key={id} className={hidden.has(id) ? 'is-hidden' : ''}>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={!hidden.has(id)}
                      onChange={(e) => set('dashboard.hidden', e.target.checked ? prefs.dashboard.hidden.filter((x) => x !== id) : [...prefs.dashboard.hidden, id])}
                    />
                    <span className="toggle-track" aria-hidden="true" />
                    {c.label}
                  </label>
                  <span className="order-btns">
                    <button className="btn-icon btn-sm" aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => set('dashboard.order', moveItem(order, i, i - 1))}>
                      <Icon name="chevU" size={16} />
                    </button>
                    <button className="btn-icon btn-sm" aria-label={`Move ${c.label} down`} disabled={i === order.length - 1} onClick={() => set('dashboard.order', moveItem(order, i, i + 1))}>
                      <Icon name="chevD" size={16} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Goals" icon="target" id="s-goals" tabIndex={-1}>
          <p className="muted small">Set any goal to 0 to hide it.</p>
          <div className="setup-grid">
            <NumberSetting id="g-df" label="Daily focus" suffix="minutes" value={prefs.goals.dailyFocusMin} max={1440} onCommit={(n) => set('goals.dailyFocusMin', n)} />
            <NumberSetting id="g-wf" label="Weekly focus" suffix="minutes" value={prefs.goals.weeklyFocusMin} max={10080} onCommit={(n) => set('goals.weeklyFocusMin', n)} />
            <NumberSetting id="g-dt" label="Tasks per day" suffix="tasks" value={prefs.goals.dailyTasks} max={100} onCommit={(n) => set('goals.dailyTasks', n)} />
            <NumberSetting id="g-wt" label="Tasks per week" suffix="tasks" value={prefs.goals.weeklyTasks} max={500} onCommit={(n) => set('goals.weeklyTasks', n)} />
          </div>
        </Card>

        <Card title="Focus timer" icon="timer" id="s-timer" tabIndex={-1}>
          <div className="setup-grid">
            <NumberSetting id="t-def" label="Default duration" suffix="minutes" min={1} max={600} value={prefs.timer.defaultMin} onCommit={(n) => set('timer.defaultMin', n)} />
            <Field label="Presets" htmlFor="t-presets" error={presetErr} hint="Up to five values in minutes, separated by commas.">
              <input
                id="t-presets"
                className="input"
                value={presetText}
                onChange={(e) => (setPresetText(e.target.value), setPresetErr(''))}
                onBlur={() => {
                  const nums = presetText
                    .split(/[,\s]+/)
                    .filter(Boolean)
                    .map(Number);
                  if (!nums.length || nums.some((n) => !Number.isInteger(n) || n < 1 || n > 600) || nums.length > 5) {
                    setPresetErr('Use one to five whole numbers between 1 and 600.');
                    return;
                  }
                  const uniq = [...new Set(nums)].sort((a, b) => a - b);
                  set('timer.presets', uniq);
                  setPresetText(uniq.join(', '));
                }}
              />
            </Field>
          </div>
        </Card>

        <Card title="Appearance" icon="lotus" id="s-appearance" tabIndex={-1}>
          <fieldset className="field">
            <legend className="field-label">Accent</legend>
            <div className="accent-row">
              {[
                ['rose', 'Rose'],
                ['lotus', 'Lotus pink'],
                ['mauve', 'Mauve'],
                ['sage', 'Sage'],
              ].map(([k, l]) => (
                <label key={k} className={`accent-opt accent-${k} ${prefs.appearance.accent === k ? 'is-on' : ''}`}>
                  <input type="radio" name="accent" checked={prefs.appearance.accent === k} onChange={() => set('appearance.accent', k)} />
                  <span className="accent-dot" aria-hidden="true" /> {l}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="setup-grid">
            <div className="field">
              <span className="field-label" id="bot-l">
                Botanical details
              </span>
              <Segmented
                size="sm"
                label="Botanical details"
                value={prefs.appearance.botanical}
                onChange={(v) => set('appearance.botanical', v)}
                options={[
                  { value: 'full', label: 'Full' },
                  { value: 'subtle', label: 'Subtle' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </div>
            <div className="field">
              <span className="field-label">Density</span>
              <Segmented
                size="sm"
                label="Dashboard density"
                value={prefs.appearance.density}
                onChange={(v) => set('appearance.density', v)}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card title="Accessibility" icon="eye" id="s-a11y" tabIndex={-1}>
          <div className="setup-grid">
            <div className="field">
              <span className="field-label">Text size</span>
              <Segmented
                size="sm"
                label="Text size"
                value={String(prefs.a11y.fontScale)}
                onChange={(v) => set('a11y.fontScale', Number(v))}
                options={[
                  { value: '1', label: 'Default' },
                  { value: '1.125', label: 'Larger' },
                  { value: '1.25', label: 'Largest' },
                ]}
              />
            </div>
            <div className="field">
              <span className="field-label">Motion</span>
              <Segmented
                size="sm"
                label="Motion"
                value={prefs.a11y.motion}
                onChange={(v) => set('a11y.motion', v)}
                options={[
                  { value: 'system', label: 'Follow device' },
                  { value: 'reduce', label: 'Reduce' },
                  { value: 'full', label: 'Allow' },
                ]}
              />
            </div>
          </div>
          <p className="muted small">Every control works with the keyboard: Tab moves between controls, Enter or Space activates, Escape closes dialogs, and arrow keys reorder items from their drag handles. Focus is always shown with a visible ring.</p>
        </Card>

        <Card title="Task categories" icon="tasks" id="s-categories" tabIndex={-1}>
          <CategoryEditor />
        </Card>

        <Card title="Calendar" icon="calendar" id="s-calendar" tabIndex={-1}>
          <div className="setup-grid">
            <div className="field">
              <span className="field-label">First day of the week</span>
              <Segmented
                size="sm"
                label="First day of the week"
                value={String(prefs.calendar.weekStart)}
                onChange={(v) => set('calendar.weekStart', Number(v))}
                options={[
                  { value: '1', label: 'Monday' },
                  { value: '0', label: 'Sunday' },
                ]}
              />
            </div>
            <div className="field">
              <span className="field-label">Default view</span>
              <Segmented
                size="sm"
                label="Default calendar view"
                value={prefs.calendar.defaultView}
                onChange={(v) => set('calendar.defaultView', v)}
                options={[
                  { value: 'month', label: 'Month' },
                  { value: 'week', label: 'Week' },
                  { value: 'day', label: 'Day' },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card title="Data" icon="download" id="s-data" tabIndex={-1}>
          <div className="mode-switch">
            <div>
              <p className="strong">Showcase mode</p>
              <p className="muted small">Explore the app with clearly labelled sample data, kept completely separate from your own records.</p>
            </div>
            <Segmented
              size="sm"
              label="Data mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'personal', label: 'My data' },
                { value: 'demo', label: 'Sample data' },
              ]}
            />
          </div>
          <DataManagement />
        </Card>

        <Card title="Privacy" icon="eyeOff" id="s-privacy" tabIndex={-1}>
          <div className="prose">
            <p>
              Everything you enter stays in this browser’s local storage on this device. vaa kannamma has no accounts, no server and no database. It does not
              use analytics, tracking scripts, cookies for tracking, or any AI service.
            </p>
            <p>Focus time is only what you record with the timer. The app never watches other tabs, applications, keystrokes or your activity.</p>
            <p>
              Local storage has limits: clearing site data, using a private window, or switching browser or device means your records will not be there.
              Export a backup regularly if they matter to you. {!storageOK && <strong>Storage is currently blocked in this browser, so nothing will be kept after you close the page.</strong>}
            </p>
            <p className="muted small">The only outside request is for web fonts from Google Fonts, used to display the typefaces.</p>
          </div>
        </Card>

        <Card title="About" icon="lotus" id="s-about" tabIndex={-1}>
          <div className="about">
            <Lotus size={90} />
            <div className="prose">
              <p>
                <em>vaa kannamma</em> is a gentle welcome, a way of saying “come, dear one”. The app is meant to feel like opening a journal kept on a quiet
                windowsill: pressed-flower colours, a lotus that opens when you arrive and when you finish something, and tools that keep honest records
                without judging you.
              </p>
              <p>The lotus grows from still water and opens a little at a time. Productivity here works the same way, one recorded session at a time.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
