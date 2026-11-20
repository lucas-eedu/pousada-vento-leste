import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthGate } from './auth/AuthGate';
import './styles.css';
import './components.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>{(session, onLogout) => <App username={session.username} onLogout={onLogout} />}</AuthGate>
  </React.StrictMode>
);
