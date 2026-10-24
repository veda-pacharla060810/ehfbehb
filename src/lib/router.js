import { useEffect, useState } from 'react';

// Hash routing with bare tokens (#tasks, #focus …) so it works on any static host
// and inside embedded viewers that only pass simple anchors.
export const ROUTES = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'focus', label: 'Focus Sessions', icon: 'timer' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'calendar', label: 'Calendar & Exams', icon: 'calendar' },
  { id: 'contracts', label: 'Focus Contracts', icon: 'contract' },
  { id: 'review', label: 'Weekly Review', icon: 'review' },
  { id: 'preferences', label: 'Settings', icon: 'settings' },
];
const IDS = ROUTES.map((r) => r.id);

function parse() {
  try {
    const h = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    return IDS.includes(h) ? h : 'home';
  } catch {
    return 'home';
  }
}

let listeners = [];
let current = typeof window !== 'undefined' ? parse() : 'home';

export function navigate(id) {
  const next = IDS.includes(id) ? id : 'home';
  current = next;
  try {
    if (window.location.hash.replace('#', '') !== next) window.history.pushState(null, '', `#${next}`);
  } catch {
    /* some sandboxes block history; in-memory routing still works */
  }
  listeners.forEach((l) => l(next));
}

export function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const l = (r) => setRoute(r);
    listeners.push(l);
    const onHash = () => {
      current = parse();
      listeners.forEach((fn) => fn(current));
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      listeners = listeners.filter((x) => x !== l);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);
  return route;
}
