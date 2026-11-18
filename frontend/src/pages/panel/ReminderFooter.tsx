import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { checkRemindersNow, getReminderSettings, listSentReminders, updateReminderSettings } from '../../api/reminders';
import { REMINDER_MINUTES, type ReminderMinutes, type ReminderNotification } from '../../api/types';
import { useApi } from '../../lib/useApi';
import './ReminderFooter.css';

/**
 * Panelin altındaki hatırlatma ayarları. Yüklenemezse sessizce varsayılan durumda kalır:
 * sayfanın asıl işi bozulmasın.
 */
export function ReminderFooter() {
  const settings = useApi(getReminderSettings, []);
  const sent = useApi(listSentReminders, []);

  const [minutes, setMinutes] = useState<string>('');
  // Sunucunun onayladığı son değer ve en yeni değişikliğin sırası: eski bir hata yeni seçimi ezmesin.
  const confirmed = useRef('');
  const latest = useRef(0);
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const loaded = settings.data !== undefined;
  useEffect(() => {
    if (!settings.data) return;
    const value = settings.data.reminderMinutesBefore === null ? '' : String(settings.data.reminderMinutesBefore);
    confirmed.current = value;
    setMinutes(value);
  }, [settings.data]);

  // Zamanlayıcının gönderdiği hatırlatmalar da görünsün diye liste dakikada bir yenilenir.
  const reloadSent = useRef(sent.reload);
  reloadSent.current = sent.reload;
  useEffect(() => {
    const timer = setInterval(() => reloadSent.current(), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (sent.data) setNotifications(sent.data);
  }, [sent.data]);

  async function changeMinutes(value: string) {
    const token = ++latest.current;
    setMinutes(value);
    setStatus('');
    try {
      await updateReminderSettings(value === '' ? null : (Number(value) as ReminderMinutes));
      if (token === latest.current) confirmed.current = value;
    } catch (failure) {
      if (token !== latest.current) return;
      setMinutes(confirmed.current);
      setStatus(failure instanceof ApiError ? failure.message : 'Ayar kaydedilemedi.');
    }
  }

  async function checkNow() {
    setStatus('');
    setBusy(true);
    try {
      const result = await checkRemindersNow();
      setNotifications((current) => [...result.notifications, ...current]);
      setStatus(result.sentCount === 0 ? 'Gönderilecek hatırlatma yok.' : `${result.sentCount} hatırlatma gönderildi.`);
    } catch (failure) {
      setStatus(failure instanceof ApiError ? failure.message : 'Kontrol yapılamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="panel-footer">
      <div className="reminder-controls">
        <label htmlFor="reminder-minutes">Hatırlatma süresi</label>
        <select
          id="reminder-minutes"
          value={loaded ? minutes : 'unknown'}
          disabled={!loaded}
          onChange={(event) => void changeMinutes(event.target.value)}
        >
          {!loaded && <option value="unknown">{settings.error ? 'Yüklenemedi' : 'Yükleniyor…'}</option>}
          <option value="">Kapalı</option>
          {REMINDER_MINUTES.map((value) => (
            <option key={value} value={value}>
              {value} dakika önce
            </option>
          ))}
        </select>
        <button type="button" disabled={busy} onClick={() => void checkNow()}>
          Şimdi kontrol et
        </button>
        {status && (
          <span className="reminder-status" role="status">
            {status}
          </span>
        )}
      </div>
      {notifications.length > 0 && (
        <ul className="reminder-list" aria-label="Gönderilen hatırlatmalar">
          {notifications.map((item) => (
            <li key={item.id}>
              <strong>{item.subject}</strong>
              <span className="reminder-to">Alıcı: {item.recipientEmail}</span>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
