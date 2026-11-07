import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { deleteAppointment, listAppointments, updateAppointment } from '../../../api/appointments';
import { ApiError } from '../../../api/client';
import type { AppointmentView } from '../../../api/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { addDays, dateFromQuery, formatLong, today } from '../../../lib/date';
import { statusLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import { AppointmentForm } from './AppointmentForm';
import './DailyPage.css';

function clientName(appointment: AppointmentView): string {
  return `${appointment.client.firstName} ${appointment.client.lastName}`;
}

export function DailyPage() {
  const [params, setParams] = useSearchParams();
  const date = dateFromQuery(params.get('tarih'));
  const { data: appointments, loading, error, reload } = useApi(() => listAppointments(date, date), [date]);

  const [editing, setEditing] = useState<AppointmentView | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AppointmentView | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const goTo = (target: string) => setParams({ tarih: target });

  async function cancel(appointment: AppointmentView) {
    setActionError('');
    try {
      await updateAppointment(appointment.id, { status: 'cancelled' });
      reload();
    } catch (failure) {
      setActionError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteError('');
    setDeletingBusy(true);
    try {
      await deleteAppointment(deleting.id);
      setDeleting(null);
      reload();
    } catch (failure) {
      setDeleteError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
    } finally {
      setDeletingBusy(false);
    }
  }

  function renderList() {
    if (error) {
      return (
        <div className="daily-state">
          <p>{error.message}</p>
          <button className="daily-retry" type="button" onClick={reload}>
            Yeniden dene
          </button>
        </div>
      );
    }
    if (!appointments && loading) return <p className="daily-state">Randevular yükleniyor…</p>;
    if (!appointments || appointments.length === 0) return <p className="daily-state">Bu gün için randevu yok</p>;
    return (
      <ul className="daily-list">
        {appointments.map((appointment) => {
          const name = clientName(appointment);
          return (
            <li className="daily-row" key={appointment.id}>
              <span className="daily-time">
                {appointment.startTime}–{appointment.endTime}
              </span>
              <div className="daily-info">
                <strong>{name}</strong>
                {appointment.note && <span className="daily-note">{appointment.note}</span>}
              </div>
              <span className={appointment.status === 'cancelled' ? 'daily-status daily-status-off' : 'daily-status'}>
                {statusLabel(appointment.status)}
              </span>
              <div className="daily-actions">
                <button type="button" aria-label={`Düzenle: ${name}`} onClick={() => setEditing(appointment)}>
                  Düzenle
                </button>
                {appointment.status !== 'cancelled' && (
                  <button type="button" aria-label={`İptal et: ${name}`} onClick={() => void cancel(appointment)}>
                    İptal et
                  </button>
                )}
                <button type="button" aria-label={`Sil: ${name}`} onClick={() => setDeleting(appointment)}>
                  Sil
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="daily">
      <div className="daily-head">
        <div className="daily-nav">
          <button type="button" aria-label="Önceki gün" onClick={() => goTo(addDays(date, -1))}>
            ‹
          </button>
          <h1>{formatLong(date)}</h1>
          <button type="button" aria-label="Sonraki gün" onClick={() => goTo(addDays(date, 1))}>
            ›
          </button>
          <button className="daily-today" type="button" onClick={() => goTo(today())}>
            Bugün
          </button>
        </div>
        <button className="daily-add" type="button" onClick={() => setEditing('new')}>
          Randevu ekle
        </button>
      </div>

      {actionError && (
        <p className="daily-action-error" role="alert">
          {actionError}
        </p>
      )}
      {renderList()}

      {editing && (
        <AppointmentForm
          appointment={editing === 'new' ? undefined : editing}
          defaultDate={date}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Randevuyu sil"
          message={`${clientName(deleting)} ile ${deleting.startTime}–${deleting.endTime} randevusu silinsin mi? Bu işlem geri alınamaz.`}
          confirmLabel="Sil"
          error={deleteError}
          busy={deletingBusy}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setDeleteError('');
          }}
        />
      )}
    </section>
  );
}
