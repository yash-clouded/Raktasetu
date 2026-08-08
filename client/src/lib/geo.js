// Projection + distance helpers. All lat/lng are projected LINEARLY into an
// SVG viewBox — no tiles, no external services, everything self-contained.

// Fixed Delhi operating region — every zone, depot, hospital and route
// waypoint from the server seed lives inside this box (see server state.js).
export const DELHI_BBOX = {
  latMin: 28.42,
  latMax: 28.80,
  lngMin: 76.90,
  lngMax: 77.33,
};

export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// grow a bounding box around a set of points
export const autoBBox = (points, pad = 0.0012) => {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    latMin: Math.min(...lats) - pad,
    latMax: Math.max(...lats) + pad,
    lngMin: Math.min(...lngs) - pad,
    lngMax: Math.max(...lngs) + pad,
  };
};

export const project = (p, bbox, w, h) => {
  const spanX = bbox.lngMax - bbox.lngMin || 1e-6;
  const spanY = bbox.latMax - bbox.latMin || 1e-6;
  return {
    x: ((p.lng - bbox.lngMin) / spanX) * w,
    y: ((bbox.latMax - p.lat) / spanY) * h,
  };
};

// Polygon label anchor = simple vertex average.
export const polygonCentroid = (polygon) => {
  const lat = polygon.reduce((s, [l]) => s + l, 0) / polygon.length;
  const lng = polygon.reduce((s, [, l]) => s + l, 0) / polygon.length;
  return { lat, lng };
};

export const waypointNumberLabel = (i) => (i + 1).toString().padStart(2, '0');

// Bearing (degrees, 0 = north) between two lat/lng points — used to aim the
// MHC movement arrow marker along its direction of travel.
export const bearingDeg = (a, b) => {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

// ETA is a plain distance-based estimate — no real routing involved.
export const etaMinutes = (route, index) => {
  if (!route || route.length < 2) return null;
  const from = Math.max(0, index);
  let km = 0;
  for (let i = Math.max(from, 0); i < route.length - 1; i += 1) {
    km += haversineKm(route[i], route[i + 1]);
  }
  const speedKmh = 0.35; // ~21 km/h city speed
  return Math.max(1, Math.ceil(km / speedKmh));
};

export const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

// compact local timestamp — used for transcript dispatch/delivery times
export const fmtStamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${mon} · ${hh}:${mm}`;
};

// Expiry semantics for a batch — reuse the SAME district-risk colour language:
// red = critical (air < 48h), no new palette is invented here.
export const CRITICAL_WINDOW_MS = 48 * 60 * 60 * 1000;

export const expiryStatus = (dateStr, now = Date.now()) => {
  const end = new Date(dateStr).getTime();
  if (Number.isNaN(end)) return { risk: 'green', label: 'no expiry', msLeft: Infinity };
  const msLeft = end - now;
  if (msLeft <= 0) return { risk: 'red', label: `expired ${fmtCountdown(-msLeft)} ago`, msLeft };
  if (msLeft <= CRITICAL_WINDOW_MS) return { risk: 'red', label: `expires in ${fmtCountdown(msLeft)}`, msLeft };
  if (msLeft <= 7 * 24 * 60 * 60 * 1000) return { risk: 'amber', label: `expires in ${fmtCountdown(msLeft)}`, msLeft };
  return { risk: 'green', label: `expires in ${fmtCountdown(msLeft)}`, msLeft };
};

export const fmtCountdown = (ms) => {
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  if (ms >= DAY) {
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / HOUR);
    return `${d}d ${h}h`;
  }
  if (ms >= HOUR) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MIN);
    return `${h}h ${m}m`;
  }
  return `${Math.max(1, Math.floor(ms / MIN))}m`;
};

// Fake per-session telemetry identity — generated once per browser session and
// never changes, so the status strip reads like a real network node without
// being a real identifier.
export const fakeSessionIp = () => {
  const r2 = () => 2 + Math.floor(Math.random() * 253);
  const privateRange = Math.random() < 0.5;
  return privateRange ? `10.42.${r2()}.${r2()}` : `192.168.${r2()}.${r2()}`;
};