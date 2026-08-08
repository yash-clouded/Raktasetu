// ============================================================================
// MOCK DATA SEED — swap any numbers/shapes here, component code reads this generically.
//
// This is the ONLY server file you need to touch to change the demo data:
//   - bloodSources / hospitals / requests / fleet / districtRisk follow the DDL shown
//   - Every depot, hospital and request below sits inside Greater Delhi
//     (bbox lat 28.42–28.80 · lng 76.90–77.33), so the SVG zone map lines up.
//   - District polygons are hand-placed quads named after real Delhi districts;
//     the riskColor (green | amber | red) drives both the map tint and the heatmap.
//   - A dispatch picks the first IDLE vehicle, so several units can be on the
//     road at once — each with its own route, fridge temp and status.
// Nothing networked or persisted: re-seeded on every server start.
// ============================================================================

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ISO = (offsetMin) =>
  new Date(Date.now() + offsetMin * 60_000).toISOString();

// expiry date for a batch, `days` from today (so the demo always shows a mix
// of near-expiry and far-future batches, whatever day it is run)
const inDays = (days) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Region frame (Delhi). All seed coords must fall inside this box.
// ---------------------------------------------------------------------------
export const DELHI_BBOX = {
  latMin: 28.42,
  latMax: 28.80,
  lngMin: 76.90,
  lngMax: 77.33,
};

// Build a rough district polygon from a lat/lng rectangle, then dent one corner
// (inward by ~0.5 km) so the grid reads as blocs, not spreadsheet cells.
function quad(latMin, latMax, lngMin, lngMax, dent = 0.006) {
  return [
    [latMax, lngMin],
    [latMax, lngMax],
    [latMin, lngMax],
    [latMin + dent, lngMax - dent], // dented south-east corner
    [latMin, lngMin],
  ];
}

// ---------------------------------------------------------------------------
// Blood sources — each source (fixed depot or mobile unit) carries stock as
// FOUR temperature compartments, not one flat inventory list. Every batch is
// { bloodGroup, units, expiryDate }; the compartment decides the component:
//   rbcFridge          → red-cell products (Whole Blood / Packed Cells) @ 2–6°C
//   plateletIncubator  → Platelets. NOTE: platelets are NOT frozen — they are
//                        stored in a shaker/incubator at 20–24°C, so this
//                        compartment is functionally (and visually) distinct
//                        from the fridge, it is not just a renamed list.
//   plasmaFreezer      → Fresh Frozen Plasma @ ≤-18°C
//   cryoStorage        → cryoprecipitate @ ≤-65°C
// allBatches() flattens this back to the old {bloodGroup, component, units,
// expiryDate} rows so dispatch/route matching keeps working unchanged.
// ---------------------------------------------------------------------------
function batch(bloodGroup, units, days) {
  return { bloodGroup, units, expiryDate: inDays(days) };
}

