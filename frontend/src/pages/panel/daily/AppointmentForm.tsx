import { useState, type FormEvent } from 'react';
import { createAppointment, updateAppointment } from '../../../api/appointments';
import { ApiError } from '../../../api/client';
import { listClients } from '../../../api/clients';
import { APPOINTMENT_STATUSES, type AppointmentStatus, type AppointmentView } from '../../../api/types';
import { Modal } from '../../../components/Modal';
import { statusLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import './AppointmentForm.css';

interface AppointmentFormProps {
  /** Verilirse düzenleme, verilmezse yeni randevu. */
  appointment?: AppointmentView;
  /** Yeni randevuda tarih alanının başlangıç değeri (açık olan gün). */
  defaultDate: string;
  onSaved: () => void;
  onClose: () => void;
}

export function AppointmentForm({ appointment, defaultDate, onSaved, onClose }: AppointmentFormProps) {
  const clientsResult = useApi(() => listClients(), []);
  const clients = clientsResult.data ?? [];

  const [clientId, setClientId] = useState(appointment?.clientId ?? '');
  const [date, setDate] = useState(appointment?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(appointment?.startTime ?? '');
  const [endTime, setEndTime] = useState(appointment?.endTime ?? '');
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? 'scheduled');
  const [note, setNote] = useState(appointment?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Randevunun danışanı listede yoksa (silinmiş) seçili kalsın diye ayrıca listelenir.
  const clientMissing = appointment !== undefined && !clients.some((c) => c.id === appointment.clientId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const values = { clientId, date, startTime, endTime, status, note };
    try {
      if (appointment) await updateAppointment(appointment.id, values);
      else await createAppointment(values);
      onSaved();
    } catch (failure) {
      // 400 ve 409'da pencere açık kalır, yazılanlar korunur.
      setError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
      setSaving(false);
    }
  }

  return (
    <Modal title={appointment ? 'Randevuyu düzenle' : 'Randevu ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="appointment-form-field">
          <label htmlFor="appointment-client">Danışan</label>
          <select id="appointment-client" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Seçin</option>
            {appointment && clientMissing && (
              <option value={appointment.client.id}>
                {appointment.client.firstName} {appointment.client.lastName}
                {clientsResult.data ? ' (silinmiş)' : ''}
              </option>
            )}
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="appointment-form-field">
          <label htmlFor="appointment-date">Tarih</label>
          <input id="appointment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="appointment-form-times">
          <div className="appointment-form-field">
            <label htmlFor="appointment-start">Başlangıç</label>
            <input
              id="appointment-start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div className="appointment-form-field">
            <label htmlFor="appointment-end">Bitiş</label>
            <input id="appointment-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
        </div>
        <div className="appointment-form-field">
          <label htmlFor="appointment-status">Durum</label>
          <select
            id="appointment-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
          >
            {APPOINTMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="appointment-form-field">
          <label htmlFor="appointment-note">Not</label>
          <textarea id="appointment-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="modal-secondary" type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button className="modal-primary" type="submit" disabled={saving}>
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}
