import { Link, useSearchParams } from 'react-router';
import { listAppointments } from '../../../api/appointments';
import type { AppointmentView } from '../../../api/types';
import { addDays, dateFromQuery, formatLong, formatWeekRange, today, weekDays, weekStart, WEEKDAYS_SHORT } from '../../../lib/date';
import { useApi } from '../../../lib/useApi';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import './WeeklyPage.css';

export function WeeklyPage() {
  const [params, setParams] = useSearchParams();
  const anchor = dateFromQuery(params.get('tarih'));
  useDocumentTitle(formatWeekRange(anchor));
  const days = weekDays(anchor);
  const monday = days[0];
  const sunday = days[6];
  const { data: appointments, loading, error, reload } = useApi(() => listAppointments(monday, sunday), [monday]);

  const goTo = (target: string) => setParams({ tarih: target });

  function appointmentsOf(day: string): AppointmentView[] {
    return (appointments ?? []).filter((appointment) => appointment.date === day);
  }

  function renderBody() {
    if (error) {
      return (
        <div className="weekly-state">
          <p>{error.message}</p>
          <button className="weekly-retry" type="button" onClick={reload}>
            Yeniden dene
          </button>
        </div>
      );
    }
    if (!appointments && loading) return <p className="weekly-state">Hafta yükleniyor…</p>;
    return (
      <>
        {appointments && appointments.length === 0 && <p className="weekly-state">Bu hafta için randevu yok</p>}
        <div className="weekly-grid">
          {days.map((day, index) => (
            <div className="weekly-day" key={day}>
              <Link className="weekly-day-link" to={`/panel?tarih=${day}`} aria-label={formatLong(day)}>
                <span className="weekly-day-name">{WEEKDAYS_SHORT[index]}</span>
                <span className="weekly-day-number">{Number(day.slice(8))}</span>
              </Link>
              <ul className="weekly-list" aria-label={`${formatLong(day)} randevuları`}>
                {appointmentsOf(day).map((appointment) => {
                  const cancelled = appointment.status === 'cancelled';
                  return (
                    <li className={cancelled ? 'weekly-item weekly-item-off' : 'weekly-item'} key={appointment.id}>
                      <span className="weekly-time">{appointment.startTime}</span>
                      <span className="weekly-name">
                        {appointment.client.firstName} {appointment.client.lastName}
                      </span>
                      {cancelled && <span className="weekly-badge">İptal</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <section className="weekly">
      <div className="weekly-head">
        <button type="button" aria-label="Önceki hafta" onClick={() => goTo(addDays(weekStart(anchor), -7))}>
          ‹
        </button>
        <h1>{formatWeekRange(anchor)}</h1>
        <button type="button" aria-label="Sonraki hafta" onClick={() => goTo(addDays(weekStart(anchor), 7))}>
          ›
        </button>
        <button type="button" onClick={() => goTo(today())}>
          Bu hafta
        </button>
      </div>
      {renderBody()}
    </section>
  );
}
