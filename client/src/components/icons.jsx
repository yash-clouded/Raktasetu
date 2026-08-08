// Consistent custom SVG icon set — 24x24 stroke-based. No emoji, no CDN glyphs.

const I = ({ children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const Droplet = (p) => (
  <I {...p}>
    <path d="M12 3.5c3 3.5 6 6.2 6 10a6 6 0 1 1-12 0c0-3.8 3-6.5 6-10Z" />
    <path d="M9 14.5a3 3 0 0 0 3 3" />
  </I>
);

export const Cross = (p) => (
  <I {...p}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M12 7v10M7 12h10" />
  </I>
);

export const Ambulance = (p) => (
  <I {...p}>
    <path d="M4 16h-1a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2h9l3 3h4a1 1 0 0 1 1 1v5" />
    <path d="M14 5v5h5" />
    <path d="M4 16v2a1 1 0 0 0 1 1h2M16 19h3a1 1 0 0 0 1-1v-1" />
    <circle cx="7" cy="17" r="1.6" />
    <circle cx="17" cy="17" r="1.6" />
    <path d="M9.5 9.5h3M11 8v3" />
  </I>
);

export const HospitalPin = (p) => (
  <I {...p}>
    <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
    <path d="M12 7.5v5M9.5 10h5" />
  </I>
);

export const MapPin = (p) => (
  <I {...p}>
    <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
    <circle cx="12" cy="11" r="2.2" />
  </I>
);

export const RouteIcon = (p) => (
  <I {...p}>
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="5" r="2.2" />
    <path d="M7.4 16.2C9 13 11 12 13.6 12c2 0 3.2-2 3.8-4.4" />
  </I>
);

export const Timer = (p) => (
  <I {...p}>
    <circle cx="12" cy="14" r="7" />
    <path d="M12 14l3-3" />
    <path d="M9.5 3h5M12 3v4" />
  </I>
);

export const Gauge = (p) => (
  <I {...p}>
    <path d="M4 14a8 8 0 1 1 16 0" />
    <path d="M12 14l4-5" />
    <path d="M3 14h2M19 14h2" />
  </I>
);

export const Thermometer = (p) => (
  <I {...p}>
    <path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a4.5 4.5 0 1 1-6 0Z" />
    <path d="M12 15v2" />
  </I>
);

export const ListIcon = (p) => (
  <I {...p}>
    <path d="M8 7h12M8 12h12M8 17h12" />
    <circle cx="4" cy="7" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="17" r="1" />
  </I>
);

export const AlertIcon = (p) => (
  <I {...p}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4M12 17.5v.1" />
  </I>
);

export const Check = (p) => (
  <I {...p}>
    <path d="M4 12.5 9.5 18 20 6" />
  </I>
);

export const Tower = (p) => (
  <I {...p}>
    <path d="M5 20h14M7 20v-6M12 20v-8M17 20v-6" />
    <path d="M8 14h8l-1.5-3.5a7 7 0 0 0-10.5 0L8 14Z" />
    <path d="M8 9.5c2.5-1.8 5.5-1.8 8 0" />
  </I>
);

export const Fridge = (p) => (
  <I {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M5 10h14M5 15h14" />
    <path d="M10 5v2M10 12v2" />
  </I>
);

export const ArrowRight = (p) => (
  <I {...p}>
    <path d="M4 12h16M13 5l7 7-7 7" />
  </I>
);

export const ChevronRight = (p) => (
  <I {...p}>
    <path d="M9 5l7 7-7 7" />
  </I>
);

export const Building = (p) => (
  <I {...p}>
    <path d="M4 21V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v15M14 9h5a1 1 0 0 1 1 1v11" />
    <path d="M2 21h20" />
    <path d="M7 8v.1M10 8v.1M7 12v.1M10 12v.1" />
  </I>
);

// custom stroke-broken shield used as the app glyph
export const Shield = (p) => (
  <I {...p}>
    <path d="M12 3l7.4 2.8v5.2c0 4.7-3.3 8-7.4 10-4.1-2-7.4-5.3-7.4-10V5.8L12 3Z" />
    <path d="M12 9v4M12 16v.1" />
  </I>
);

export const ServerRack = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="7" rx="1" />
    <rect x="3" y="13" width="18" height="7" rx="1" />
    <path d="M6 6.5h.1M6 15.5h.1M3 9.5h.1M3 18.5h.1" />
  </I>
);

// delivery-transcript / record sheet — used for the "Transcripts" console
export const ScrollIcon = (p) => (
  <I {...p}>
    <rect x="5" y="4" width="14" height="16" rx="1.5" />
    <path d="M9 9h6M9 13h6M9 17h3" />
    <path d="M17 8l2 .6V12a1.4 1.4 0 1 0 0 0" />
  </I>
);

export const DownloadIcon = (p) => (
  <I {...p}>
    <path d="M12 4v10M7.5 10l4.5 4 4.5-4" />
    <path d="M4 18h16" />
  </I>
);

export const LockIcon = (p) => (
  <I {...p}>
    <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15" r="1.3" />
  </I>
);

export const GlobeIcon = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.2 3.8 5 3.8 8.5s-1.3 6.3-3.8 8.5c-2.5-2.2-3.8-5-3.8-8.5s1.3-6.3 3.8-8.5Z" />
  </I>
);

export const Calendar = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </I>
);