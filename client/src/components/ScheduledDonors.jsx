import { Calendar, Tower } from './icons';

// ScheduledDonors — renders the `donations` slice of the shared broadcast.
// The mobile app writes these via `app:book-slot`; the server appends them to
// the shared state and broadcasts the whole snapshot, so this panel updates
// live without any polling.
export default function ScheduledDonors({ donations = [], sources = [] }) {
  const bankName = (id) => sources.find((s) => s.id === id)?.name || id;
  const rows = [...donations].sort((a, b) =>
    (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );

  return (
    <div className="panel donors-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Scheduled donors</h2>
          <p className="panel-sub">
            live donor-booked slots · written from the citizen app · {rows.length} slot(s) on record
          </p>
        </div>
        <span className="cold-hint">
          <Calendar />
          {rows.length} booked
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="donors-empty">
          No donor slots have been booked in this demo. Make one on the citizen
          app and it appears here instantly.
        </p>
      ) : (
        <ul className="donor-list">
          {rows.map((d) => (
            <li key={d.id} className="donor-row">
              <div className="donor-main">
                <span className="donor-badge">{d.donorName.trim().charAt(0).toUpperCase() || '•'}</span>
                <div className="donor-info">
                  <p className="donor-name">{d.donorName}</p>
                  <p className="donor-meta">
                    {bankName(d.bankId)} · {d.date} at {d.startTime}
                  </p>
                </div>
              </div>
              <div className="donor-side">
                <span className={`donor-status is-${d.status}`}>{d.status}</span>
                {d.ref ? <span className="donor-ref">ref {d.ref}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}