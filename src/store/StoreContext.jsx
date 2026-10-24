import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { emptyData, normalizeData, normalizePrefs, defaultPrefs } from './schema.js';
import { KEYS, loadAll, writeJSON, readJSON } from './storage.js';
import { generateDemoData } from './demoData.js';
import { uid, clamp } from '../lib/util.js';
import { useToast } from '../components/Toast.jsx';

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

// Focused time for an active session, computed from timestamps (never from tick counts).
export function elapsedOf(a, now = Date.now()) {
  if (!a) return 0;
  return a.accumulatedMs + (a.status === 'running' && a.segmentStart ? Math.max(0, now - a.segmentStart) : 0);
}

// Moves the active session into history. Outcome 'completed' when it reached its plan.
function finalize(d, outcome, now) {
  const a = d.activeSession;
  if (!a) return d;
  const plannedMs = a.plannedSec * 1000;
  const actualMs = Math.min(elapsedOf(a, now), plannedMs);
  // When a running session ran out in the background, record the moment it actually ended.
  const endedAt =
    outcome === 'completed' && a.status === 'running' && a.segmentStart ? a.segmentStart + (plannedMs - a.accumulatedMs) : now;
  const rec = {
    id: a.id,
    label: a.label,
    taskId: a.taskId,
    taskTitle: a.taskTitle,
    contractId: a.contractId,
    plannedSec: a.plannedSec,
    actualSec: Math.round(actualMs / 1000),
    startedAt: a.startedAt,
    endedAt: Math.min(endedAt, now),
    outcome,
    note: '',
  };
  return {
    ...d,
    activeSession: null,
    lastFinishedId: rec.id,
    sessions: [rec, ...d.sessions.filter((s) => s.id !== rec.id)],
    contracts: a.contractId
      ? d.contracts.map((c) => (c.id === a.contractId ? { ...c, status: 'review', sessionId: rec.id } : c))
      : d.contracts,
  };
}

