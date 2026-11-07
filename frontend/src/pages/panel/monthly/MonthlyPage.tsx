import { Link, useSearchParams } from 'react-router';
import { listAppointments } from '../../../api/appointments';
import { addMonths, dateFromQuery, formatLong, formatMonth, monthGrid, monthRange, today, WEEKDAYS_SHORT } from '../../../lib/date';
import { useApi } from '../../../lib/useApi';
import './MonthlyPage.css';

export function MonthlyPage() {
  const [params, setParams] = useSearchParams();
  const anchor = dateFromQuery(params.get('tarih'));
  const { from, to } = monthRange(anchor);
  const grid = monthGrid(anchor);
  const { data: appointments, loading, error, reload } = useApi(() => listAppointments(from, to), [from]);

  const goTo = (target: string) => setParams({ tarih: target });

  // İptal edilmiş randevular günü dolu göstermez.
  const counts = new Map<string, number>();
  for (const appointment of appointments ?? []) {
    if (appointment.status === 'cancelled') continue;
    counts.set(appointment.date, (counts.get(appointment.date) ?? 0) + 1);
  }

  function renderBody() {
    if (error) {
      return (
        <div className="monthly-state">
          <p>{error.message}</p>
          <button className="monthly-retry" type="button" onClick={reload}>
            Yeniden dene
          </button>
        </div>
      );
    }
    if (!appointments && loading) return <p className="monthly-state">Ay yükleniyor…</p>;
    return (
      <>
        {appointments && appointments.length === 0 && <p className="monthly-state">Bu ay için randevu yok</p>}
        <table className="monthly-table">
          <thead>
            <tr>
              {WEEKDAYS_SHORT.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week) => (
              <tr key={week[0]}>
                {week.map((day) => {
                  const inMonth = day >= from && day <= to;
                  const count = inMonth ? (counts.get(day) ?? 0) : 0;
                  const label = count > 0 ? `${formatLong(day)}, ${count} randevu` : formatLong(day);
                  return (
                    <td className={inMonth ? 'monthly-day' : 'monthly-day monthly-day-outside'} key={day}>
                      <Link className="monthly-day-link" to={`/panel?tarih=${day}`} aria-label={label}>
                        <span className="monthly-day-number">{Number(day.slice(8))}</span>
                        {count > 0 && <span className="monthly-count">{count}</span>}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <section className="monthly">
      <div className="monthly-head">
        <button type="button" aria-label="Önceki ay" onClick={() => goTo(addMonths(anchor, -1))}>
          ‹
        </button>
        <h1>{formatMonth(anchor)}</h1>
        <button type="button" aria-label="Sonraki ay" onClick={() => goTo(addMonths(anchor, 1))}>
          ›
        </button>
        <button type="button" onClick={() => goTo(today())}>
          Bu ay
        </button>
      </div>
      {renderBody()}
    </section>
  );
}
