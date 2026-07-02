import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const isAdmin = window.location.hash.replace(/^#\/?/, '').startsWith('admin');

if (isAdmin) {
  // 後台：獨立惰性載入，不含分析、不影響主站包大小
  import('./admin/AdminApp.jsx').then(({ default: AdminApp }) => {
    root.render(<React.StrictMode><AdminApp /></React.StrictMode>);
  });
} else {
  Promise.all([
    import('./App.jsx'),
    import('./i18n.jsx'),
    import('./analytics'),
    import('@vercel/analytics'),
  ]).then(([{ default: App }, { LangProvider }, { initAnalytics }, { inject }]) => {
    initAnalytics();
    inject(); // Vercel Web Analytics（部署到 Vercel 才會回報）
    root.render(
      <React.StrictMode>
        <LangProvider>
          <App />
        </LangProvider>
      </React.StrictMode>
    );
  });
}
