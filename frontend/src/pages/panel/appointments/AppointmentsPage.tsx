import { Link, useSearchParams } from 'react-router';
import { listAppointments } from '../../../api/appointments';
import {
  addDays,
  compareDateAndTime,
  dateFromQuery,
  formatLong,
  formatWeekRange,
  today,
  weekDays,
  weekStart,
} from '../../../lib/date';
import { useApi } from '../../../lib/useApi';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import './AppointmentsPage.css';

export function AppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const anchor = dateFromQuery(params.get('tarih'));
  useDocumentTitle('Randevular');

  const days = weekDays(anchor);
  const monday = days[0];
  const sunday = days[6];
  const todayDate = today();

  const { data: appointments, loading, error, reload } = useApi(
    () => listAppointments(monday, sunday),
    [monday],
  );

  const goTo = (target: string) => setParams({ tarih: target });

  function renderContent() {
    if (error) {
      return (
        <div className="appointments-state">
          <p>{error.message}</p>
          <button className="appointments-retry" type="button" onClick={reload}>
            Yeniden dene
          </button>
        </div>
      );
    }

    if (!appointments && loading) {
      return <p className="appointments-state">Randevular yükleniyor…</p>;
    }

    const sorted = [...(appointments ?? [])].sort(compareDateAndTime);

    if (sorted.length === 0) {
      return <p className="appointments-state">Bu hafta için randevu yok</p>;
    }

    return (
      <ul className="appointments-list" aria-label="Haftalık randevu listesi">
        {sorted.map((item) => {
          const isToday = item.date === todayDate;
          const isCancelled = item.status === 'cancelled';

          const classes = ['appointments-item'];
          if (isToday) classes.push('appointments-item-today');
          if (isCancelled) classes.push('appointments-item-off');

          return (
            <li key={item.id} className={classes.join(' ')}>
              <div className="appointments-time-col">
                <Link
                  to={`/panel?tarih=${item.date}`}
                  className="appointments-date-link"
                >
                  {formatLong(item.date)}
                </Link>
                <span className="appointments-time">
                  {item.startTime}–{item.endTime}
                </span>
              </div>
              <div className="appointments-client-col">
                <span className="appointments-client-name">
                  {item.client.firstName} {item.client.lastName}
                </span>
                {item.note && <span className="appointments-note">{item.note}</span>}
              </div>
              <div className="appointments-badges">
                {isToday && <span className="appointments-today-badge">Bugün</span>}
                {isCancelled && <span className="appointments-badge">İptal</span>}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="appointments">
      <div className="appointments-head">
        <button
          type="button"
          aria-label="Önceki hafta"
          onClick={() => goTo(addDays(weekStart(anchor), -7))}
        >
          ‹
        </button>
        <h1>{formatWeekRange(anchor)}</h1>
        <button
          type="button"
          aria-label="Sonraki hafta"
          onClick={() => goTo(addDays(weekStart(anchor), 7))}
        >
          ›
        </button>
        <button type="button" onClick={() => goTo(today())}>
          Bu hafta
        </button>
      </div>
      {renderContent()}
    </section>
  );
}
