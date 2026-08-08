import { useEffect, useState } from 'react';

// ===========================================================================
// System / database telemetry strip — a thin fixed footer bar on every console.
// Everything here is presented as "network telemetry" but only TWO values are
// genuinely real: the live clock (browser time, ticks every second) and the
// connection state dot (driven by the actual Socket.io object). The node IP is
// a fake per-session identifier generated once, and "last sync" is the real
// wall-clock time of the most recent socket state broadcast. None of it
// touches a real network — it just reads like an infrastructure status bar.
// ===========================================================================

const CONN_META = {
  connected: { label: 'link-up', cls: 'is-up' },
  reconnecting: { label: 're-syncing', cls: 'is-sync' },
  disconnected: { label: 'offline', cls: 'is-down' },
};

export default function SysStatusBar({ connState = 'disconnected', sessionIp, nodeLabel, lastSyncAt }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (x) => String(x).padStart(2, '0');
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const sync = lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('en-IN', { hour12: false }) : '—';

  const meta = CONN_META[connState] || CONN_META.disconnected;

  return (
    <div className="sysbar" aria-label="System connection metadata">
      <span className="sys-node">
        <i className={`sys-dot ${meta.cls}`} />
        {nodeLabel}
      </span>
      <span className="sys-ip">session IP <b>{sessionIp}</b></span>
      <span className="sys-sync">last sync <b>{sync}</b></span>
      <span className="sys-link">{meta.label}</span>
      <span className="sys-clock">{clock} IST</span>
    </div>
  );
}