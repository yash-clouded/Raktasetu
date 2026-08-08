import { Cross, Ambulance, ServerRack, ScrollIcon } from './icons';

const NAV = [
  { id: 'os', label: 'Operating System', sub: 'Network overview', icon: ServerRack },
  { id: 'mhc', label: 'Mobile Health Centre', sub: 'MHC fleet · live', icon: Ambulance },
  { id: 'transcripts', label: 'Transcripts', sub: 'Delivery transparency', icon: ScrollIcon },
];

export default function Sidebar({ view, onNavigate, signedIn, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-glyph">
          <Cross />
        </span>
        <div className="brand-text">
          <strong>RaktaSetu</strong>
          <span>bloodnet · cmd centre</span>
        </div>
      </div>

      <nav className="nav">
        <p className="nav-kicker">Consoles</p>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon />
            <span className="nav-item-text">
              <span className="nav-item-label">{item.label}</span>
              <span className="nav-item-sub">{item.sub}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        {signedIn ? (
          <button className="nav-item logout-btn" onClick={onLogout}>
            <span className="nav-item-text">
              <span className="nav-item-label">Log out</span>
              <span className="nav-item-sub">end session</span>
            </span>
          </button>
        ) : (
          <>
            <span className="brand-mark">
              <Cross />
            </span>
            <p className="mini-note">demo build · all data simulated</p>
          </>
        )}
      </div>
    </aside>
  );
}