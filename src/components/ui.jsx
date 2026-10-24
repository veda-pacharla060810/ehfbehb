import React, { useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { TinyLotus } from './Lotus.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { moveItem } from '../lib/util.js';
import { PASTELS } from '../store/schema.js';

export function PageHeader({ title, children, eyebrow }) {
  return (
    <header className="page-header">
      <div className="page-heading">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title" tabIndex={-1} data-page-title>
          {title}
        </h1>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Card({ title, icon, actions, children, className = '', as: Tag = 'section', petal = true, ...rest }) {
  return (
    <Tag className={`card ${petal ? 'card-petal' : ''} ${className}`} {...rest}>
      {(title || actions) && (
        <div className="card-head">
          {title && (
            <h2 className="card-title">
              {icon && <Icon name={icon} size={18} />}
              {title}
            </h2>
          )}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function EmptyState({ icon = 'lotus', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} strokeWidth={1.3} />
      </span>
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

export function Segmented({ value, onChange, options, label, size }) {
  return (
    <div className={`seg ${size === 'sm' ? 'seg-sm' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="seg-btn" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          <span className={o.iconOnly ? 'visually-hidden' : ''}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function DemoBadge() {
  const { mode } = useStore();
  if (mode !== 'demo') return null;
  return <span className="badge badge-demo">Sample</span>;
}

export function PriorityChip({ priority }) {
  const label = { high: 'High', medium: 'Medium', low: 'Low' }[priority];
  const marks = { high: '▲▲', medium: '▲', low: '△' }[priority];
  return (
    <span className={`chip chip-${priority}`} title={`${label} priority`}>
      <span aria-hidden="true" className="chip-mark">
        {marks}
      </span>
      {label}
      <span className="visually-hidden"> priority</span>
    </span>
  );
}

export function CategoryChip({ category }) {
  if (!category) return null;
  const p = PASTELS[category.color] || PASTELS.rose;
  return (
    <span className="chip" style={{ background: p.bg, color: p.ink }}>
      <span className="chip-dot" style={{ background: p.dot }} aria-hidden="true" />
      {category.name}
    </span>
  );
}

// Round checkbox with a tiny lotus that blooms on completion.
export function LotusCheck({ checked, onChange, label, size = 'md' }) {
  const [pop, setPop] = useState(false);
  return (
    <label className={`lotus-check lotus-check-${size} ${checked ? 'is-checked' : ''} ${pop ? 'is-pop' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (e.target.checked) {
            setPop(true);
            setTimeout(() => setPop(false), 700);
          }
          onChange(e.target.checked);
        }}
      />
      <span className="lotus-check-box" aria-hidden="true">
        <Icon name="check" size={14} strokeWidth={2.2} />
      </span>
      <TinyLotus className="lotus-check-bloom" size={22} />
      <span className="visually-hidden">{label}</span>
    </label>
  );
}

/**
 * Pointer-based sortable list (mouse, pen and touch) with keyboard support:
 * focus a handle and use the arrow keys to move the item.
 */
export function useSortable(ids, onReorder) {
  const containerRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, from, over }

  const onPointerDown = (e, id) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();
    const els = [...container.querySelectorAll(':scope > [data-sort-id]')];
    const centers = els.map((el) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    const from = ids.indexOf(id);
    if (from < 0) return;
    let over = from;
    setDrag({ id, from, over });
    const move = (ev) => {
      let best = over;
      let bestD = Infinity;
      centers.forEach(([cx, cy], i) => {
        const d = (cx - ev.clientX) ** 2 + (cy - ev.clientY) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== over) {
        over = best;
        setDrag({ id, from, over });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      if (over !== from) onReorder(moveItem(ids, from, over));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e, id) => {
    const i = ids.indexOf(id);
    const dir = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    e.preventDefault();
    onReorder(moveItem(ids, i, j));
    requestAnimationFrame(() => containerRef.current?.querySelector(`[data-sort-id="${id}"] [data-sort-handle]`)?.focus());
  };

  const displayIds = drag ? moveItem(ids, drag.from, drag.over) : ids;
  const handleProps = (id, label) => ({
    'data-sort-handle': '',
    type: 'button',
    className: 'drag-handle',
    'aria-label': `Reorder ${label}. Use arrow keys to move.`,
    onPointerDown: (e) => onPointerDown(e, id),
    onKeyDown: (e) => onKeyDown(e, id),
  });
  return { containerRef, displayIds, draggingId: drag?.id || null, handleProps };
}
