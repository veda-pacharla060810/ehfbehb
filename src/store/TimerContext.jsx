import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore, elapsedOf } from './StoreContext.jsx';
import { fmtClock } from '../lib/date.js';

// App-level timer view. The source of truth is the timestamps stored on
// `data.activeSession`, so navigation, tab switches and reloads never lose time.
const TimerCtx = createContext(null);
export const useTimer = () => useContext(TimerCtx);

export function TimerProvider({ children }) {
  const { data, actions } = useStore();
  const a = data.activeSession;
  const [now, setNow] = useState(Date.now());
  const running = a?.status === 'running';

  useEffect(() => {
    if (!running) return undefined;
    const refresh = () => setNow(Date.now());
    refresh();
    // The interval only refreshes the display; time is always derived from timestamps.
    const id = setInterval(refresh, 500);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, [running, a?.id]);

  const elapsedMs = elapsedOf(a, Math.max(now, Date.now() - 1000));
  const plannedMs = a ? a.plannedSec * 1000 : 0;
  const remainingMs = Math.max(0, plannedMs - elapsedMs);

  useEffect(() => {
    if (running && remainingMs <= 0) actions.finishIfDue();
  }, [running, remainingMs, actions]);

  useEffect(() => {
    const base = 'vaa kannamma';
    document.title = a ? `${a.status === 'paused' ? 'Paused · ' : ''}${fmtClock(remainingMs)} · ${base}` : base;
  }, [a, remainingMs]);

  const value = { active: a, elapsedMs, remainingMs, plannedMs, progress: plannedMs ? Math.min(1, elapsedMs / plannedMs) : 0 };
  return <TimerCtx.Provider value={value}>{children}</TimerCtx.Provider>;
}
