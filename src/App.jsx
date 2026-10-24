import React, { useEffect, useRef } from 'react';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/Modal.jsx';
import { StoreProvider, useStore } from './store/StoreContext.jsx';
import { TimerProvider } from './store/TimerContext.jsx';
import { Sidebar, DemoBanner, Botanicals } from './components/Shell.jsx';
import { useRoute } from './lib/router.js';
import Home from './pages/Home.jsx';
import Tasks from './pages/Tasks.jsx';
import Focus from './pages/Focus.jsx';
import Analytics from './pages/Analytics.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Contracts from './pages/Contracts.jsx';
import WeeklyReview from './pages/WeeklyReview.jsx';
import Settings from './pages/Settings.jsx';

const PAGES = {
  home: Home,
  tasks: Tasks,
  focus: Focus,
  analytics: Analytics,
  calendar: CalendarPage,
  contracts: Contracts,
  review: WeeklyReview,
  preferences: Settings,
};

function useApplyPrefs(prefs) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = prefs.appearance.accent;
    root.dataset.botanical = prefs.appearance.botanical;
    root.dataset.density = prefs.appearance.density;
    root.dataset.motion = prefs.a11y.motion;
    root.style.setProperty('--font-scale', String(prefs.a11y.fontScale));
  }, [prefs]);
}

function Shell() {
  const route = useRoute();
  const { prefs, mode } = useStore();
  useApplyPrefs(prefs);
  const first = useRef(true);
  const Page = PAGES[route] || Home;

  // Move focus to the new page heading for keyboard and screen-reader users.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    requestAnimationFrame(() => document.querySelector('[data-page-title]')?.focus({ preventScroll: true }));
  }, [route]);

  return (
    <div className={`app mode-${mode}`}>
      <a className="skip-link" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <Botanicals />
      <Sidebar route={route} />
      <main id="main" tabIndex={-1} className="main">
        <DemoBanner />
        <Page key={`${route}-${mode}`} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <TimerProvider>
          <ConfirmProvider>
            <Shell />
          </ConfirmProvider>
        </TimerProvider>
      </StoreProvider>
    </ToastProvider>
  );
}
