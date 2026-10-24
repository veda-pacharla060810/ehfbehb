import React, { useId, useLayoutEffect, useRef, useState } from 'react';

// Monotone cubic path (no overshoot below zero), points in pixel space.
function monotonePath(pts) {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1);
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        t[i] = tau * a * m[i];
        t[i + 1] = tau * b * m[i];
      }
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

function useWidth(initial = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.clientWidth || initial);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(160, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [initial]);
  return [ref, w];
}

/**
 * Soft curved line chart with gridlines, axis labels, tooltips (hover, touch, keyboard)
 * and a screen-reader table.
 * series: [{ name, values:number[], tone:'rose'|'mauve'|'sage'|'silver', dashed?, area? }]
 */
export function LineChart({ labels, series, height = 220, yFormat = (v) => String(v), ariaLabel, compact = false, tooltipLabels, integer = false }) {
  const [wrapRef, w] = useWidth();
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, '');
  const pad = compact ? { l: 6, r: 6, t: 10, b: 20 } : { l: 46, r: 16, t: 14, b: 30 };
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = Math.max(10, height - pad.t - pad.b);
  const rawMax = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  // Count data (tasks) gets whole-number gridlines only.
  const max = integer ? Math.max(4, Math.ceil(rawMax / 4) * 4) : rawMax;
  const n = labels.length;
  const x = (i) => pad.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / (compact ? 34 : 56)))));

  const pick = (clientX) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || !n) return;
    const px = clientX - r.left - pad.l;
    setHover(Math.max(0, Math.min(n - 1, Math.round(n <= 1 ? 0 : (px / iw) * (n - 1)))));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setHover((h) => Math.max(0, Math.min(n - 1, (h ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1))));
    } else if (e.key === 'Escape') setHover(null);
  };

  const tipLeft = hover == null ? 0 : Math.min(Math.max(x(hover), 70), w - 70);

  return (
    <div className={`chart ${compact ? 'chart-compact' : ''}`} ref={wrapRef}>
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
        onBlur={() => setHover(null)}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`${gid}-g${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className={`stop-${s.tone}`} stopOpacity="0.32" />
              <stop offset="100%" className={`stop-${s.tone}`} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {!compact &&
          ticks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={pad.l - 8} y={y(t)} className="axis axis-y" dominantBaseline="middle" textAnchor="end">
                {yFormat(t)}
              </text>
            </g>
          ))}
        {compact && <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} className="grid" />}
        {labels.map((l, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={height - (compact ? 4 : 8)} className="axis" textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}>
              {l}
            </text>
          ) : null,
        )}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [x(i), y(v)]);
          const d = monotonePath(pts);
          return (
            <g key={si}>
              {s.area && pts.length > 1 && (
                <path d={`${d} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill={`url(#${gid}-g${si})`} />
              )}
              <path d={d} className={`line line-${s.tone} ${s.dashed ? 'line-dashed' : ''}`} fill="none" />
              {pts.length > 0 && !s.dashed && (
                <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" className={`dot dot-${s.tone}`} />
              )}
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="hoverline" />
            {series.map((s, si) => (
              <circle key={si} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4.5" className={`dot dot-${s.tone} dot-ring`} />
            ))}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: tipLeft }}>
          <div className="chart-tip-title">{(tooltipLabels || labels)[hover]}</div>
          {series.map((s, si) => (
            <div key={si} className="chart-tip-row">
              <span className={`swatch swatch-${s.tone} ${s.dashed ? 'swatch-dashed' : ''}`} />
              {s.name}: <strong>{yFormat(s.values[hover] ?? 0)}</strong>
            </div>
          ))}
        </div>
      )}
      <table className="visually-hidden">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Period</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <th>{(tooltipLabels || labels)[i]}</th>
              {series.map((s) => (
                <td key={s.name}>{yFormat(s.values[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map((it) => (
        <li key={it.name}>
          <span className={`swatch swatch-${it.tone} ${it.dashed ? 'swatch-dashed' : ''}`} />
          {it.name}
        </li>
      ))}
    </ul>
  );
}

// Concentric progress rings. rings: [{ value 0..1, tone, label }]
export function ProgressRing({ rings, size = 150, children, label }) {
  const stroke = 9;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        {rings.map((r, i) => {
          const rad = size / 2 - stroke / 2 - i * (stroke + 5);
          const c = 2 * Math.PI * rad;
          const v = Math.max(0, Math.min(1, r.value || 0));
          return (
            <g key={i} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <circle cx={size / 2} cy={size / 2} r={rad} className="ring-track" strokeWidth={stroke} fill="none" />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={rad}
                className={`ring-bar ring-${r.tone}`}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${c * v} ${c}`}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Meter({ value, tone = 'rose', label }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <span className={`meter-fill meter-${tone}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
