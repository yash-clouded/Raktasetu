import { Fridge, Cross } from './icons';
import { expiryStatus, fmtCountdown } from '../lib/geo';

// Per-compartment definition. Platelets get an explicit NEGATIVE note so the
// UI (and any reader) never mistakes the incubator for a cold store — platelets
// are agitated at 20–24°C, they must not freeze.
const COMPARTMENTS = [
  {
    key: 'rbcFridge',
    title: 'RBC Fridge',
    sub: 'Whole blood × packed cells',
    temp: '2–6°C',
    component: 'red cell',
  },
  {
    key: 'plateletIncubator',
    title: 'Platelet Incubator',
    sub: 'agitated shaker — platelets stay liquid at 20–24°C, never frozen',
    temp: '20–24°C',
    component: 'platelets',
  },
  {
    key: 'plasmaFreezer',
    title: 'Plasma Freezer',
    sub: 'fresh frozen plasma bank',
    temp: '≤-18°C',
    component: 'plasma',
  },
  {
    key: 'cryoStorage',
    title: 'Cryo Storage',
    sub: 'cryoprecipitate bank',
    temp: '≤-65°C',
    component: 'cryo',
  },
];

export default function CompartmentBreakdown({ source, onClose }) {
  if (!source) return null;

  const total = COMPARTMENTS.reduce(
    (sum, c) => sum + (source[c.key] || []).reduce((s, b) => s + b.units, 0),
    0,
  );

  return (
    <div className="comp-overlay" role="dialog" aria-modal="true" aria-label={`Cold storage — ${source.name}`} onClick={onClose}>
      <div className="comp-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head comp-head">
          <div>
            <h2 className="panel-title">
              Cold storage — compartments
              {source.type === 'mobile' && <span className="unit-stamp">mobile unit</span>}
            </h2>
            <p className="panel-sub">
              {source.name} · {total} units across four temperature zones
            </p>
          </div>
          <div className="comp-close">
            <Cross onClick={onClose} />
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="comp-grid">
          {COMPARTMENTS.map((c, i) => (
            <section key={c.key} className={`comp-section`}>
              <div className="comp-section-head">
                <span className={`comp-temp ${compTempTone(c)}`}>
                  <Fridge className="comp-temp-icon" />
                  {c.temp}
                </span>
                <div>
                  <h3 className="comp-title">{c.title}</h3>
                  <p className="comp-sub">{c.sub}</p>
                </div>
              </div>

              {(source[c.key] || []).length === 0 ? (
                <p className="comp-empty">no batches held</p>
              ) : (
                <ul className="comp-batches">
                  {(source[c.key] || []).map((b, bi) => (
                    <BatchRow key={`${b.bloodGroup}-${bi}`} batch={b} />
                  ))}
                </ul>
              )}

              {c.key === 'plateletIncubator' && (
                <p className="comp-note">
                  <Fridge className="comp-note-icon" />
                  platelets are agitated at 20–24°C — this bay is not a freezer
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function compTempTone(c) {
  return c.key === 'rbcFridge' ? 'is-cool' : c.key === 'plateletIncubator' ? 'is-warm' : 'is-frozen';
}

function BatchRow({ batch }) {
  const { risk, label } = expiryStatus(batch.expiryDate);
  return (
    <li className={`comp-batch ${risk === 'red' ? 'is-critical' : ''}`}>
      <div className="comp-batch-main">
        <strong className="comp-bg">{batch.bloodGroup}</strong>
        <span className="comp-units">
          {batch.units} unit{batch.units === 1 ? '' : 's'}
        </span>
        {batch.component && <span className="comp-component">{batch.component}</span>}
      </div>
      <div className={`comp-expiry risk-${risk}`}>
        <span className="comp-expiry-dot" />
        {label}
      </div>
    </li>
  );
}