// ============================================================================
// RaktaSetu demo — realtime hub. In-memory only, no persistence, no cloud.
// NOTE: any "connected to the network" claims below are SIMULATED indicators
// (demo data, local broadcast only). A real integration would replace the
// io handlers with calls into an e-RaktKosh/external blood-network API.
// ============================================================================

import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';

import { buildState, snapshot } from './state.js';
import { createSimulation } from './simulation.js';

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://raktasetu-demo.vercel.app';

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] },
});

// shared in-memory state + the server-owned simulation loop
const state = buildState();
const sim = createSimulation({ state, io });

io.on('connection', (socket) => {
  console.log(`[io] client connected: ${socket.id}`);

  socket.onAny((event, ...args) => {
    console.log(`[io] RECV socket event "${event}" payload:`, JSON.stringify(args));
  });

  // a late-joining tab gets the FULL current state immediately
  socket.emit('state', snapshot(state));

  socket.on('dispatch', ({ requestId } = {}) => {
    sim.assignOne(requestId);
  });

  socket.on('start-delivery', () => {
    sim.startDelivery();
  });

  // Citizen/donor mobile app — a donor books a donation slot at a depot. The
  // booking is appended to the SHARED in-memory state and re-broadcast, so any
  // console could surface scheduled donors later. No persistence, like the
  // rest of the demo; an id + reference is stamped server-side.
  socket.on('app:book-slot', (payload = {}) => {
    console.log(`[io] RECV app:book-slot from ${socket.id}: ${JSON.stringify(payload)}`);
    const { donorId, donorName, bankId, date, startTime } = payload;
    if (!donorId || !bankId || !date || !startTime) return;
    // A donor holds ONE live appointment at a time: rebinding replaces the old
    // slot instead of stacking bookings (matches the "upcoming appointment"
    // single-slot model both apps render). Keeps ids deterministic-ish.
    state.donations = state.donations.filter(
      (d) => !(d.donorId === donorId && d.status === 'confirmed'),
    );
    const count = state.donations.filter((d) => d.donorId === donorId).length;
    state.donations.push({
      id: `don-${donorId}-${count}`,
      donorId,
      donorName: donorName || donorId,
      bankId,
      date,
      startTime,
      status: 'confirmed',
      ref: `RKD-${String(1900 + (state.donations.length % 900)).padStart(5, '0')}`,
      createdAt: Date.now(),
    });
    sim.broadcast();
    console.log(`[io] app:book-slot STORED + broadcast done (donations now ${state.donations.length})`);
  });

  // Citizen app — cancel the donor's active slot. Server-side mutation of the
  // same shared donations array, so Home + Map consoles all reconcile via the
  // next broadcast.
  socket.on('app:cancel-slot', ({ donorId } = {}) => {
    console.log(`[io] RECV app:cancel-slot from ${socket.id}: donorId=${donorId}`);
    if (!donorId) return;
    const before = state.donations.length;
    state.donations = state.donations.filter(
      (d) => !(d.donorId === donorId && d.status === 'confirmed'),
    );
    if (state.donations.length !== before) {
      sim.broadcast();
      console.log(`[io] app:cancel-slot removed active slot (donations now ${state.donations.length})`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[io] client disconnected: ${socket.id}`);
  });
});

app.get('/api/health', (_req, res) => {
  // REAL INTEGRATION POINT: an actual deployment would proxy/probe the real
  // network here; this endpoint is deliberately a local mock.
  res.json({ ok: true, service: 'raktasetu-demo', mode: 'simulated', time: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Government access — DEMO-ONLY gatekeeper. The credential below is a
// hardcoded mock (no real auth, no sessions). In production this endpoint
// would be replaced by real identity + RBAC scoping of every transcript query,
// with DPDP-compliant consent handling — none of that exists in this demo.
// ---------------------------------------------------------------------------
const GOV_DEMO_CREDENTIAL = { username: 'govadmin', password: 'raktasetu-dem0' };

app.post('/api/gov/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === GOV_DEMO_CREDENTIAL.username && password === GOV_DEMO_CREDENTIAL.password) {
    res.json({ ok: true, access: 'gov-read', role: 'government', name: 'Ministry Desk (Demo)', mock: true });
  } else {
    res.status(401).json({ ok: false, error: 'invalid demo credential' });
  }
});

sim.start();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[RaktaSetu demo] server on http://localhost:${PORT}`);
  console.log('[RaktaSetu demo] mode=simulated · CORS:', ALLOWED_ORIGIN);
});