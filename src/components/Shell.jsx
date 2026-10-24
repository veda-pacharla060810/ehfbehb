import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { Lotus } from './Lotus.jsx';
import { ROUTES, navigate } from '../lib/router.js';
import { useStore } from '../store/StoreContext.jsx';
import { useTimer } from '../store/TimerContext.jsx';
import { fmtClock } from '../lib/date.js';

function NavLinks({ route, onPick, showLabels }) {
  const { active, remainingMs } = useTimer();
  return (
    <ul className="nav-list">
      {ROUTES.map((r) => (
        <li key={r.id}>
          <a
            href={`#${r.id}`}
            className={`nav-link ${route === r.id ? 'is-active' : ''}`}
            aria-current={route === r.id ? 'page' : undefined}
            aria-label={showLabels ? undefined : r.label}
            onClick={(e) => {
              e.preventDefault();
              navigate(r.id);
              onPick?.();
            }}
          >
            <Icon name={r.icon} size={22} />
            {showLabels ? <span className="nav-text">{r.label}</span> : <span className="nav-tip" aria-hidden="true">{r.label}</span>}
            {r.id === 'focus' && active && (
              <span className={`nav-live ${active.status === 'paused' ? 'is-paused' : ''}`} title={`${fmtClock(remainingMs)} left`}>
                <span className="visually-hidden">Session {active.status === 'paused' ? 'paused' : 'running'}</span>
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar({ route }) {
  const [open, setOpen] = useState(false);
  const { active, remainingMs } = useTimer();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <nav className="sidebar" aria-label="Main">
        <a
          href="#home"
          className="sidebar-mark"
          aria-label="vaa kannamma home"
          onClick={(e) => {
            e.preventDefault();
            navigate('home');
          }}
        >
          <Lotus size={40} water={false} />
        </a>
        <NavLinks route={route} />
      </nav>

      <div className="topbar">
        <button className="btn-icon" aria-label="Open navigation" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>
          <Icon name="menu" size={22} />
        </button>
        <span className="topbar-brand">
          <Lotus size={28} water={false} /> vaa kannamma
        </span>
        {active ? (
          <a
            href="#focus"
            className="topbar-timer"
            onClick={(e) => {
              e.preventDefault();
              navigate('focus');
            }}
          >
            <Icon name={active.status === 'paused' ? 'pause' : 'timer'} size={16} />
            {fmtClock(remainingMs)}
          </a>
        ) : (
          <span className="topbar-spacer" />
        )}
      </div>

      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <nav id="drawer" className="drawer" aria-label="Main" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="topbar-brand">
                <Lotus size={30} water={false} /> vaa kannamma
              </span>
              <button className="btn-icon" aria-label="Close navigation" onClick={() => setOpen(false)} autoFocus>
                <Icon name="x" />
              </button>
            </div>
            <NavLinks route={route} onPick={() => setOpen(false)} showLabels />
          </nav>
        </div>
      )}
    </>
  );
}

export function DemoBanner() {
  const { mode, setMode } = useStore();
  if (mode !== 'demo') return null;
  return (
    <div className="demo-banner" role="note">
      <Icon name="sparkle" size={18} />
      <p>
        <strong>Showcase mode.</strong> You are viewing sample data. Changes here stay in the sample set; your personal records are untouched.
      </p>
      <button className="btn btn-sm btn-ghost" onClick={() => setMode('personal')}>
        Back to my data
      </button>
    </div>
  );
}

// Faint sage sprigs near the page edges. Purely decorative.
export function Botanicals() {
  return (
    <div className="botanicals" aria-hidden="true">
      <svg className="sprig sprig-tr" viewBox="0 0 160 200" width="160" height="200">
        <path d="M150 4 C120 50 104 100 96 196" />
        <path d="M134 40 c-22-6-34 2-40 14 c18 4 32-2 40-14z" />
        <path d="M122 74 c18-12 32-10 40-2 c-14 10-28 10-40 2z" />
        <path d="M110 108 c-22-4-34 6-38 18 c18 2 30-4 38-18z" />
        <path d="M104 142 c16-12 30-12 38-4 c-14 10-26 10-38 4z" />
      </svg>
      <svg className="sprig sprig-bl" viewBox="0 0 200 160" width="200" height="160">
        <path d="M4 150 C50 130 100 118 196 112" />
        <path d="M40 136 c-4-20 6-32 18-36 c2 16-6 28-18 36z" />
        <path d="M78 124 c-10-18-6-32 4-38 c8 14 6 28-4 38z" />
        <path d="M118 118 c-2-20 8-30 20-34 c0 16-8 28-20 34z" />
      </svg>
      <svg className="lotus-ghost" viewBox="0 0 120 94" width="260" height="204">
        <path d="M60 78 C47 62 48 36 60 16 C72 36 73 62 60 78 Z" />
        <path d="M60 78 C40 72 30 52 32 34 C48 42 58 58 60 78 Z" />
        <path d="M60 78 C80 72 90 52 88 34 C72 42 62 58 60 78 Z" />
        <path d="M60 78 C34 80 18 68 12 54 C30 54 48 62 60 78 Z" />
        <path d="M60 78 C86 80 102 68 108 54 C90 54 72 62 60 78 Z" />
      </svg>
    </div>
  );
}
