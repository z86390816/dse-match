import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { initAnalytics } from './analytics';
import { LangProvider } from './i18n.jsx';
import { inject as injectVercelAnalytics } from '@vercel/analytics';

initAnalytics();
injectVercelAnalytics(); // Vercel Web Analytics（部署到 Vercel 才會回報）

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>
);
