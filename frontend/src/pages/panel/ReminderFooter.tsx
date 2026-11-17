import { useEffect, useState } from 'react';
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

  const [minutes, setMinutes] = useState<string>('30');
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings.data) setMinutes(settings.data.reminderMinutesBefore === null ? '' : String(settings.data.reminderMinutesBefore));
  }, [settings.data]);
  useEffect(() => {
    if (sent.data) setNotifications(sent.data);
  }, [sent.data]);

  async function changeMinutes(value: string) {
    const previous = minutes;
    setMinutes(value);
    setStatus('');
    try {
      await updateReminderSettings(value === '' ? null : (Number(value) as ReminderMinutes));
    } catch (failure) {
      setMinutes(previous);
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
        <select id="reminder-minutes" value={minutes} onChange={(event) => void changeMinutes(event.target.value)}>
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
        {status && <span className="reminder-status">{status}</span>}
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
