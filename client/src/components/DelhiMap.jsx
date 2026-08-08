import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { bearingDeg } from '../lib/geo';

// ===========================================================================
// REAL-MAP rendering of the same shared server state, using Leaflet + OSM
// tiles (no API key, browser-cached for a demo). Everything else (heatmap
// data source, socket sync, dispatch logic) is untouched — this replaces the
// abstract SVG district blocks with real geography and fixes readability:
//   - risk zones are a translucent GeoJSON overlay on top of the tiles
//   - depots/hospitals cluster (Leaflet.markercluster) and label on hover
//   - units are distinct maroon arrows rotated toward travel, animated
//     smoothly between server waypoints, with a short trail, on the top pane
// ===========================================================================

const STEP_MS = 2200; // mirror of the server loop cadence (movement stays server-owned)
const CENTER = [28.6, 77.2]; // Delhi NCR
const ZOOM = 11;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const RISK_STYLE = {
  green: { color: '#22753b', weight: 1, opacity: 0.8, fillColor: '#22753b', fillOpacity: 0.22 },
  amber: { color: '#9c6f08', weight: 1, opacity: 0.85, fillColor: '#9c6f08', fillOpacity: 0.2 },
  red: { color: '#a8231f', weight: 1, opacity: 0.9, fillColor: '#a8231f', fillOpacity: 0.24 },
};
const RISK_LABEL = { green: 'adequate', amber: 'watch', red: 'critical' };

const LAYERS = [
  { id: 'zones', label: 'Risk zones' },
  { id: 'depots', label: 'Blood depots' },
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'units', label: 'MHC units' },
  { id: 'roads', label: 'Roads & labels' },
];

// ---- custom SVG icons (no Leaflet default markers) ------------------------

