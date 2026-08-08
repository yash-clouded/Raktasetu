# Raktasetu — blood-network coordination demo (OS + Ambulance)

Live demo link - https://raktasetu-demo.vercel.app
Run the Backend In your Laptop 
If you want to connect the phone and laptop to real time just connect to the personal hotspot of the mobile.

> **⚠ Demo disclaimer — read first.** Every "connected" indicator, the
> **e-RaktKosh (demo)** status badge, the `Connected`/`Offline` pill, and
> `/api/health` are **simulated**. This project calls **no external API**, uses
> **no cloud or database**, and runs entirely on one machine with in-memory,
> hand-seeded mock data. It is a hackathon/demo artifact, not a real
> blood-network integration. A one-line comment marks the spot where a real API
> call would eventually live (`client/src/App.jsx`).
>
> Nothing here should be used to make real patient decisions.

Two screens share one local Node/Express + Socket.io broker so every state
change (a dispatch, each ambulance step, a status flip) updates **both** views
live, with no page refresh.

- **Operating System** — district risk heatmap, incoming request queue with
  *Match & Dispatch*, and a live unit-position map.
- **Ambulance** — same live map plus ETA, fridge readout, status stepper and a
  **Start Delivery** action that feeds back into the OS screen.

---

## Quick start
Requires **Node 18+** (tested on Node 24) and `npm`.

```bash
# from the project root
npm install && npm --prefix server install && npm --prefix client install
npm run dev
```

`npm run dev` uses `concurrently` to boot **both** processes:

| process | URL |
|---|---|
| Socket.IO/Express backend | <http://localhost:4000> (CORS allows `http://localhost:5173`) |
| Vite (React) frontend | <http://localhost:5173> |

Open <http://localhost:5173>. The Socket.IO client dials the single constant in
`client/src/config.js` (`SERVER_URL = 'http://localhost:4000'`) — the only
place that address is configured.

### Two-terminal fallback

```bash
# Terminal 1 — backend
cd server && npm start

# Terminal 2 — frontend
cd client && npm run dev
```

---

## Project structure

```
raktasetu/
├─ package.json            # root: `npm run dev` (concurrently)
├─ README.md
├─ server/                 # Express + Socket.IO, in-memory state
│  └─ src/
│     ├─ index.js          # HTTP + socket hub, CORS, connection handler
│     ├─ state.js          # ☞ MOCK DATA SEED  (edit numbers here only)
│     └─ simulation.js     # server-owned movement loop + state machine
└─ client/                 # React (Vite), plain CSS, self-hosted fonts
   ├─ vite.config.js       # port 5173
   └─ src/
      ├─ config.js         # SERVER_URL — the one behind-the-scenes constant
      ├─ App.jsx           # socket wiring, sidebar view routing
      ├─ index.css         # design system (clinical ops-centre look)
      ├─ lib/geo.js        # linear lat/lng→SVG projection + haversine ETA
      └─ components/       # OSDashboard, AmbulanceDashboard, TrackingMap,
                           # DistrictHeatmap, RequestsPanel, Sidebar, icons
```

## Data model (mock, seeded on server start)

Everything is defined in **`server/src/state.js`**; every number lives in that
one file, so you can swap in new fake figures **without touching components**:

- `bloodSources[]` — `id, name, lat, lng, inventory[{ bloodGroup, component,
  units, expiryDate }]`
- `hospitals[]` — `id, name, lat, lng, type` (`private | government | trust`)
- `requests[]` — `id, hospitalId, bloodGroup, component, quantity, urgency
  (critical|urgent|routine), timestamp, status`
- `fleet[]` — dispatchable units, each `{ id, driverName, assignedRequestId,
  startPoint, endPoint, route[] (8–12 waypoints, deterministic per pickup→hospital),
  currentWaypointIndex, fridgeTemp, status }`. Multiple units can be on the road
  at once — a dispatch always routes the next *idle* unit.
- `districtRisk[]` — `district, bloodGroup, stockLevel, riskColor
  (green|amber|red)` — each entry also carries a `polygon[]` so the client SVG
  can draw real **Delhi district zones** (North, West, South, New Delhi, …)
  tinted by risk, with the Yamuna channel for context.

Change a request count, hospital name, depot stock level, waypoint corridor or
zone polygon in that one file and restart; the UI just renders whatever the
socket delivers.

