import { useState, useMemo } from 'react';
import ConnectBadge from './ConnectBadge';
import { SERVER_URL } from '../config';
import { fmtStamp, fmtClock } from '../lib/geo';
import { ScrollIcon, DownloadIcon, LockIcon, Check, AlertIcon } from './icons';

// ===========================================================================
// Transcripts — one immutable record per completed delivery, rendered through
// four DEMO role lenses (Patient / Hospital / MHC-driver / Government). All of
// this is simulated: figures come from the local server, the role switcher is
// a preview (no real auth), and Government uses a hardcoded demo credential.
// PRODUCTION FLAG (not built here): real deployments would sit behind DPDP
// Act-compliant consent handling and role-based access control (RBAC) with a
// genuine identity provider; every view below would query a scoped API rather
// than the shared socket snapshot. Leaving this demo intentionally local.
// ===========================================================================

const ROLES = [
  { id: 'patient', label: 'Patient', sub: 'single-record lookup' },
  { id: 'hospital', label: 'Hospital', sub: 'own requests only' },
  { id: 'ambulance', label: 'MHC (driver)', sub: 'own trips only' },
  { id: 'government', label: 'Govt (demo login)', sub: 'all transcripts' },
];

export default function TranscriptsScreen({ state, connected }) {
  const transcripts = useMemo(
    () =>
      [...(state?.transcripts || [])].sort(
        (a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0),
      ),
    [state],
  );
  const hospitals = state?.hospitals || [];
  const fleet = state?.fleet || [];
  const [role, setRole] = useState('patient');

  return (
    <div className="shell tr-screen">
      <header className="screen-top">
        <div>
          <h1 className="screen-title">Transcripts — delivery transparency</h1>
          <p className="screen-sub">
            immutable per-delivery records · {transcripts.length} logged · role preview below is demo-only
          </p>
        </div>
        <ConnectBadge connected={connected} />
      </header>

      <div className="tr-rolebar">
        <div className="tr-rolebar-note">
          <ScrollIcon />
          <div>
            <strong>Role preview</strong>
            <span>switch lens without real logins — the same transcript, different scope</span>
          </div>
        </div>
        <div className="tr-role-select">
          <label htmlFor="tr-role">View as</label>
          <select id="tr-role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="tr-body">
        {role === 'patient' && <PatientView transcripts={transcripts} />}
        {role === 'hospital' && (
          <HospitalView transcripts={transcripts} hospitals={hospitals} />
        )}
        {role === 'ambulance' && (
          <AmbulanceView transcripts={transcripts} fleet={fleet} />
        )}
        {role === 'government' && <GovernmentView transcripts={transcripts} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------- PATIENT / single

function PatientView({ transcripts }) {
  const [q, setQ] = useState('');
  const qid = q.trim().toLowerCase();
  const match = transcripts.find((t) => t.requestId.toLowerCase() === qid);

  return (
    <div className="panel tr-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Patient lookup</h2>
          <p className="panel-sub">single-record retrieval by request ID — no route or supply data shown</p>
        </div>
        <span className="tr-scope-tag">scope · one record</span>
      </div>

      <div className="lookup-bar">
        <input
          className="tr-input"
          placeholder="Request ID, e.g. req-1 · req-2 · req-6"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {transcripts.length > 0 && (
        <div className="tr-quick">
          <span className="tr-quick-label">recent records</span>
          {transcripts.slice(0, 5).map((t) => (
            <button
              key={t.id}
              className={`rep-pill ${match?.id === t.id ? 'is-on' : ''}`}
              onClick={() => setQ(t.requestId)}
            >
              {t.requestId}
            </button>
          ))}
        </div>
      )}

      {qid && match ? (
        <PatientReceipt transcript={match} />
      ) : qid && !match ? (
        <div className="tr-empty">
          <AlertIcon /> no record for "{q}" yet — a transcript is written when a delivery completes
        </div>
      ) : (
        <div className="tr-empty">
          <ScrollIcon /> enter a request ID — this view returns screening clearance only, no routing or network detail
        </div>
      )}
    </div>
  );
}

function PatientReceipt({ transcript: t }) {
  const cleared = t.screening?.cleared ?? false;
  return (
    <div className={`receipt ${cleared ? 'is-cleared' : 'is-flagged'}`}>
      <div className="receipt-head">
        <div>
          <h3 className="receipt-title">{t.bloodGroup} · {t.component}</h3>
          <p className="receipt-sub">quantity {t.quantity} unit{t.quantity === 1 ? '' : 's'} · urgency {t.urgency}</p>
        </div>
        <span className={`screen-chip ${cleared ? 'is-pass' : 'is-fail'}`}>
          <Check /> {cleared ? 'screening cleared' : 'flagged'}
        </span>
      </div>

      <div className="receipt-grid">
        <ReceiptField label="Delivered to" value={t.hospital} />
        <ReceiptField label="Delivery time" value={fmtStamp(t.deliveredAt)} />
        <ReceiptField label="Blood group" value={t.bloodGroup} />
        <ReceiptField label="Component × qty" value={`${t.component} × ${t.quantity}`} />
      </div>

      <div className="receipt-check">
        <span className={`chk ${cleared ? 'is-pass' : 'is-fail'}`}>
          <Check /> {cleared ? 'Screening cleared — sample certified fit for transfusion' : 'screening flagged on this record'}
        </span>
        {t.dispatchAt && t.deliveredAt && (
          <span className="receipt-eta">reset {fmtClock(t.deliveredAt - t.dispatchAt)} after dispatch</span>
        )}
      </div>

      <p className="tr-footnote">no route, depot, or other-patient data appears on this view.</p>
    </div>
  );
}

function ReceiptField({ label, value }) {
  return (
    <div className="receipt-field">
      <span className="receipt-field-label">{label}</span>
      <strong className="receipt-field-value">{value}</strong>
    </div>
  );
}

// ------------------------------------------------------------- HOSPITAL view

function HospitalView({ transcripts, hospitals }) {
  const [sel, setSel] = useState(hospitals[0]?.id || '');
  const scoped = useMemo(
    () => transcripts.filter((t) => t.hospitalId === sel),
    [transcripts, sel],
  );

  return (
    <div className="panel tr-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Hospital records</h2>
          <p className="panel-sub">every request this ward logged — nothing from other hospitals</p>
        </div>
        <div className="tr-role-select">
          <label htmlFor="tr-hospital">Hospital</label>
          <select id="tr-hospital" value={sel} onChange={(e) => setSel(e.target.value)}>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {scoped.length === 0 ? (
        <div className="tr-empty">
          <ScrollIcon /> no completed deliveries for this hospital yet — they appear as runs finish
        </div>
      ) : (
        <div className="tr-list">
          {scoped.map((t) => (
            <TranscriptRow key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------- AMBULANCE view

function AmbulanceView({ transcripts, fleet }) {
  const [unit, setUnit] = useState(fleet[0]?.id || '');
  const scoped = useMemo(
    () => transcripts.filter((t) => t.mhcId === unit),
    [transcripts, unit],
  );

  return (
    <div className="panel tr-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Driver logbook</h2>
          <p className="panel-sub">this unit's trips only — no other vehicles' records</p>
        </div>
        <div className="tr-role-select">
          <label htmlFor="tr-unit">Unit</label>
          <select id="tr-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {fleet.map((v) => (
              <option key={v.id} value={v.id}>{v.id} — {v.mhcOperator}</option>
            ))}
          </select>
        </div>
      </div>

      {scoped.length === 0 ? (
        <div className="tr-empty">
          <ScrollIcon /> this vehicle has not completed a trip yet — finished runs appear here
        </div>
      ) : (
        <div className="tr-list">
          {scoped.map((t) => (
            <TripLogRow key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------- GOVERNMENT view

const GOV_CRED = { user: 'govadmin', pass: 'raktasetu-dem0' };

function GovernmentView({ transcripts }) {
  const [granted, setGranted] = useState(false);
  const [user, setUser] = useState(GOV_CRED.user);
  const [pass, setPass] = useState(GOV_CRED.pass);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // DEMO-ONLY gate — real builds authenticate at an identity provider and the
  // server scopes every transcript query behind RBAC (flagged, not built).
  const login = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`${SERVER_URL}/api/gov/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setGranted(true);
      } else {
        setErr(json.error || 'login rejected');
        setGranted(false);
      }
    } catch {
      setErr('demo server unreachable — is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel tr-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Government transparency desk</h2>
          <p className="panel-sub">full cross-network view — every hospital, depot and unit, unscoped</p>
        </div>
        <span className="gov-badge"><LockIcon /> demo credential</span>
      </div>

      {!granted ? (
        <div className="gov-login">
          <div className="gov-login-note">
            <LockIcon />
            <div>
              <strong>Government Access (Demo)</strong>
              <p>Mock sign-in — no real identity or consent system. Credentials are pre-filled so the desk can be fired up in one click for demos.</p>
            </div>
          </div>
          <div className="gov-form">
            <label>
              Username
              <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="govadmin" />
            </label>
            <label>
              Password
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="demo password" />
            </label>
            <button className="btn-primary" onClick={login} disabled={busy}>
              <LockIcon /> {busy ? 'checking…' : 'Unlock desk'}
            </button>
          </div>
          {err && <p className="gov-error">{err}</p>}
        </div>
      ) : (
        <GovTranscripts full={transcripts} />
      )}
    </div>
  );
}

function GovTranscripts({ full }) {
  const [format, setFormat] = useState('csv');

  const download = () => {
    const rows = full.map((t) => ({
      transcript: t.id,
      request: t.requestId,
      group: t.bloodGroup,
      component: t.component,
      qty: t.quantity,
      urgency: t.urgency,
      hospital: t.hospital,
      source_depot: t.source,
      unit: t.mhcId,
      driver: t.mhcOperator,
      dispatch: iso(t.dispatchAt),
      delivered: iso(t.deliveredAt),
      waypoints: (t.route || []).length,
      temp_min_c: tempMin(t),
      temp_max_c: tempMax(t),
      temp_avg_c: tempAvg(t),
      screening_cleared: t.screening?.cleared ? 'yes' : 'no',
      hb_check: t.screening?.hbCheck,
      group_confirm: t.screening?.groupConfirm,
      tti_status: screeningTti(t),
    }));
    const data = format === 'csv' ? toCsv(rows) : JSON.stringify(rows, null, 2);
    const type = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `raktasetu-transcripts-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gov-body">
      <div className="gov-toolbar">
        <span className="gov-count">{full.length} transcript{full.length === 1 ? '' : 's'} · full transparency</span>
        <div className="gov-download">
          <div className="tr-role-select">
            <label htmlFor="gov-fmt">Format</label>
            <select id="gov-fmt" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <button className="btn-primary" onClick={download} disabled={full.length === 0}>
            <DownloadIcon /> Download {full.length}
          </button>
        </div>
      </div>

      <div className="tr-table-wrap">
        <table className="tr-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Delivery</th>
              <th>Hospital</th>
              <th>Source</th>
              <th>Unit</th>
              <th>Route</th>
              <th>Temp</th>
              <th>Screening</th>
            </tr>
          </thead>
          <tbody>
            {full.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.requestId}</strong><span className="tr-cell-sub">{t.id}</span></td>
                <td>
                  <span className="tr-cell-main">{t.bloodGroup} · {t.component} × {t.quantity}</span>
                  <span className="tr-cell-sub">{fmtStamp(t.deliveredAt)}</span>
                </td>
                <td>{t.hospital}<span className="tr-cell-sub">{t.urgency}</span></td>
                <td>{t.source}</td>
                <td>{t.mhcId}<span className="tr-cell-sub">{t.mhcOperator}</span></td>
                <td>{t.route?.length || 0}<span className="tr-cell-sub">{Math.round(distanceKm(t))} km</span></td>
                <td>
                  <span className="tr-cell-sub">{tempMin(t)}–{tempMax(t)}°C</span>
                  <TempSpark temps={t.temps} />
                </td>
                <td>
                  <span className={`screen-chip ${t.screening?.cleared ? 'is-pass' : 'is-fail'}`}>
                    {t.screening?.cleared ? 'cleared' : 'flagged'}
                  </span>
                  <span className="tr-cell-sub">hb {t.screening?.hbCheck} · TTI {screeningTti(t)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Production flag — see module header. Consent + RBAC handled in a real
          deployment; exported here only because this is simulated demo data. */}
      <p className="gov-foot">
        Exported set = exactly what this desk can see. In production: DPDP-compliant consent + scoped RBAC before any download
        (flagged, not implemented in this demo).
      </p>
    </div>
  );
}

// -------------------------------------------------- shared record components

function TranscriptRow({ t }) {
  return (
    <article className="tr-row">
      <div className="tr-row-head">
        <div className="tr-row-id">
          <strong>{t.requestId}</strong>
          <span className="tr-cell-sub">{t.id}</span>
        </div>
        <div className="tr-row-req">
          <strong className="tr-group">{t.bloodGroup}</strong>
          <span>{t.component} × {t.quantity}</span>
        </div>
        <span className={`screen-chip ${t.screening?.cleared ? 'is-pass' : 'is-fail'}`}>
          {t.screening?.cleared ? 'cleared' : 'flagged'}
        </span>
      </div>

      <div className="tr-row-cols">
        <div className="tr-col">
          <span className="tr-col-label">Timestamps</span>
          <span>dispatch {fmtStamp(t.dispatchAt)}</span>
          <span><strong>handover {fmtStamp(t.deliveredAt)}</strong></span>
        </div>
        <div className="tr-col">
          <span className="tr-col-label">Temp log ({t.temps?.length || 0} samples)</span>
          <span>{tempMin(t)} – {tempMax(t)} °C · avg {tempAvg(t)} °C</span>
          <TextSpark temps={t.temps} />
        </div>
        <div className="tr-col">
          <span className="tr-col-label">Screening</span>
          <span>hb {t.screening?.hbCheck} · group {t.screening?.groupConfirm} · TTI {screeningTti(t)}</span>
        </div>
      </div>

      <div className="tr-row-foot">
        <span className="tr-cell-sub">{t.source} → {t.hospital}</span>
        <span className="tr-cell-sub">{t.route?.length || 0} waypoints · {fmtClock(t.deliveredAt - t.dispatchAt)} trip</span>
      </div>
    </article>
  );
}

function TripLogRow({ t }) {
  return (
    <article className="tr-row">
      <div className="tr-row-head">
        <div className="tr-row-id">
          <strong>{t.requestId}</strong>
          <span className="tr-cell-sub">{t.route?.length || 0} waypoints</span>
        </div>
        <div className="tr-row-req">
          <strong className="tr-group">{t.bloodGroup}</strong>
          <span>{t.component} × {t.quantity}</span>
        </div>
        <span className="screen-chip is-pass">trip logged</span>
      </div>

      <div className="tr-row-cols">
        <div className="tr-col">
          <span className="tr-col-label">Trip window</span>
          <span>dispatch {fmtStamp(t.dispatchAt)}</span>
          <span><strong>handover {fmtStamp(t.deliveredAt)}</strong></span>
        </div>
        <div className="tr-col">
          <span className="tr-col-label">Route driven</span>
          <span>{t.route?.length || 0} waypoints · ≈{fmtClock(t.deliveredAt - t.dispatchAt)}</span>
          <RouteMini route={t.route} />
        </div>
        <div className="tr-col">
          <span className="tr-col-label">Fridge during trip</span>
          <span>{tempMin(t)}–{tempMax(t)} °C</span>
          <TextSpark temps={t.temps} />
        </div>
      </div>

      <div className="tr-row-foot">
        <span className="tr-cell-sub">to {t.hospital} · from {t.source}</span>
        <span className="tr-cell-sub">{t.temps?.length || 0} temperature readings</span>
      </div>
    </article>
  );
}

// small visual helpers ---------------------------------------------------

function TempSpark({ temps }) {
  const ts = (temps || []).map((p) => p.temp);
  if (ts.length < 2) return <span className="tr-spark-empty">—</span>;
  const minv = Math.min(...ts);
  const maxv = Math.max(...ts);
  const span = maxv - minv || 1;
  const w = 120;
  const h = 22;
  const pts = ts.map((c, i) => `${(i / (ts.length - 1)) * w},${h - 2 - ((c - minv) / span) * (h - 6)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="tr-spark" aria-hidden="true">
      <path d={`M${pts.join(' L')}`} />
    </svg>
  );
}

function RouteMini({ route }) {
  const pts = route && route.length ? route : [];
  if (pts.length < 2) return <span className="tr-spark-empty">no route</span>;
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const w = 120;
  const h = 22;
  const X = (lng) => ((lng - minLng) / (maxLng - minLng || Number.MAX_VALUE)) * w;
  const Y = (lat) => ((maxLat - lat) / (maxLat - minLat || Number.MAX_VALUE)) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="tr-spark route-mini" aria-hidden="true">
      <polyline points={pts.map((p) => `${X(p[1]).toFixed(1)},${Y(p[0]).toFixed(1)}`).join(' ')} fill="none" />
    </svg>
  );
}

// numeric helpers -------------------------------------------------------------

const tempArr = (t) => (t?.temps || []).map((p) => p.temp).filter((x) => typeof x === 'number');
const tempMin = (t) => (tempArr(t).length ? Math.min(...tempArr(t)).toFixed(1) : '—');
const tempMax = (t) => (tempArr(t).length ? Math.max(...tempArr(t)).toFixed(1) : '—');
const tempAvg = (t) => {
  const a = tempArr(t);
  return a.length ? (a.reduce((s, c) => s + c, 0) / a.length).toFixed(1) : '—';
};

const distanceKm = (t) => {
  const p = t?.route || [];
  let km = 0;
  for (let i = 1; i < p.length; i += 1) {
    const [aLat, aLng] = p[i - 1];
    const [bLat, bLng] = p[i];
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const la1 = (aLat * Math.PI) / 180;
    const la2 = (bLat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    km += 2 * R * Math.asin(Math.sqrt(h));
  }
  return km;
};

const screeningTti = (t) =>
  t?.screening?.tti &&
  [t.screening.tti.hbsag, t.screening.tti.hcv, t.screening.tti.hiv].some((s) => s === 'fail')
    ? 'fail'
    : 'pass';

const iso = (ts) => (ts ? new Date(ts).toISOString() : '');

// CSV export — modest quoting pass (demo-grade, no formula-injection polish)
function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  if (!rows.length) return 'no records';
  const head = Object.keys(rows[0]).join(',');
  const body = rows.map((r) => Object.values(r).map(esc).join(','));
  return [head, ...body].join('\n');
}