function buildSources() {
  return [
    {
      id: 'bs-1',
      name: 'Blood Depot — R.K. Puram (South)',
      type: 'fixed',
      lat: 28.5900,
      lng: 77.1500,
      rbcFridge: [
        { ...batch('O+', 42, 7), component: 'Packed Cells' },
        { ...batch('A+', 26, 14), component: 'Packed Cells' },
        { ...batch('O+', 14, 2), component: 'Whole Blood' },
        { ...batch('A-', 8, 30), component: 'Whole Blood' },
      ],
      plateletIncubator: [
        { ...batch('B+', 6, 4) },
        { ...batch('AB+', 9, 1) },
      ],
      plasmaFreezer: [
        { ...batch('O+', 30, 28) },
        { ...batch('A+', 14, 60) },
        { ...batch('A-', 12, 45) },
      ],
      cryoStorage: [
        { ...batch('B-', 5, 10) },
        { ...batch('O-', 4, 3) },
      ],
    },
    {
      id: 'bs-2',
      name: 'Blood Sourcing Unit — Naraina (West)',
      type: 'mobile',
      lat: 28.6450,
      lng: 77.0400,
      rbcFridge: [
        { ...batch('O+', 22, 5), component: 'Packed Cells' },
        { ...batch('B+', 19, 9), component: 'Packed Cells' },
        { ...batch('B+', 7, 2), component: 'Whole Blood' },
      ],
      plateletIncubator: [
        { ...batch('B-', 3, 1) },
        { ...batch('O+', 6, 5) },
      ],
      plasmaFreezer: [
        { ...batch('A-', 7, 6) },
        { ...batch('A+', 11, 12) },
      ],
      cryoStorage: [
        { ...batch('AB+', 3, 9) },
        { ...batch('O+', 5, 2) },
      ],
    },
    {
      id: 'bs-3',
      name: 'Blood Depot — Kashmere Gate (Central)',
      type: 'fixed',
      lat: 28.6740,
      lng: 77.2350,
      rbcFridge: [
        { ...batch('O+', 52, 21), component: 'Packed Cells' },
        { ...batch('B-', 6, 4), component: 'Packed Cells' },
        { ...batch('O-', 3, 5), component: 'Whole Blood' },
        { ...batch('O-', 5, 1), component: 'Whole Blood' },
      ],
      plateletIncubator: [
        { ...batch('AB+', 9, 2) },
      ],
      plasmaFreezer: [
        { ...batch('B+', 17, 30) },
        { ...batch('A-', 3, 1) },
      ],
      cryoStorage: [
        { ...batch('O+', 3, 15) },
      ],
    },
  ];
}

// flattened view of a source's compartments — the old inventory shape, so the
// dispatch matching logic (pickupFor) reads one uniform list.
export function allBatches(src) {
  const COMPONENT_BY_COMPARTMENT = {
    rbcFridge: null, // batches carry their own component (Whole Blood vs Packed Cells)
    plateletIncubator: 'Platelets',
    plasmaFreezer: 'FFP',
    cryoStorage: 'Cryo',
  };
  return Object.entries(COMPONENT_BY_COMPARTMENT).flatMap(([key, fallback]) =>
    (src[key] || []).map((b) => ({
      bloodGroup: b.bloodGroup,
      component: b.component || fallback,
      units: b.units,
      expiryDate: b.expiryDate,
    })),
  );
}

// ---------------------------------------------------------------------------
// Hospitals — spread across the Delhi districts above
// ---------------------------------------------------------------------------
function buildHospitals() {
  return [
    { id: 'h1', name: 'Sarvodaya Super Specialty Hospital', lat: 28.5450, lng: 77.1850, type: 'government' },
    { id: 'h2', name: 'Metro Care Heart Institute', lat: 28.6750, lng: 77.1750, type: 'private' },
    { id: 'h3', name: 'Jai Prakash Multi-Specialty Trust', lat: 28.6700, lng: 77.0000, type: 'trust' },
    { id: 'h4', name: 'Shri Ram Sahas Health Trust', lat: 28.7560, lng: 77.1350, type: 'trust' },
    { id: 'h5', name: 'Govind Ballabh Pant Wing', lat: 28.5510, lng: 77.2900, type: 'government' },
    { id: 'h6', name: 'East Delhi Metro Care Annex', lat: 28.6900, lng: 77.3000, type: 'private' },
  ];
}

// ---------------------------------------------------------------------------
// Incoming requests — urgency drives prioritisation; status flips server-side.
// Components are picked to match depot inventory above so every dispatch has
// a real pickup with units >= quantity.
// ---------------------------------------------------------------------------
function buildRequests() {
  return [
    { id: 'req-1', hospitalId: 'h2', bloodGroup: 'A+', component: 'Packed Cells', quantity: 4, urgency: 'critical', timestamp: ISO(-26), status: 'queued' },
    { id: 'req-2', hospitalId: 'h4', bloodGroup: 'B+', component: 'Whole Blood', quantity: 5, urgency: 'routine', timestamp: ISO(-14), status: 'queued' },
    { id: 'req-3', hospitalId: 'h1', bloodGroup: 'AB+', component: 'Platelets', quantity: 2, urgency: 'critical', timestamp: ISO(-9), status: 'queued' },
    { id: 'req-4', hospitalId: 'h3', bloodGroup: 'A-', component: 'FFP', quantity: 3, urgency: 'urgent', timestamp: ISO(-5), status: 'queued' },
    { id: 'req-5', hospitalId: 'h5', bloodGroup: 'O-', component: 'Whole Blood', quantity: 2, urgency: 'urgent', timestamp: ISO(-3), status: 'queued' },
    { id: 'req-6', hospitalId: 'h6', bloodGroup: 'O+', component: 'Packed Cells', quantity: 4, urgency: 'routine', timestamp: ISO(-1), status: 'queued' },
  ];
}

