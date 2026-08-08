import { Droplet, ArrowRight } from './icons';
import { fmtClock } from '../lib/geo';

const URGENCY_LABEL = { critical: 2, urgent: 1, routine: 0 };

export default function RequestsPanel({ requests = [], hospitals = [], fleet = [], onDispatch }) {
  const allBusy = fleet.every((v) => v.status !== 'idle');
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id;
  const freeVehicles = fleet.filter((v) => v.status === 'idle').length;

  const sorted = [...requests].sort(
    (a, b) => URGENCY_LABEL[b.urgency] - URGENCY_LABEL[a.urgency],
  );

  return (
    <div className="panel requests-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Incoming requests</h2>
          <p className="panel-sub">priority queue · dispatch routes the next idle unit</p>
        </div>
        <div className={`amb-status-chip ${allBusy ? 'is-busy' : ''}`}>
          <span className="dot" />
          {allBusy ? 'fleet fully on the road' : `${freeVehicles} unit${freeVehicles === 1 ? '' : 's'} ready`}
        </div>
      </div>

      <ul className="request-list">
        {sorted.map((req) => {
          const ageMs = Date.now() - new Date(req.timestamp).getTime();
          return (
            <li key={req.id} className={`request-row is-${req.status}`}>
              <div className="request-main">
                <span className="req-glyph"><Droplet /></span>
                <div className="req-info">
                  <p className="req-hosp">{hospitalName(req.hospitalId)}</p>
                  <p className="req-meta">
                    <strong>{req.bloodGroup}</strong>
                    {'\u00A0\u00B7\u00A0'}
                    {req.component} × {req.quantity}
                  </p>
                </div>
              </div>

              <div className="request-side">
                <span className={`urgency-tag is-${req.urgency}`}>{req.urgency}</span>
                <span className="req-age">{fmtClock(ageMs)} ago</span>

                {req.status === 'queued' ? (
                  <button
                    className="btn-primary"
                    disabled={allBusy}
                    title={allBusy ? 'no idle unit — wait for a delivery to finish' : ''}
                    onClick={() => onDispatch(req.id)}
                  >
                    Match &amp; Dispatch <ArrowRight className="btn-arrow" />
                  </button>
                ) : (
                  <span className={`req-status status-${req.status}`}>{req.status}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}