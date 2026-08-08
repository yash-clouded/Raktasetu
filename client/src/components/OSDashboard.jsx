import { useState } from 'react';
import DistrictHeatmap from './DistrictHeatmap';
import DelhiMap from './DelhiMap';
import RequestsPanel from './RequestsPanel';
import ConnectBadge from './ConnectBadge';
import CompartmentBreakdown from './CompartmentBreakdown';
import ScheduledDonors from './ScheduledDonors';
import { Fridge } from './icons';
import { expiryStatus } from '../lib/geo';

export default function OSDashboard({ state, connected, onDispatch }) {
  const [openSource, setOpenSource] = useState(null);
  if (!state) return <div className="boot">Waiting for the command server…</div>;

  const { districtRisk, requests, hospitals, fleet, bloodSources, donations } = state;
  const queued = requests.filter((r) => r.status === 'queued').length;
  const inTransit = fleet.filter((v) => v.status !== 'idle').length;
  const idleCount = fleet.length - inTransit;
  const avgFridge =
    fleet.length
      ? (fleet.reduce((s, v) => s + v.fridgeTemp, 0) / fleet.length).toFixed(1)
      : '—';

  return (
    <div className="shell os-screen">
      <header className="screen-top">
        <div>
          <h1 className="screen-title">Operating System</h1>
          <p className="screen-sub">
            blood-network coordination · {hospitals.length} hospitals ·{' '}
            {bloodSources.length} depots · {fleet.length} live units
          </p>
        </div>
        <ConnectBadge connected={connected} />
      </header>

      <DistrictHeatmap districts={districtRisk} />

      <ScheduledDonors donations={donations} sources={bloodSources} />

      <ColdStoragePanel sources={bloodSources} onOpen={setOpenSource} />

      <div className="os-grid">
        <RequestsPanel
          requests={requests}
          hospitals={hospitals}
          fleet={fleet}
          onDispatch={onDispatch}
        />
        <DelhiMap
          fleet={fleet}
          district={districtRisk}
          hospitals={hospitals}
          bloodSources={bloodSources}
          label="OS console"
          onSourceClick={setOpenSource}
        />
      </div>

      <footer className="screen-foot">
        <Kpi label="Queued requests" value={queued} />
        <Kpi label="Units in transit" value={`${inTransit} / ${fleet.length}`} />
        <Kpi label="Units idle" value={idleCount} />
        <Kpi label="Fleet fridge" value={`${avgFridge} °C`} />
        <Kpi label="Donors booked" value={donations?.length ?? 0} />
        <Kpi label="Region" value="Delhi NCR" />
      </footer>

      <CompartmentBreakdown source={openSource} onClose={() => setOpenSource(null)} />
    </div>
  );
}

// Cold storage — per-source counts. Click a source to open the compartment
// breakdown (batch-level view), or click its depot marker on the map.
function ColdStoragePanel({ sources = [], onOpen }) {
  return (
    <div className="panel cold-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Cold storage — source units</h2>
          <p className="panel-sub">
            fixed depots + mobile units · compartment holdings per batch · tap a unit or its map marker
          </p>
        </div>
        <span className="cold-hint">
          <Fridge />
          {sources.length} holding units
        </span>
      </div>

      <div className="cold-grid">
        {sources.map((src) => (
          <SourceCard key={src.id} source={src} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({ source, onOpen }) {
  const cells = [
    { key: 'rbcFridge', label: 'RBC', tone: 'cool' },
    { key: 'plateletIncubator', label: 'PLT', tone: 'warm' },
    { key: 'plasmaFreezer', label: 'FFP', tone: 'frozen' },
    { key: 'cryoStorage', label: 'CRYO', tone: 'frozen' },
  ];
  let total = 0;
  let critical = 0;
  cells.forEach((c) =>
    (source[c.key] || []).forEach((b) => {
      total += b.units;
      const { risk, msLeft } = expiryStatus(b.expiryDate);
      if (risk === 'red' && msLeft > 0) critical += 1;
    }),
  );

  return (
    <button className="source-card" onClick={() => onOpen(source)}>
      <div className="source-top">
        <div className="source-name">
          <strong>{source.name}</strong>
          <span className={`type-tag is-${source.type}`}>{source.type === 'mobile' ? 'mobile unit' : 'fixed depot'}</span>
        </div>
        <span className="source-total">{total} <em>units</em></span>
      </div>

      <div className="source-cells">
        {cells.map((c) => {
          const batches = source[c.key] || [];
          const units = batches.reduce((s, b) => s + b.units, 0);
          return (
            <div key={c.key} className={`source-cell tone-${c.tone} ${units === 0 ? 'is-empty' : ''}`}>
              <span className="source-cell-label">{c.label}</span>
              <span className="source-cell-units">{units}</span>
            </div>
          );
        })}
      </div>

      <p className="source-foot">
        {batchesCount(source)} batches
        {critical > 0 ? ` · ${critical} critical (≤48h)` : ' · none critical'}
      </p>
    </button>
  );
}

const batchesCount = (s) =>
  ['rbcFridge', 'plateletIncubator', 'plasmaFreezer', 'cryoStorage'].reduce(
    (n, k) => n + (s[k] || []).length,
    0,
  );

function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
}