// ---------------------------------------------------------------------------
// District risk — drives the SVG Delhi zone map (green/amber/red) AND the top
// heatmap strip. Add/remove/rename districts here; the map recomputes from
// whatever the socket delivers.
// ---------------------------------------------------------------------------
function buildDistrictRisk() {
  return [
    { district: 'West', bloodGroup: 'B+', stockLevel: 62, riskColor: 'amber', polygon: quad(28.64, 28.72, 76.94, 77.06, 0.008) },
    { district: 'North-West', bloodGroup: 'O+', stockLevel: 310, riskColor: 'green', polygon: quad(28.72, 28.79, 76.94, 77.08, 0.007) },
    { district: 'North', bloodGroup: 'O-', stockLevel: 12, riskColor: 'red', polygon: quad(28.72, 28.79, 77.10, 77.22, 0.006) },
    { district: 'North-East', bloodGroup: 'A+', stockLevel: 96, riskColor: 'amber', polygon: quad(28.73, 28.79, 77.24, 77.33, 0.006) },
    { district: 'New Delhi', bloodGroup: 'AB+', stockLevel: 208, riskColor: 'green', polygon: quad(28.64, 28.72, 77.12, 77.24, 0.006) },
    { district: 'East', bloodGroup: 'O+', stockLevel: 47, riskColor: 'green', polygon: quad(28.64, 28.73, 77.28, 77.33, 0.009) },
    { district: 'South-West', bloodGroup: 'B-', stockLevel: 11, riskColor: 'red', polygon: quad(28.50, 28.64, 76.94, 77.08, 0.008) },
    { district: 'South', bloodGroup: 'O-', stockLevel: 8, riskColor: 'red', polygon: quad(28.50, 28.64, 77.10, 77.24, 0.006) },
    { district: 'South-East', bloodGroup: 'A+', stockLevel: 116, riskColor: 'green', polygon: quad(28.50, 28.64, 77.26, 77.33, 0.008) },
  ];
}