const svgWrap = (inner, size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

function depotIcon() {
  return L.divIcon({
    className: 'rs-divicon',
    html: svgWrap(
      `<circle cx="13" cy="13" r="10" class="rs-depot-ring"/><path d="M13 7.4c2 2.3 4 4.1 4 6.7a4 4 0 1 1-8 0c0-2.6 2-4.4 4-6.7Z" class="rs-depot-drop"/>`,
      26,
    ),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function hospIcon() {
  return L.divIcon({
    className: 'rs-divicon',
    html: svgWrap(
      `<circle cx="13" cy="13" r="10" class="rs-hosp-ring"/><path d="M13 8.4v9.2M8.4 13h9.2" class="rs-hosp-cross"/>`,
      26,
    ),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function activeUnitIcon() {
  return L.divIcon({
    className: 'rs-divicon',
    html: svgWrap(
      `<circle cx="20" cy="20" r="15" class="rs-pulse"/><g class="rs-rot"><path d="M20 6 L30 30 L20 24 L10 30 Z" class="rs-arrow"/></g>`,
      40,
    ),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function parkedIcon() {
  return L.divIcon({
    className: 'rs-divicon',
    html: svgWrap(`<circle cx="13" cy="13" r="9" class="rs-parked"/>`, 26),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// ===========================================================================
// component
// ===========================================================================

export default function DelhiMap({ fleet = [], district = [], hospitals = [], bloodSources = [], label, onSourceClick }) {
  const containerRef = useRef(null);
  const layersRef = useRef({}); // { map, tiles, zones, depots, hospitals, units }
  const animRef = useRef({}); // per-unit animation state
  const parkedRef = useRef({}); // per-unit parked (idle) markers
  const zonesKeyRef = useRef(null);
  const staticKeyRef = useRef({ depots: null, hospitals: null });
  const propsRef = useRef({ fleet, district, hospitals, bloodSources });
  const rafRef = useRef(null);
  const onSourceClickRef = useRef(onSourceClick);
  onSourceClickRef.current = onSourceClick;

  const [visible, setVisible] = useState({ zones: true, depots: true, hospitals: true, units: true, roads: true });
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  propsRef.current = { fleet, district, hospitals, bloodSources };

  const activeCount = fleet.filter((v) => v.status !== 'idle').length;

  // ---------------------------------------------------------------- layers --

  const syncZones = useCallback((lref, district) => {
    const key = JSON.stringify((district || []).map((d) => [d.district, d.riskColor, d.stockLevel, JSON.stringify(d.polygon)]));
    if (lref.zonesKey === key) return;
    lref.zonesKey = key;
    const zones = lref.zones;
    zones.clearLayers();
    (district || []).forEach((d) => {
      const ring = (d.polygon || []).map(([lat, lng]) => [lat, lng]);
      const poly = L.polygon(ring, { pane: 'rsZones', ...RISK_STYLE[d.riskColor] });
      poly.bindTooltip(
        `${d.district} — ${d.bloodGroup} · ${d.stockLevel} units · ${RISK_LABEL[d.riskColor]}`,
        { className: 'rs-tooltip', direction: 'top', offset: L.point(0, -6) },
      );
      poly.on('mouseover', () => poly.setStyle({ weight: 2.2 }));
      poly.on('mouseout', () => poly.setStyle({ ...RISK_STYLE[d.riskColor] }));
      zones.addLayer(poly);
    });
  }, []);

  const syncStatic = useCallback((lref, which, items, makeIcon, keyName, onClick) => {
    const key = JSON.stringify((items || []).map((x) => [x.id, x.lat, x.lng, x.name]));
    if (staticKeyRef.current[keyName] === key) return;
    staticKeyRef.current[keyName] = key;
    const group = lref[which];
    group.clearLayers();
    (items || []).forEach((it) => {
      const m = L.marker([it.lat, it.lng], { icon: makeIcon() });
      m.bindTooltip(it.name, { className: 'rs-tooltip', direction: 'top', offset: L.point(0, -6) });
      if (typeof onClick === 'function') m.on('click', () => onClick(it));
      group.addLayer(m);
    });
  }, []);

  // ------------------------------------------------------------ unit sync --

  const ensureUnit = useCallback((lref, v) => {
    const units = lref.units;
    const anim = animRef.current;
    if (anim[v.id]?.marker) return;
    const start = v.currentWaypoint || v.route[0];
    const marker = L.marker([start.lat, start.lng], { icon: activeUnitIcon(), pane: 'rsUnits' });
    marker.bindTooltip(`${v.id} · ${v.mhcOperator} · ${v.status}`, { className: 'rs-tooltip', direction: 'top', offset: L.point(0, -20) });
    const trail = L.polyline([], { pane: 'rsUnits', color: '#7c2126', weight: 3, opacity: 0.7, dashArray: '6 8' });
    units.addLayer(trail);
    units.addLayer(marker);
    anim[v.id] = {
      marker,
      trail,
      from: marker.getLatLng(),
      to: null,
      t0: 0,
      dur: 1000,
      heading: 0,
      trailLast: [],
      rotEl: null,
    };
  }, []);

  const ensureParked = useCallback((lref, v) => {
    const parked = parkedRef.current;
    let m = parked[v.id];
    if (!m) {
      m = L.marker([v.startPoint.lat, v.startPoint.lng], { icon: parkedIcon(), pane: 'rsUnits' });
      m.bindTooltip(`${v.id} · ${v.mhcOperator} · idle at depot`, { className: 'rs-tooltip', direction: 'top', offset: L.point(0, -14) });
      parked[v.id] = m;
    }
    if (!lref.units.hasLayer(m)) lref.units.addLayer(m);
  }, []);

  const syncUnits = useCallback((lref, fleet) => {
    const units = lref.units;
    const anim = animRef.current;
    const parked = parkedRef.current;
    const activeIds = new Set();

    fleet.forEach((v) => {
      if (v.status === 'idle' || !v.route?.length) {
        if (v.startPoint) ensureParked(lref, v);
        return;
      }
      activeIds.add(v.id);
      ensureUnit(lref, v);
      // --- re-anchor animation toward the new server waypoint
      const a = anim[v.id];
      const cur = v.currentWaypoint || v.route[0];
      const target = L.latLng(cur.lat, cur.lng);
      const now = performance.now();
      if (!a.to || !a.to.equals(target)) {
        const fromPos = a.marker.getLatLng() || target;
        a.from = fromPos;
        a.to = target;
        a.t0 = now;
        a.dur = STEP_MS;
        a.heading = bearingDeg(fromPos, target);
      }
      // trail = last 3 waypoints + the moving head
      const idx = v.currentWaypointIndex;
      a.trailLast = v.route.slice(Math.max(0, idx - 3), idx + 1).map((p) => [p.lat, p.lng]);
    });

    // drop units that went idle / parked markers that went active
    Object.keys(parked).forEach((id) => {
      const v = fleet.find((u) => u.id === id);
      if (v && (v.status !== 'idle' || !v.startPoint)) {
        units.removeLayer(parked[id]);
        delete parked[id];
      }
    });
    Object.keys(anim).forEach((id) => {
      if (!activeIds.has(id) && anim[id]) {
        units.removeLayer(anim[id].marker);
        units.removeLayer(anim[id].trail);
        delete anim[id];
      }
    });
  }, [ensureUnit, ensureParked]);

  // continuous interpolation between server waypoints (presentation only)
  const startAnimLoop = useCallback(() => {
    if (rafRef.current) return;
    const loop = (now) => {
      const lref = layersRef.current;
      let any = false;
      Object.values(animRef.current).forEach((a) => {
        if (!a.marker || !a.to) return;
        any = true;
        const p = Math.min(1, Math.max(0, (now - a.t0) / a.dur));
        const lat = a.from.lat + (a.to.lat - a.from.lat) * p;
        const lng = a.from.lng + (a.to.lng - a.from.lng) * p;
        a.marker.setLatLng([lat, lng]);
        if (!a.rotEl && a.marker.getElement()) a.rotEl = a.marker.getElement().querySelector('.rs-rot');
        if (a.rotEl) a.rotEl.style.transform = `rotate(${a.heading}deg)`;
        if (a.trail) a.trail.setLatLngs([...a.trailLast, [lat, lng]]);
      });
      rafRef.current = any ? requestAnimationFrame(loop) : null;
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ------------------------------------------------------ visibility ------

  const applyVisibility = useCallback((lref, vis) => {
    if (!lref.map) return;
    [
      ['zones', vis.zones],
      ['depots', vis.depots],
      ['hospitals', vis.hospitals],
      ['units', vis.units],
    ].forEach(([key, on]) => {
      const layer = lref[key];
      if (!layer) return;
      if (on && !lref.map.hasLayer(layer)) lref.map.addLayer(layer);
      if (!on && lref.map.hasLayer(layer)) lref.map.removeLayer(layer);
    });
    const tiles = lref.tiles;
    if (vis.roads && !lref.map.hasLayer(tiles)) lref.map.addLayer(tiles);
    if (!vis.roads && lref.map.hasLayer(tiles)) lref.map.removeLayer(tiles);
  }, []);

  const syncAll = useCallback(() => {
    const lref = layersRef.current;
    if (!lref.map) return;
    const { fleet, district, hospitals, bloodSources } = propsRef.current;
    syncZones(lref, district);
    syncStatic(lref, 'depots', bloodSources, depotIcon, 'depots', onSourceClickRef.current);
    syncStatic(lref, 'hospitals', hospitals, hospIcon, 'hospitals');
    syncUnits(lref, fleet);
    startAnimLoop();
    applyVisibility(lref, visibleRef.current);
  }, [syncZones, syncStatic, syncUnits, startAnimLoop, applyVisibility]);

  // ------------------------------------------------------------ lifecycle --

  useEffect(() => {
    let cancelled = false;
    let map = null;
    (async () => {
      // leaflet.markercluster is a UMD wrapper that reads the GLOBAL L — its
      // factory re-uses whatever was assigned to window.L (leaflet sets this
      // on import). Make the binding explicit, then load the plugin.
      if (typeof window !== 'undefined') window.L = window.L || L;
      await import('leaflet.markercluster');
      if (cancelled) return;

      const el = containerRef.current;
      if (!el) return;

      map = L.map(el, {
        center: CENTER,
        zoom: ZOOM,
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const zonesPane = map.createPane('rsZones');
      zonesPane.style.zIndex = 380;
      const unitsPane = map.createPane('rsUnits');
      unitsPane.style.zIndex = 640; // above markers(600) & zones, below tooltips(650)

      const tiles = L.tileLayer(TILE_URL, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });

      const clusterOpts = { showCoverageOnHover: false, zoomToBoundsOnClick: true, spiderfyOnMaxZoom: true };
      const zones = L.layerGroup([], { pane: 'rsZones' });
      const depots = L.markerClusterGroup ? L.markerClusterGroup(clusterOpts) : L.layerGroup();
      const hospitalsLayer = L.markerClusterGroup ? L.markerClusterGroup(clusterOpts) : L.layerGroup();
      const units = L.layerGroup([], { pane: 'rsUnits' });

      layersRef.current = { map, tiles, zones, depots, hospitals: hospitalsLayer, units };

      tiles.addTo(map);
      syncAll(); // paint parked state immediately, before the next broadcast
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[DelhiMap] leaflet init failed:', err);
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      animRef.current = {};
      parkedRef.current = {};
      staticKeyRef.current = { depots: null, hospitals: null };
      zonesKeyRef.current = null;
      if (map) map.remove();
      layersRef.current = {};
    };
  }, [syncAll]);

  useEffect(() => {
    if (layersRef.current.map) syncAll();
  }, [syncAll, fleet, district, hospitals, bloodSources]);

  useEffect(() => {
    if (layersRef.current.map) applyVisibility(layersRef.current, visible);
  }, [visible, applyVisibility]);

  const toggle = (id) => setVisible((v) => ({ ...v, [id]: !v[id] }));

  // ------------------------------------------------------------------- ui --

  return (
    <div className="panel map-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Delhi region — live unit position</h2>
          <p className="panel-sub">
            {label} · {fleet.length} units on one shared state · OSM base + risk overlay
          </p>
        </div>
        <div className="map-coord-tag">
          {activeCount} in transit · 28.6°N 77.2°E
        </div>
      </div>

      <div className={`map-container`}>
        <div ref={containerRef} className="map-leaflet" />
        <div className="layer-panel">
          <p className="layer-panel-title">Layers</p>
          {LAYERS.map((ly) => (
            <label key={ly.id} className="layer-row">
              <input
                type="checkbox"
                checked={visible[ly.id]}
                onChange={() => toggle(ly.id)}
              />
              <span className={`layer-dot is-${ly.id}`} />
              <span className="layer-label">{ly.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="map-foot">
        <span className="map-legend-dot map-legend-depot" /> Blood depot
        <span className="map-legend-dot map-legend-dest" /> Hospital
        <span className="map-legend-dot map-legend-amb" /> MHC
        <span className="leg-zone"><span className="sw sw-green" /> adequate</span>
        <span className="leg-zone"><span className="sw sw-amber" /> watch</span>
        <span className="leg-zone"><span className="sw sw-red" /> critical</span>
      </div>
    </div>
  );
}