## How the real-time sync works

1. **Server owns the simulation** (`simulation.js`). A single timer advances
   `currentWaypoint` for **every in-transit unit** every 2.2 s and broadcasts a
   **snapshot of the full state** on every mutation. Clients never run a
   movement timer.
2. **Events, not ticks**: `Match & Dispatch` (OS) and `Start Delivery`
   (Ambulance) only emit an intent (`dispatch` / `start-delivery`). The server
   assigns the highest-priority queued request to the first **idle** unit and
   the loop takes over — so several drivers run at once on the same map.
3. **Late joiners** get the complete current state the moment they connect, so a
   second tab opened mid-run shows each vehicle already in motion at the same
   waypoint.
4. Status machine (per unit): `idle → in-transit → arrived → delivered → idle`.
   The fridge readout random-walks 2–6 °C; ETA is a simple distance/speed
   estimate (no routing engine).
5. Both screens render the **same broadcast state** through one SVG Delhi-region
   map (zones tinted by broadcast risk), so positions and zone colours can only
   ever be identical.

## Acceptance checklist — verified

- [x] OS loads: Delhi zone heatmap, request queue, fleet idle
- [x] `Match & Dispatch` → the next idle unit flips to `in-transit` on **both**
      screens; multiple dispatches put multiple units on the road
- [x] Markers step through waypoints on the Ambulance console and the OS map,
      live
- [x] Status auto-progresses `in-transit → arrived → delivered → idle`
- [x] ETA counts down; fridge temp random-walks 2–6 °C on both screens
- [x] A second tab opened mid-trip shows the vehicle already in transit at the
      same position (no refresh)

An end-to-end integration check lives at `client/test-realtime.mjs`:

```bash
cd server && npm start              # keep the server running
cd ../client && node test-realtime.mjs
```

## Design notes

Restrained, clinical palette: off-white paper, near-black ink, deep maroon as
the **only** accent (tied to the blood-service domain), with a separate muted
set for risk states. Type pairing is **Space Grotesk** (UI) + **Fraunces**
(headings), served self-hosted via `@fontsource` — no Google Fonts call, no tile
provider. Maps are inline SVG, projecting lat/lng linearly into the viewBox
(no Leaflet/Mapbox). Custom stroke SVG icon set only — no emoji.

The Android client is **not** part of this build — this is web-only (OS +
Ambulance screens, real-time synced). The APK is a separate later step.

The photos are attached below for the mobile interface and OS+MHC interface with the Gov pictures included
<img width="787" height="1600" alt="WhatsApp Image 2026-08-08 at 17 21 51 (1)" src="https://github.com/user-attachments/assets/061e156a-bf29-4258-b314-25e928120177" />
<img width="787" height="1600" alt="WhatsApp Image 2026-08-08 at 17 21 51" src="https://github.com/user-attachments/assets/137a40c7-b4e6-48ca-9f33-61fdbcddc5ac" />
<img width="787" height="1600" alt="WhatsApp Image 2026-08-08 at 17 21 50 (1)" src="https://github.com/user-attachments/assets/b5cdbb43-3ced-44b9-b8ca-bb14c8ea2470" />
<img width="787" height="1600" alt="WhatsApp Image 2026-08-08 at 17 21 50" src="https://github.com/user-attachments/assets/14fc923c-2783-4573-9fb5-088f0e0d5e59" />
<img width="1476" height="784" alt="Screenshot 2026-08-08 at 5 18 43 PM" src="https://github.com/user-attachments/assets/f173fb54-ccb5-475f-a2fd-9804a83ff4d2" />
<img width="1479" height="787" alt="Screenshot 2026-08-08 at 5 18 59 PM" src="https://github.com/user-attachments/assets/d7755740-0ae1-4ed7-b41b-b98c283d60e3" />
<img width="1477" height="784" alt="Screenshot 2026-08-08 at 5 19 20 PM" src="https://github.com/user-attachments/assets/d61e775a-d8e4-402b-a830-5aa0d7b493c3" />

<img width="1469" height="788" alt="Screenshot 2026-08-08 at 5 19 32 PM" src="https://github.com/user-attachments/assets/fddbd0fc-0ab0-406a-9762-252491a54f05" />

