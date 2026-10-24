import React from 'react';

const P = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5" />
    </>
  ),
  tasks: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="m8 12.2 2.8 2.8L16.2 9" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.4 1.6M9.5 3h5M18.5 6.5l1.2-1.2" />
    </>
  ),
  analytics: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M4.5 16.5c2.5-4 4.5-4.5 6.5-2.5s3.5-5 8.5-9" />
      <circle cx="19.5" cy="5" r="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  contract: (
    <>
      <path d="M6.5 3.5h7.5l4 4v13h-11.5z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 15.5c1.2-1.6 2-1.6 2.6-.2.6 1.4 1.6 1.2 3.4-.8M9 11h4" />
    </>
  ),
  review: (
    <>
      <path d="M12 6.5c-2.2-1.6-5-2-8-1.5v14c3-.5 5.8 0 8 1.5 2.2-1.5 5-2 8-1.5V5c-3-.5-5.8-.1-8 1.5z" />
      <path d="M12 6.5v14" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4.5 19.5h4l10-10-4-4-10 10z" />
      <path d="m13 7 4 4" />
    </>
  ),
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="6.5" r="1.3" />
      <circle cx="15" cy="6.5" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="17.5" r="1.3" />
      <circle cx="15" cy="17.5" r="1.3" />
    </g>
  ),
  chevL: <path d="m14.5 6-6 6 6 6" />,
  chevR: <path d="m9.5 6 6 6-6 6" />,
  chevD: <path d="m6 9.5 6 6 6-6" />,
  chevU: <path d="m6 14.5 6-6 6 6" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  upload: <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.2l2.8 1.8" />
    </>
  ),
  flag: <path d="M6 20.5V4.5M6 5h10.5l-2 3.5 2 3.5H6" />,
  board: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.2 4.5v15M14.8 4.5v15" />
    </>
  ),
  list: <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.5M4.5 12h.5M4.5 17h.5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16M10 6c.6-.1 1.3-.2 2-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.4 7.6C3.9 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1" />
    </>
  ),
  exam: (
    <>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5z" />
      <path d="M6.5 11v4.5c3 2 8 2 11 0V11M21.5 9v5" />
    </>
  ),
  doc: (
    <>
      <path d="M6.5 3.5h7.5l4 4v13h-11.5z" />
      <path d="M14 3.5v4h4M9.5 12.5h5M9.5 16h5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13.5 14-14 .2 9-4.8 14-13 14" />
      <path d="M5 19l8-8" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12H8.5A3.5 3.5 0 0 1 5 16.5z" />
      <path d="M5 16.5A3.5 3.5 0 0 1 8.5 13H19" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.5h14v10l-5 5H5z" />
      <path d="M14 19.5v-5h5M8.5 9h7M8.5 12.5h4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.3" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  sparkle: <path d="M12 3.5c.8 4.4 2.9 6.6 7.5 7.5-4.6.9-6.7 3.1-7.5 7.5-.8-4.4-2.9-6.6-7.5-7.5 4.6-.9 6.7-3.1 7.5-7.5z" />,
  lotus: (
    <>
      <path d="M12 19c-2.5-2.6-2.5-8 0-12 2.5 4 2.5 9.4 0 12z" />
      <path d="M12 19c-3.8-.6-6.7-4-6.5-8 3.4 1 5.8 4.2 6.5 8zM12 19c3.8-.6 6.7-4 6.5-8-3.4 1-5.8 4.2-6.5 8z" />
      <path d="M4 19.5h16" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".6" fill="currentColor" />
    </>
  ),
};

export function Icon({ name, size = 20, className = '', title, strokeWidth = 1.6 }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {P[name] || P.info}
    </svg>
  );
}
