import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Index.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, rendering app...');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('App rendered');

// Register service worker for caching and offline support (production only)
// if (process.env.NODE_ENV === 'production') {
//   registerServiceWorker();
// }