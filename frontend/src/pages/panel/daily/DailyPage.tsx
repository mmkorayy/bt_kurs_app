import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { parseAppointmentPrompt } from '../../../api/ai';
import { deleteAppointment, listAppointments, updateAppointment } from '../../../api/appointments';
import { ApiError } from '../../../api/client';
import type { AppointmentDraft, AppointmentView } from '../../../api/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { addDays, dateFromQuery, formatLong, today } from '../../../lib/date';
import { statusLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import { ClientForm } from '../clients/ClientForm';
import { AppointmentForm } from './AppointmentForm';
import './DailyPage.css';

function clientName(appointment: AppointmentView): string {
  return `${appointment.client.firstName} ${appointment.client.lastName}`;
}

export function DailyPage() {
  const [params, setParams] = useSearchParams();
  const date = dateFromQuery(params.get('tarih'));
  useDocumentTitle(formatLong(date));
  const { data: appointments, loading, error, reload } = useApi(() => listAppointments(date, date), [date]);

  const [editing, setEditing] = useState<AppointmentView | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AppointmentView | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Hızlı randevu komutu (yapay zekâ asistanı): taslak onaylanmadan hiçbir şey kaydedilmez.
  const [prompt, setPrompt] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  // Danışan kayıtlı değilse önce danışan formu, kaydedilince randevu formu açılır.
  const [clientStep, setClientStep] = useState(false);
  const [draftClientId, setDraftClientId] = useState<string | undefined>();
  // Cevap geldiğinde hâlâ sorunun sorulduğu gün açık mı, bakmak için.
  const dateRef = useRef(date);
  dateRef.current = date;

  // Başka güne geçince eski günün iptal hatası görünmesin.
  useEffect(() => setActionError(''), [date]);

  const goTo = (target: string) => setParams({ tarih: target });

  async function runPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = prompt;
    if (!submitted.trim()) return;
    const askedFor = date;
    setAssistantError('');
    setAssistantBusy(true);
    try {
      const result = await parseAppointmentPrompt(submitted.trim(), askedFor);
      // Kullanıcı bu arada başka güne geçtiyse taslak açılmaz.
      if (dateRef.current !== askedFor) return;
      setDraft(result);
      setDraftClientId(result.clientId ?? undefined);
      setClientStep(result.clientId === null && result.suggestedClient !== null);
      // Bu arada yeni bir şey yazıldıysa o silinmez.
      setPrompt((current) => (current === submitted ? '' : current));
    } catch (failure) {
      setAssistantError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
    } finally {
      setAssistantBusy(false);
    }
  }

  function closeDraft() {
    setDraft(null);
    setClientStep(false);
    setDraftClientId(undefined);
  }

  async function cancel(appointment: AppointmentView) {
    setActionError('');
    setCancellingId(appointment.id);
    try {
      await updateAppointment(appointment.id, { status: 'cancelled' });
      reload();
    } catch (failure) {
      setActionError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
    } finally {
      setCancellingId(null);
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
      // Sil düğmesi satırla birlikte kaybolacağı için odak sayfa başlığına taşınır.
      headingRef.current?.focus();
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
                  <button
                    type="button"
                    aria-label={`İptal et: ${name}`}
                    disabled={cancellingId === appointment.id}
                    onClick={() => void cancel(appointment)}
                  >
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
          <h1 ref={headingRef} tabIndex={-1}>
            {formatLong(date)}
          </h1>
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

      <form className="daily-assistant" onSubmit={(event) => void runPrompt(event)}>
        <input
          type="text"
          aria-label="Hızlı randevu komutu"
          placeholder="Örn: Yarın 14:00 Ali Veli kontrol randevusu"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button type="submit" disabled={assistantBusy}>
          Oluştur
        </button>
      </form>
      {assistantError && (
        <p className="daily-action-error" role="alert">
          {assistantError}
        </p>
      )}

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
      {draft && clientStep && draft.suggestedClient && (
        <ClientForm
          initialDraft={draft.suggestedClient}
          hint={`${draft.suggestedClient.firstName} ${draft.suggestedClient.lastName} kayıtlı değil. Önce danışanı ekleyin, ardından randevu formuna geçilecek.`}
          onClose={closeDraft}
          onSaved={(saved) => {
            setDraftClientId(saved.id);
            setClientStep(false);
          }}
        />
      )}
      {draft && !clientStep && (
        <AppointmentForm
          defaultDate={date}
          draft={{
            clientId: draftClientId,
            date: draft.date,
            startTime: draft.startTime,
            endTime: draft.endTime,
            note: draft.note,
          }}
          onClose={closeDraft}
          onSaved={() => {
            const savedDate = draft.date;
            closeDraft();
            if (savedDate && savedDate !== date) goTo(savedDate);
            else reload();
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
