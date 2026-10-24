import React, { useRef, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Icon } from './Icon.jsx';
import { downloadText, copyText } from '../lib/util.js';

// Offers a download plus a copy fallback (some embedded viewers block downloads).
export function ExportDialog({ open, onClose, title, filename, text, type }) {
  const [msg, setMsg] = useState('');
  const ref = useRef(null);
  return (
    <Modal
      open={open}
      onClose={() => (setMsg(''), onClose())}
      title={title}
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              const ok = await copyText(text);
              if (!ok) ref.current?.select();
              setMsg(ok ? 'Copied to the clipboard.' : 'Copy was blocked, so the text is selected. Press Ctrl+C or ⌘C.');
            }}
          >
            <Icon name="copy" size={16} /> Copy
          </button>
          <button className="btn btn-primary" onClick={() => setMsg(downloadText(filename, text, type) ? `Downloading ${filename}. If nothing happens, use Copy instead.` : 'Download is blocked here. Use Copy instead.')}>
            <Icon name="download" size={16} /> Download {filename}
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="export-text">
        Contents
      </label>
      <textarea id="export-text" ref={ref} className="textarea mono" rows={8} readOnly value={text} />
      <p className="muted small" role="status">
        {msg || `${(new Blob([text]).size / 1024).toFixed(1)} KB`}
      </p>
    </Modal>
  );
}
