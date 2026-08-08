// Inline-SVG district risk heatmap ("Delhi zone ledger"). Each district zone
// is a labelled cell tinted by stockLevel/riskColor (green / amber / red) —
// a bounded grid, no tile provider. Read-only render of server broadcast data.

const CELLS = [
  { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 },
  { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 },
];

const W = 640;
const H = 232;
const PAD = 12;
const GAP = 8;
const COLS = 3;
const CW = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CH = (H - PAD * 2 - GAP) / 2;

export default function DistrictHeatmap({ districts = [] }) {
  return (
    <div className="panel heatmap-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">District risk — on-hand stock · Delhi</h2>
          <p className="panel-sub">units per group per zone · re-broadcast on every server tick</p>
        </div>
        <div className="legend">
          <span className="legend-item"><span className="sw sw-green" />Adequate</span>
          <span className="legend-item"><span className="sw sw-amber" />Watch</span>
          <span className="legend-item"><span className="sw sw-red" />Critical</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="heatmap" role="img" aria-label="Delhi district risk heatmap">
        {districts.slice(0, 6).map((d, i) => {
          const cell = CELLS[i] || { c: i % COLS, r: i % 2 };
          return (
            <g key={d.district} transform={`translate(${PAD + cell.c * (CW + GAP)},${PAD + cell.r * (CH + GAP)})`} className="district-cell">
              <rect className={`cell-fill risk-${d.riskColor}`} width={CW} height={CH} rx="3" />
              <rect className="cell-rule" width={CW} height={CH} rx="3" />
              <text x={14} y={26} className="cell-name">{d.district}</text>
              <text x={14} y={48} className="cell-value">{d.bloodGroup}</text>
              <text x={CW - 14} y={26} textAnchor="end" className="cell-stock">{d.stockLevel}{'\u00A0'}<tspan className="cell-stock-unit">units</tspan></text>
              <GaugeBar cx={14} cy={CH - 26} w={CW - 28} stock={d.stockLevel} risk={d.riskColor} />
            </g>
          );
        })}
      </svg>

      <footer className="heatmap-foot">
        {districts.map((d) => (
          <span key={d.district} className="heat-chip">
            <span className={`chip-dot risk-${d.riskColor}`} />
            {d.district}
          </span>
        ))}
      </footer>
    </div>
  );
}

function GaugeBar({ cx, cy, w, stock, risk }) {
  const pct = Math.max(4, Math.min(100, (stock / 310) * 100));
  return (
    <g transform={`translate(${cx},${cy})`}>
      <rect className="gauge-track" width={w} height="5" rx="2.5" />
      <rect className={`gauge-fill is-${risk}`} width={(w * pct) / 100} height="5" rx="2.5" />
    </g>
  );
}