// ---------------------------------------------------------------------------
// The fleet — Mobile Health Centres (MHCs). An MHC is the vehicle shown on the
// map AND the digital twin of a physically-designed mobile blood bank: it
// carries donation / processing / lab / cold-storage compartments, so it is a
// mini-blood-bank on wheels, not just a delivery van. Waypoints movement,
// compartment fridge temp and status machine are all untouched here — this
// section only names the units. Each MHC has its own route/fridge/status.
// ---------------------------------------------------------------------------
function buildFleet() {
  const start = (lat, lng) => ({ lat, lng });
  return [
    {
      id: 'MHC-01',
      mhcOperator: 'Aakash Saini',
      registrationNo: 'DL 01 BB 4471',
      assignedRequestId: null,
      startPoint: start(28.5900, 77.1500), // parked at R.K. Puram depot
      endPoint: null,
      route: [],
      currentWaypointIndex: -1,
      currentWaypoint: null,
      fridgeTemp: 3.7,
      status: 'idle', // idle | stolen out via in-transit | arrived | delivered
      startedAt: null,
      arrivedAt: null,
      deliveredAt: null,
    },
    {
      id: 'MHC-02',
      mhcOperator: 'Priya Verma',
      registration: 'DL 02 CD 8836',
      assignedRequestId: null,
      startPoint: start(28.6450, 77.0400), // parked at Naraina
      endPoint: null,
      route: [],
      currentWaypointIndex: -1,
      currentWaypoint: null,
      fridgeTemp: 3.9,
      status: 'idle',
      startedAt: null,
      arrivedAt: null,
      deliveredAt: null,
    },
    {
      id: 'MHC-03',
      mhcOperator: 'Mohit Kalsi',
      registration: 'DL 03 GA 2210',
      assignedRequestId: null,
      startPoint: start(28.6740, 77.2350), // parked at Kashmere Gate
      endPoint: null,
      route: [],
      currentWaypointIndex: -1,
      currentWaypoint: null,
      fridgeTemp: 4.1,
      status: 'idle',
      startedAt: null,
      arrivedAt: null,
      deliveredAt: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Route generation — deterministic, repeatable "hardcoded" corridors.
// Same pickup → same hospital always draws the same 10–12 waypoints, so the
// demo shows a stable street pattern per request. Amplitude ~0.5 km.
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function routeBetween(sLat, sLng, dLat, dLng, key, n) {
  const steps = n || 10 + (hash(key) % 3); // 10–12 waypoints per run
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    if (i === 0) {
      pts.push({ lat: sLat, lng: sLng });
      continue;
    }
    if (i === steps) {
      pts.push({ lat: dLat, lng: dLng });
      continue;
    }
    const t = i / steps;
    const r1 = hash(`${key}:${i}`) / 0xffffffff;
    const r2 = hash(`${key}:${i}:y`) / 0xffffffff;
    const taper = 1 - 2 * Math.abs(t - 0.5); // less wander near ends
    const amp = 0.004 * (0.45 + 0.55 * taper);
    pts.push({
      lat: sLat + (dLat - sLat) * t + (r1 - 0.5) * 2 * amp,
      lng: sLng + (dLng - sLng) * t + (r2 - 0.5) * 2 * amp * 0.85,
    });
  }
  return pts;
}

// first depot that can actually cover the request; otherwise the primary depot
export function pickupFor(req, state) {
  for (const src of state.bloodSources) {
    const ok = allBatches(src).some(
      (i) => i.bloodGroup === req.bloodGroup && i.component === req.component && i.units >= req.quantity,
    );
    if (ok) return src;
  }
  return state.bloodSources[0];
}

export function tripRouteFor(request, state) {
  const src = pickupFor(request, state);
  const hospital = state.hospitals.find((h) => h.id === request.hospitalId) || state.hospitals[0];
  return routeBetween(
    src.lat,
    src.lng,
    hospital.lat,
    hospital.lng,
    `${src.id}:${hospital.id}`,
    12,
  );
}

// ---------------------------------------------------------------------------
// Delivery transcripts — generated ONCE per completed delivery (when a request
// reaches 'delivered'), never edited. A deterministic per-request screening
// status mirrors lab results (mostly pass, rare fail) so the demo UI has
// variety without any real lab data. NOTE: this is a local, in-memory demo —
// a production system would persist transcripts and gate every role read via
// authenticated RBAC + DPDP-compliant consent (flagged here, not built).
// ---------------------------------------------------------------------------
export function screeningFor(requestId) {
  const h = hash(requestId);
  return {
    hbCheck: h % 23 === 0 ? 'fail' : 'pass', // Hb check on sample issued
    groupConfirm: h % 31 === 0 ? 'fail' : 'pass', // cross-group confirmation
    tti:
      {
        hbsag: h % 37 === 0 ? 'fail' : 'pass',
        hcv: h % 41 === 0 ? 'fail' : 'pass',
        hiv: h % 47 === 0 ? 'fail' : 'pass',
      }, // TTI screening
    cleared:
      h % 23 !== 0 &&
      h % 31 !== 0 &&
      h % 37 !== 0 &&
      h % 41 !== 0 &&
      h % 47 !== 0,
  };
}

export function buildTranscript(state, req, vehicle) {
  const hospital = state.hospitals.find((h) => h.id === req.hospitalId) || state.hospitals[0];
  const source = state.bloodSources.find((s) => s.id === vehicle.sourceId) || state.bloodSources[0];
  const screening = screeningFor(req.id);

  return {
    id: `tr-${req.id}`,
    requestId: req.id,
    bloodGroup: req.bloodGroup,
    component: req.component,
    quantity: req.quantity,
    urgency: req.urgency,
    hospitalId: hospital.id,
    hospital: hospital.name,
    sourceId: source.id,
    source: source.name,
    mhcId: vehicle.id,
    mhcOperator: vehicle.mhcOperator,
    mhcReg: vehicle.registration,
    dispatchAt: vehicle.startedAt,
    deliveredAt: vehicle.deliveredAt,
    route: (vehicle.route || []).map((p) => [p.lat, p.lng]),
    temps: vehicle.tempLog || [],
    screening,
  };
}

// Donation appointments created from the citizen/donor mobile app. Written to
// the shared state so any console (e.g. the OS) could surface scheduled donors
// later without the mobile app embedding knowledge of the web UI. Seed one past
// visit so the demo donor's "last donated" wall clock starts mid-window.
function buildDonations() {
  return [
    {
      id: 'don-0',
      donorId: 'DON-RAFIK',
      donorName: 'Rafik Alam',
      bankId: 'bs-1',
      date: new Date(Date.now() - 62 * 86_400_000).toISOString().slice(0, 10),
      startTime: '10:30',
      status: 'completed', // completed | confirmed
      ref: 'RKD-0001892',
      createdAt: Date.now() - 62 * 86_400_000,
    },
  ];
}

function buildMockTranscripts() {
  return [
    {
      id: 'tr-mock-1',
      requestId: 'req-mock-1',
      bloodGroup: 'O+',
      component: 'Whole Blood',
      quantity: 3,
      urgency: 'urgent',
      hospitalId: 'h1',
      hospital: 'Sarvodaya Super Specialty Hospital',
      sourceId: 'bs-1',
      source: 'Blood Depot — R.K. Puram (South)',
      mhcId: 'MHC-01',
      mhcOperator: 'Aakash Saini',
      mhcReg: 'DL 01 BB 4471',
      dispatchAt: Date.now() - 3600000,
      deliveredAt: Date.now() - 1800000,
      route: [
        [28.5900, 77.1500],
        [28.5700, 77.1700],
        [28.5450, 77.1850]
      ],
      temps: [
        { timestamp: Date.now() - 3000000, temp: 4.2 },
        { timestamp: Date.now() - 2400000, temp: 3.9 }
      ],
      screening: {
        hbCheck: 'pass',
        groupConfirm: 'pass',
        tti: { hbsag: 'pass', hcv: 'pass', hiv: 'pass' },
        cleared: true
      }
    },
    {
      id: 'tr-mock-2',
      requestId: 'req-mock-2',
      bloodGroup: 'A+',
      component: 'Packed Cells',
      quantity: 4,
      urgency: 'critical',
      hospitalId: 'h2',
      hospital: 'Metro Care Heart Institute',
      sourceId: 'bs-3',
      source: 'Blood Depot — Kashmere Gate (Central)',
      mhcId: 'MHC-02',
      mhcOperator: 'Priya Verma',
      mhcReg: 'DL 02 CD 8836',
      dispatchAt: Date.now() - 7200000,
      deliveredAt: Date.now() - 5400000,
      route: [
        [28.6740, 77.2350],
        [28.6745, 77.2000],
        [28.6750, 77.1750]
      ],
      temps: [
        { timestamp: Date.now() - 6600000, temp: 3.8 },
        { timestamp: Date.now() - 6000000, temp: 4.1 }
      ],
      screening: {
        hbCheck: 'pass',
        groupConfirm: 'pass',
        tti: { hbsag: 'pass', hcv: 'pass', hiv: 'pass' },
        cleared: true
      }
    }
  ];
}

export function buildState() {
  return {
    region: DELHI_BBOX,
    bloodSources: buildSources(),
    hospitals: buildHospitals(),
    requests: buildRequests(),
    districtRisk: buildDistrictRisk(),
    fleet: buildFleet(),
    transcripts: buildMockTranscripts(), // grown live as deliveries complete
    donations: buildDonations(),
    lastEvent: { at: null, label: 'system online' },
  };
}

// Fresh snapshot per broadcast — clients diff by reference so a new object
// guarantees React re-renders on every server tick.
export const snapshot = (state) => structuredClone(state);