import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { BRAND_NAME } from '@/config/brand';

function registerServiceWorker() {
  void navigator.serviceWorker
    .register('/sw.js')
    .catch((error: unknown) => {
      console.error(`${BRAND_NAME} service worker registration failed:`, error);
    });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
