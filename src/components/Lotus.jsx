import React from 'react';

// Thin silver-and-mauve line-art lotus. Petals rotate open around the base on mount
// when `bloom` is set; `breathing` adds a very slow sway while a session runs.
// Both animations are disabled under reduced motion (see lotus.css rules).
const PETALS = [
  // angle, scale, stroke, layer
  { a: -82, s: 0.62, c: 'silver', back: true },
  { a: 82, s: 0.62, c: 'silver', back: true },
  { a: -56, s: 0.8, c: 'mauve' },
  { a: 56, s: 0.8, c: 'mauve' },
  { a: -27, s: 0.94, c: 'silver' },
  { a: 27, s: 0.94, c: 'silver' },
  { a: 0, s: 1, c: 'mauve' },
];
const PETAL = 'M60 78 C47 62 48 36 60 16 C72 36 73 62 60 78 Z';
const VEIN = 'M60 74 C58 58 58 40 60 24';

export function Lotus({ size = 120, bloom = false, breathing = false, className = '', water = true, label }) {
  return (
    <svg
      className={`lotus ${bloom ? 'lotus-bloom' : ''} ${breathing ? 'lotus-breathe' : ''} ${className}`}
      width={size}
      height={size * 0.78}
      viewBox="0 0 120 94"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <g className="lotus-flower">
        {PETALS.map((p, i) => (
          <g
            key={i}
            className={`lotus-petal ${p.back ? 'is-back' : ''}`}
            style={{ '--a': `${p.a}deg`, '--s': p.s, '--d': `${i * 70}ms` }}
          >
            <path d={PETAL} className={`petal-shape petal-${p.c}`} />
            <path d={VEIN} className="petal-vein" />
          </g>
        ))}
        <circle cx="60" cy="74" r="2.2" className="lotus-heart" />
      </g>
      {water && (
        <g className="lotus-water">
          <path d="M14 82 C34 78 48 80 60 80 C72 80 86 78 106 82" />
          <path d="M28 88 C44 85 76 85 92 88" className="ripple" />
          <path d="M16 80 c4-6 12-6 16 0 c-5 2-11 2-16 0z" className="pad" />
          <path d="M88 80 c4-6 12-6 16 0 c-5 2-11 2-16 0z" className="pad" />
        </g>
      )}
    </svg>
  );
}

// Tiny lotus used for completion feedback.
export function TinyLotus({ size = 18, className = '' }) {
  return (
    <svg className={`tiny-lotus ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 19c-2.5-2.6-2.5-8 0-12 2.5 4 2.5 9.4 0 12z" />
      <path d="M12 19c-3.8-.6-6.7-4-6.5-8 3.4 1 5.8 4.2 6.5 8zM12 19c3.8-.6 6.7-4 6.5-8-3.4 1-5.8 4.2-6.5 8z" />
    </svg>
  );
}
