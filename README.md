# vaa kannamma

A personal botanical productivity journal: tasks, a focus timer, focus contracts, a calendar for exams, honest analytics and a weekly review. Frontend only. Everything is stored in your browser.

- No accounts, backend, database, tracking or AI.
- Personal records persist in `localStorage` with a versioned schema.
- A separate, clearly labelled **showcase mode** uses sample data that never mixes with your own.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

Requires Node 18 or newer.

## Deploy

`dist/` is a plain static site with relative paths and hash routing (`#tasks`, `#focus` …), so it works on any static host with no rewrite rules:

- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** run `npm run build` and publish the `dist/` folder (for example with the `peaceiris/actions-gh-pages` action, or by pushing `dist/` to a `gh-pages` branch).

`npm run build:single` produces a single self-contained `dist-single/index.html` (React loaded from cdnjs). `node scripts/make-artifact.mjs` turns that into a page fragment for hosts that supply their own HTML skeleton.

## What's inside

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Providers, app shell, routing between the eight sections |
| `src/store/schema.js` | Data shapes, defaults and safe normalisers for every record |
| `src/store/storage.js` | `localStorage` access, corruption handling, backup format |
| `src/store/StoreContext.jsx` | State for the current mode (personal or showcase) and every action |
| `src/store/TimerContext.jsx` | Timestamp-based timer view shared by every page |
| `src/store/demoData.js` | Seeded sample dataset, generated relative to today |
| `src/lib/metrics.js` | All analytics calculations and the deterministic weekly summary |
| `src/lib/ics.js` | iCalendar export and import |
| `src/components/` | Sidebar, lotus art, cards, charts, dialogs, toasts, sortable lists |
| `src/pages/` | Home, Tasks, Focus, Analytics, Calendar, Contracts, Weekly Review, Settings |
| `src/styles/` | Design tokens, base styles, components and page layouts |

## How the timer stays accurate

The active session stores its start time, planned length, time accumulated before the last pause, and the timestamp of the current running segment. Remaining time is always computed from those timestamps, never by counting ticks. The session lives in app-level state and in storage, so switching sections, switching tabs or reloading does not lose time. If the planned time ran out while the page was in the background or closed, the session is recorded as complete with its true end time the next time the app is open.

Browser limits: background pages may be throttled, so the display catches up when you return. There are no alarms, sounds or notifications.

## Analytics rules

Every figure is derived from records saved in the app. The Analytics page explains each formula. Rates are hidden until there is enough data (for example, task completion needs at least three eligible tasks). Contracts are only counted as fulfilled when you mark them so.

## Data and privacy

- Backups (Settings → Data) contain personal records and settings, never sample data.
- Restoring a backup asks for confirmation and shows what will be replaced.
- Unreadable stored data is copied aside (`…:corrupt:<timestamp>`) and the app starts with what it can read.
- The only external request is for Google Fonts.

## Keyboard

Tab and Shift+Tab move between controls, Enter or Space activates, Escape closes dialogs and the mobile menu, and arrow keys reorder tasks or dashboard cards from their drag handles.
