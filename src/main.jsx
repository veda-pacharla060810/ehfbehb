import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

const mount = () => createRoot(document.getElementById('root')).render(<App />);
// The single-file build runs as a classic script in <head>, before #root exists.
if (document.getElementById('root')) mount();
else document.addEventListener('DOMContentLoaded', mount, { once: true });