export function StoreProvider({ children }) {
  const toast = useToast();
  const [boot] = useState(loadAll);
  const [prefs, setPrefsState] = useState(boot.prefs);
  const [mode, setModeState] = useState(boot.mode === 'demo' && !boot.demo ? 'personal' : boot.mode);
  const [datasets, setDatasets] = useState({ personal: boot.personal, demo: boot.demo });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const dataRef = useRef(datasets[mode]);
  dataRef.current = datasets[mode] || datasets.personal;
  const warnedRef = useRef(false);

  useEffect(() => {
    boot.notices.forEach((n) => toast(n, { tone: 'warn', duration: 9000 }));
  }, [boot, toast]);

  const save = useCallback(
    (key, value) => {
      if (!writeJSON(key, value) && !warnedRef.current && boot.available) {
        warnedRef.current = true;
        toast('Saving failed. Browser storage may be full. Export a backup from Settings to keep your data safe.', {
          tone: 'warn',
          duration: 10000,
        });
      }
    },
    [toast, boot.available],
  );

  useEffect(() => save(KEYS.prefs, prefs), [prefs, save]);
  useEffect(() => save(KEYS.mode, mode), [mode, save]);
  useEffect(() => save(KEYS.personal, datasets.personal), [datasets.personal, save]);
  useEffect(() => {
    if (datasets.demo) save(KEYS.demo, datasets.demo);
  }, [datasets.demo, save]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEYS.personal || e.key === KEYS.demo) {
        const r = readJSON(e.key);
        if (r.ok && r.value) {
          const which = e.key === KEYS.personal ? 'personal' : 'demo';
          setDatasets((ds) => ({ ...ds, [which]: normalizeData(r.value) }));
        }
      } else if (e.key === KEYS.prefs) {
        const r = readJSON(e.key);
        if (r.ok && r.value) setPrefsState(normalizePrefs(r.value));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Apply a change to the dataset of the current mode only.
  const mutate = useCallback((fn) => {
    setDatasets((ds) => {
      const key = modeRef.current;
      const cur = ds[key] || emptyData();
      const next = fn(cur);
      return next === cur ? ds : { ...ds, [key]: next };
    });
  }, []);

  const setPrefs = useCallback((fn) => setPrefsState((p) => normalizePrefs(typeof fn === 'function' ? fn(p) : fn)), []);

  const setMode = useCallback(
    (m) => {
      if (m === 'demo') {
        setDatasets((ds) => (ds.demo ? ds : { ...ds, demo: generateDemoData(prefs.calendar.weekStart) }));
      }
      setModeState(m);
    },
    [prefs.calendar.weekStart],
  );

  const actions = useMemo(() => {
    const mapList = (key, id, fn) => (d) => ({ ...d, [key]: d[key].map((x) => (x.id === id ? fn(x) : x)) });
    const statusPatch = (t, patch) => {
      const next = { ...t, ...patch };
      if (patch.status && patch.status !== t.status) {
        next.completedAt = patch.status === 'done' ? Date.now() : null;
      }
      return next;
    };

    return {
      /* ---------- tasks ---------- */
      addTask(input) {
        const t = {
          id: uid('t'),
          title: input.title.trim().slice(0, 300),
          notes: input.notes || '',
          priority: input.priority || 'medium',
          due: input.due || null,
          categoryId: input.categoryId || null,
          status: 'todo',
          completedAt: null,
          createdAt: Date.now(),
          subtasks: [],
          order: 0,
        };
        mutate((d) => {
          const min = d.tasks.reduce((m, x) => Math.min(m, x.order), 0);
          return { ...d, tasks: [{ ...t, order: min - 1 }, ...d.tasks] };
        });
        return t;
      },
      updateTask(id, patch) {
        mutate(mapList('tasks', id, (t) => statusPatch(t, patch)));
      },
      toggleTask(id) {
        mutate(mapList('tasks', id, (t) => statusPatch(t, { status: t.status === 'done' ? 'todo' : 'done' })));
      },
      deleteTask(id) {
        mutate((d) => ({
          ...d,
          tasks: d.tasks.filter((t) => t.id !== id),
          contracts: d.contracts.map((c) => (c.taskId === id ? { ...c, taskId: null, customTask: c.customTask || 'Deleted task' } : c)),
        }));
      },
      // Reassign the order slots held by `ids` in their new sequence; other tasks keep their place.
      reorderTasks(ids) {
        mutate((d) => {
          const set = new Set(ids);
          const slots = d.tasks
            .filter((t) => set.has(t.id))
            .map((t) => t.order)
            .sort((a, b) => a - b);
          const pos = new Map(ids.map((id, i) => [id, slots[i]]));
          return { ...d, tasks: d.tasks.map((t) => (pos.has(t.id) ? { ...t, order: pos.get(t.id) } : t)) };
        });
      },
      addSubtask(taskId, title) {
        mutate(mapList('tasks', taskId, (t) => ({ ...t, subtasks: [...t.subtasks, { id: uid('st'), title: title.trim(), done: false }] })));
      },
      updateSubtask(taskId, subId, patch) {
        mutate(mapList('tasks', taskId, (t) => ({ ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, ...patch } : s)) })));
      },
      deleteSubtask(taskId, subId) {
        mutate(mapList('tasks', taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) })));
      },

      /* ---------- categories ---------- */
      addCategory(name, color) {
        mutate((d) => ({ ...d, categories: [...d.categories, { id: uid('cat'), name: name.trim().slice(0, 40), color }] }));
      },
      updateCategory(id, patch) {
        mutate(mapList('categories', id, (c) => ({ ...c, ...patch })));
      },
      deleteCategory(id) {
        mutate((d) => ({
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
          tasks: d.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
        }));
      },

      /* ---------- calendar ---------- */
      saveEvent(ev) {
        mutate((d) => {
          const exists = ev.id && d.events.some((e) => e.id === ev.id);
          const rec = { ...ev, id: ev.id || uid('e') };
          return { ...d, events: exists ? d.events.map((e) => (e.id === rec.id ? rec : e)) : [...d.events, rec] };
        });
      },
      deleteEvent(id) {
        mutate((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
      },
      importEvents(events) {
        mutate((d) => {
          const ids = new Set(d.events.map((e) => e.id));
          return { ...d, events: [...d.events, ...events.map((e) => (ids.has(e.id) ? { ...e, id: uid('e') } : e))] };
        });
      },

      /* ---------- contracts ---------- */
      addContract(input) {
        const c = {
          id: uid('c'),
          intention: input.intention.trim(),
          taskId: input.taskId || null,
          customTask: input.taskId ? '' : (input.customTask || '').trim(),
          minutes: clamp(Math.round(input.minutes) || 25, 1, 600),
          success: (input.success || '').trim(),
          status: 'pending',
          sessionId: null,
          note: '',
          createdAt: Date.now(),
          reviewedAt: null,
        };
        mutate((d) => ({ ...d, contracts: [c, ...d.contracts] }));
        return c;
      },
      reviewContract(id, status, note) {
        mutate(mapList('contracts', id, (c) => ({ ...c, status, note: note ?? c.note, reviewedAt: Date.now() })));
      },
      deleteContract(id) {
        mutate((d) => ({
          ...d,
          contracts: d.contracts.filter((c) => c.id !== id),
          sessions: d.sessions.map((s) => (s.contractId === id ? { ...s, contractId: null } : s)),
          activeSession: d.activeSession?.contractId === id ? { ...d.activeSession, contractId: null } : d.activeSession,
        }));
      },

      /* ---------- sessions ---------- */
      updateSession(id, patch) {
        mutate(mapList('sessions', id, (s) => ({ ...s, ...patch })));
      },
      deleteSession(id) {
        mutate((d) => ({
          ...d,
          sessions: d.sessions.filter((s) => s.id !== id),
          lastFinishedId: d.lastFinishedId === id ? null : d.lastFinishedId,
          contracts: d.contracts.map((c) => (c.sessionId === id ? { ...c, sessionId: null } : c)),
        }));
      },

      /* ---------- timer ---------- */
      startSession({ label, taskId, contractId, minutes }) {
        const now = Date.now();
        mutate((d) => {
          if (d.activeSession) return d;
          const contract = d.contracts.find((c) => c.id === contractId) || null;
          const task = d.tasks.find((t) => t.id === (taskId || contract?.taskId)) || null;
          const mins = clamp(Math.round(Number(minutes) || contract?.minutes || 25), 1, 600);
          const a = {
            id: uid('s'),
            label: (label || '').trim() || contract?.intention || task?.title || 'Focus session',
            taskId: task?.id || null,
            taskTitle: task?.title || contract?.customTask || '',
            contractId: contract?.id || null,
            plannedSec: mins * 60,
            status: 'running',
            startedAt: now,
            segmentStart: now,
            accumulatedMs: 0,
          };
          return {
            ...d,
            activeSession: a,
            lastFinishedId: null,
            contracts: contract ? d.contracts.map((c) => (c.id === contract.id ? { ...c, status: 'active' } : c)) : d.contracts,
          };
        });
      },
      pauseSession() {
        const now = Date.now();
        mutate((d) => {
          const a = d.activeSession;
          if (!a || a.status !== 'running') return d;
          if (elapsedOf(a, now) >= a.plannedSec * 1000) return finalize(d, 'completed', now);
          return { ...d, activeSession: { ...a, status: 'paused', accumulatedMs: elapsedOf(a, now), segmentStart: null } };
        });
      },
      resumeSession() {
        mutate((d) => {
          const a = d.activeSession;
          if (!a || a.status !== 'paused') return d;
          return { ...d, activeSession: { ...a, status: 'running', segmentStart: Date.now() } };
        });
      },
      // Returns true when the session was recorded; sessions under a minute are discarded.
      stopSession() {
        const now = Date.now();
        const a = dataRef.current?.activeSession;
        if (!a) return false;
        const el = elapsedOf(a, now);
        if (el < 60000) {
          mutate((d) => ({
            ...d,
            activeSession: null,
            contracts: a.contractId ? d.contracts.map((c) => (c.id === a.contractId ? { ...c, status: 'pending' } : c)) : d.contracts,
          }));
          return false;
        }
        mutate((d) => (d.activeSession ? finalize(d, el >= a.plannedSec * 1000 ? 'completed' : 'ended-early', now) : d));
        return true;
      },
      // Idempotent: called on every tick, on focus and on load.
      finishIfDue() {
        const now = Date.now();
        mutate((d) => {
          const a = d.activeSession;
          if (!a || a.status !== 'running') return d;
          return elapsedOf(a, now) >= a.plannedSec * 1000 ? finalize(d, 'completed', now) : d;
        });
      },
      dismissFinished() {
        mutate((d) => (d.lastFinishedId ? { ...d, lastFinishedId: null } : d));
      },

      /* ---------- weekly review ---------- */
      saveReview(weekStart, patch) {
        mutate((d) => {
          const prev = d.reviews[weekStart] || { weekStart, wins: '', unfinished: '', challenges: '', adjustments: '', notes: '', nextGoals: '', importantTasks: '', status: 'draft' };
          return { ...d, reviews: { ...d.reviews, [weekStart]: { ...prev, ...patch, weekStart, updatedAt: Date.now() } } };
        });
      },
    };
  }, [mutate]);

  /* ---------- data management (always explicit about which dataset) ---------- */
  const dataActions = useMemo(
    () => ({
      replacePersonal(data, newPrefs) {
        setDatasets((ds) => ({ ...ds, personal: normalizeData(data) }));
        if (newPrefs) setPrefsState(normalizePrefs(newPrefs));
      },
      clearPersonal() {
        setDatasets((ds) => ({ ...ds, personal: emptyData() }));
      },
      resetDemo() {
        setDatasets((ds) => ({ ...ds, demo: generateDemoData(prefs.calendar.weekStart) }));
      },
      resetPrefs() {
        setPrefsState(defaultPrefs());
      },
    }),
    [prefs.calendar.weekStart],
  );

  const data = datasets[mode] || datasets.personal;
  const value = useMemo(
    () => ({ mode, setMode, data, prefs, setPrefs, actions, dataActions, personal: datasets.personal, storageOK: boot.available }),
    [mode, setMode, data, prefs, setPrefs, actions, dataActions, datasets.personal, boot.available],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
