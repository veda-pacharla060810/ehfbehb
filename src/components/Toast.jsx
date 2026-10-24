import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const counter = useRef(0);
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message, { tone = 'info', duration = 4000, action } = {}) => {
      const id = ++counter.current;
      setItems((xs) => [...xs.slice(-3), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                className="btn btn-text btn-sm"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="btn-icon btn-sm" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
