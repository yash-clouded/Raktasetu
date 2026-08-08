import DelhiMap from './DelhiMap';
import ConnectBadge from './ConnectBadge';
import { haversineKm } from '../lib/geo';
import { Ambulance, Timer, Thermometer, RouteIcon, Droplet } from './icons';

// ===========================================================================
// Mobile Health Centre (MHC) console — the digital twin of a physically
// designed mobile blood-bank vehicle (donation / processing / lab / cold
// storage compartments). MHC still performs mobile delivery AND works as a
// mini blood-bank on the move; this screen renders its live state over the
// shared socket. Same tracking logic as before — this is a rename/relabel
// over the previous "ambulance" console, no functional change.
// ===========================================================================

const STAGES = ['idle', 'in-transit', 'arrived', 'delivered'];
const STAGE_LABEL = {
  idle: 'Idle at depot',
  'in-transit': 'In transit',
  arrived: 'Arrived at hospital',
  delivered: 'Delivered — logged',
};

export default function MHCDashboard({ state, connected, onStartDelivery }) {
  const fleet = state?.fleet || [];
  const hospitals = state?.hospitals || [];
  const requests = state?.requests || [];
  const inTransit = fleet.filter((v) => v.status !== 'idle').length;

  const myReq = (v) => requests.find((r) => r.id === v.assignedRequestId);
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id;

  return (
    <div className="shell amb-screen">
      <header className="screen-top">
        <div>
          <h1 className="screen-title">Mobile Health Centre — fleet</h1>
          <p className="screen-sub">
            {fleet.length} MHC units · {inTransit} on the road · every action here broadcasts to the OS console
          </p>
        </div>
        <ConnectBadge connected={connected} />
      </header>

      <div className="amb-layout">
        <DelhiMap
          fleet={fleet}
          district={state?.districtRisk || []}
          hospitals={hospitals}
          bloodSources={state?.bloodSources || []}
          label="MHC console · digital twin"
        />

        <div className="amb-side">
          {fleet.map((v) => {
            const req = myReq(v);
            const active = v.status !== 'idle';
            return (
              <section key={v.id} className={`panel unit-card ${active ? 'is-active' : ''}`}>
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">{v.id} <span className="unit-stamp">{v.mhcOperator}</span></h2>
                    <p className="panel-sub">{v.registration}</p>
                  </div>
                  <span className={`status-chip ${active ? 'is-busy' : ''}`}>
                    <span className="dot" />
                    {STAGE_LABEL[v.status] || v.status}
                  </span>
                </div>

                <WaypointProgress vehicle={v} />

                <div className="readout-grid">
                  <Readout icon={<Timer />} label="ETA" value={active ? etaFor(v) : '—'} unit={active ? 'min' : ''} />
                  <Readout icon={<Thermometer />} label="Fridge" value={v.fridgeTemp.toFixed(1)} unit="°C" />
                  <Readout
                    icon={<RouteIcon />}
                    label="Waypoint"
                    value={v.route.length ? Math.max(0, v.currentWaypointIndex + 1) : '—'}
                    unit={v.route.length ? `/ ${v.route.length}` : ''}
                  />
                  <Readout
                    icon={<Droplet />}
                    label="Load"
                    value={req ? req.id.replace('req-', 'R') : '—'}
                    unit={req ? req.bloodGroup : ''}
                  />
                </div>

                {req && (
                  <p className="consign-foot unit-consign">
                    {hospitalName(req.hospitalId)} · {req.component} × {req.quantity} · {req.urgency}
                  </p>
                )}

                <button
                  className="btn-primary btn-start"
                  disabled={active}
                  onClick={onStartDelivery}
                >
                  <Ambulance className="btn-start-icon" />
                  <span>
                    Start Delivery
                    <small>routes the oldest queued request to this idle MHC unit</small>
                  </span>
                </button>
              </section>
            );
          })}

          <div className="sync-note">
            <span className="dot" />
            broadcast back to the OS console via the local broker
          </div>
        </div>
      </div>

      <footer className="screen-foot">
        <Kpi label="MHC fleet" value={fleet.length} />
        <Kpi label="On the road" value={inTransit} />
        <Kpi label="Idle" value={fleet.length - inTransit} />
        <Kpi label="Digital twin" value="live" />
        <Kpi label="Region" value="Delhi NCR" />
      </footer>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
}

function etaFor(v) {
  if (!v.route || v.route.length < 2) return '—';
  const idx = Math.max(0, v.currentWaypointIndex);
  let km = 0;
  for (let i = idx; i < v.route.length - 1; i += 1) {
    km += haversineKm(v.route[i], v.route[i + 1]);
  }
  const speedKmh = 0.35;
  return Math.max(1, Math.ceil(km / speedKmh));
}

// progress rail — crossed waypoints vs the full route
function WaypointProgress({ vehicle }) {
  const n = vehicle.route.length || 0;
  const cur = Math.max(0, vehicle.currentWaypointIndex);
  return (
    <div className="wp-track">
      <div className="wp-trackbar">
        <span className={`wp-fill ${vehicle.status === 'idle' ? 'is-empty' : ''}`} style={{ width: `${n ? (cur / Math.max(1, n - 1)) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function Readout({ icon, label, value, unit }) {
  return (
    <div className="readout">
      <div className="readout-icon">{icon}</div>
      <div className="readout-body">
        <span className="readout-label">{label}</span>
        <span className="readout-value">{value}<em>{unit}</em></span>
      </div>
    </div>
  );
}