// ============================================================================
// SIMULATION OWNER — the SERVER owns the movement loop for the WHOLE fleet.
// Clients are pure renderers of broadcast state; they never run a timer.
// Dispatch / Start-Delivery only feed this loop an intent; this file advances
// currentWaypointIndex per vehicle and broadcasts the fresh state every tick.
// ============================================================================

import { tripRouteFor, pickupFor, buildTranscript, snapshot } from './state.js';

const STEP_MS = 2200; // one waypoint every 2.2 s, per vehicle
const ARRIVED_HOLD_MS = 2600; // hold at "arrived" before "delivered"
const DELIVERED_HOLD_MS = 6000; // hold "delivered" before returning to idle
const FRIDGE_MIN = 2;
const FRIDGE_MAX = 6;
const FRIDGE_STEP = 0.16;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const URGENCY_ORDER = { critical: 0, urgent: 1, routine: 2 };

export function createSimulation({ state, io }) {
  let intervalId = null;

  const broadcast = () => io.emit('state', snapshot(state));

  const event = (label) => {
    state.lastEvent = { at: Date.now(), label };
  };

  const fleet = () => state.fleet;
  const requestById = (id) => state.requests.find((r) => r.id === id);
  const hospitalById = (id) => state.hospitals.find((h) => h.id === id);
  const firstIdle = () => fleet().find((v) => v.status === 'idle');

  const stepFridge = (v) => {
    v.fridgeTemp = clamp(
      v.fridgeTemp + (Math.random() * 2 - 1) * FRIDGE_STEP,
      FRIDGE_MIN,
      FRIDGE_MAX,
    );
  };

  // -- intents (initiated by either screen) --------------------------------

  function assignOne(requestId) {
    const req = requestById(requestId);
    const vehicle = firstIdle();

    if (!req || req.status !== 'queued') return;
    if (!vehicle) return; // whole fleet busy — queue stays until a unit frees

    const route = tripRouteFor(req, state);
    if (!route.length) return;

    req.status = 'in-progress';

    vehicle.assignedRequestId = req.id;
    vehicle.route = route.map((p) => ({ ...p }));
    vehicle.startPoint = { lat: route[0].lat, lng: route[0].lng };
    vehicle.endPoint = { lat: route[route.length - 1].lat, lng: route[route.length - 1].lng };
    vehicle.currentWaypointIndex = 0;
    vehicle.currentWaypoint = { ...route[0] };
    vehicle.startedAt = Date.now();
    vehicle.arrivedAt = null;
    vehicle.deliveredAt = null;
    vehicle.tempLog = []; // fridge samples collected for this trip only
    const src = pickupFor(req, state);
    vehicle.sourceId = src.id;
    vehicle.status = 'in-transit'; // dispatch rolls the unit out immediately

    event(
      `${vehicle.id} · matched — ${req.bloodGroup} ${req.component} → ${hospitalById(req.hospitalId)?.name ?? 'destination'}`,
    );
    broadcast();
  }

  // MHC console: "Start Delivery" serves the highest-priority queued
  // request with the first idle vehicle.
  function startDeliveryFromCab() {
    const nextRequest = [...state.requests]
      .filter((r) => r.status === 'queued')
      .sort(
        (x, y) =>
          URGENCY_ORDER[x.urgency] - URGENCY_ORDER[y.urgency] ||
          x.timestamp.localeCompare(y.timestamp),
      )[0];
    if (nextRequest) assignOne(nextRequest.id);
    else event('no queued requests to serve');
  }

  // status machine ---------------------------------------------------------

  function tick() {
    for (const v of fleet()) {
      stepFridge(v);

      // sample the fridge only while the load is aboard — this array becomes
      // the temperature log on the delivery's transcript
      if (v.status === 'in-transit') {
        v.tempLog = v.tempLog || [];
        v.tempLog.push({ timestamp: Date.now(), temp: +v.fridgeTemp.toFixed(2) });
      }

      const req = requestById(v.assignedRequestId);

      if (v.status === 'in-transit') {
        const next = v.currentWaypointIndex + 1;
        if (next < v.route.length) {
          v.currentWaypointIndex = next;
          v.currentWaypoint = v.route[next];
        }
        if (v.currentWaypointIndex >= v.route.length - 1) {
          v.status = 'arrived';
          v.arrivedAt = Date.now();
          event(`${v.id} · arrived at ${hospitalById(req?.hospitalId)?.name ?? 'destination'}`);
        }
      } else if (v.status === 'arrived') {
        if (Date.now() - v.arrivedAt >= ARRIVED_HOLD_MS) {
          v.status = 'delivered';
          v.deliveredAt = Date.now();
          if (req) req.status = 'delivered';
          // a transcript is generated ONCE per completed delivery — full trip
          // record (route, temps, screening) frozen at this instant
          if (req && !state.transcripts.some((t) => t.requestId === req.id)) {
            state.transcripts.push(buildTranscript(state, req, v));
            event(`${v.id} · transcript logged — ${req.id}`);
          }
        }
      } else if (v.status === 'delivered') {
        if (Date.now() - v.deliveredAt >= DELIVERED_HOLD_MS) {
          v.route = [];
          v.currentWaypointIndex = -1;
          v.currentWaypoint = null;
          v.assignedRequestId = null;
          v.endPoint = null;
          v.sourceId = null;
          v.tempLog = [];
          v.status = 'idle';
          event(`${v.id} · back at depot — awaiting dispatch`);
        }
      }
    }

    broadcast();
  }

  function start() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, STEP_MS);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  return { start, stop, assignOne, startDelivery: startDeliveryFromCab, getState: () => state, broadcast };
}