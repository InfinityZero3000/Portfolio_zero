import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { cleanupLegacyServiceWorker } from './serviceWorkerRegistration';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error("Could not find root element to mount to");
}

// Hide loading screen immediately when React starts mounting
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.classList.add('hide');
  // Remove from DOM after animation completes
  setTimeout(() => loadingScreen.remove(), 300);
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Remove the legacy offline cache so each deploy loads a coherent asset graph.
cleanupLegacyServiceWorker();
