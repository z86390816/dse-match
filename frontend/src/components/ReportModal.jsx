import { useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n.jsx';

// 用戶上報數據錯誤的彈窗表單。initialProgramme 可預填相關專業。
export default function ReportModal({ onClose, initialProgramme = '' }) {
  const { t, lang } = useLang();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | fail

  async function submit() {
    if (!message.trim()) { setState('empty'); return; }
    setState('sending');
    try {
      await api.report({ programme: initialProgramme, message, contact, lang });
      setState('done');
    } catch {
      setState('fail');
    }
  }

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-box" onClick={(e) => e.stopPropagation()}>
        <button className="report-close" onClick={onClose} aria-label="close">×</button>
        <h3>{t('reportTitle')}</h3>

        {state === 'done' ? (
          <p className="report-thanks">✅ {t('reportThanks')}</p>
        ) : (
          <>
            {initialProgramme && <p className="report-prog">🎯 {initialProgramme}</p>}
            <label className="report-label">{t('reportMessage')}</label>
            <textarea
              className="report-textarea" rows={4} value={message}
              placeholder={t('reportPlaceholder')}
              onChange={(e) => { setMessage(e.target.value); if (state === 'empty') setState('idle'); }}
            />
            <label className="report-label">{t('reportContact')}</label>
            <input
              className="report-input" value={contact}
              placeholder="Email / IG / WhatsApp…"
              onChange={(e) => setContact(e.target.value)}
            />
            {state === 'empty' && <p className="report-err">{t('reportEmpty')}</p>}
            {state === 'fail' && (
              <p className="report-err">{t('reportFail')} <a href="mailto:feedback@dsemarks.com">feedback@dsemarks.com</a></p>
            )}
            <button className="report-send" onClick={submit} disabled={state === 'sending'}>
              {state === 'sending' ? t('reportSending') : t('reportSend')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
