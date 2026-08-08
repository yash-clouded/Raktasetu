// Single source of truth for where the realtime backend lives.
// Both screens dial this one constant — change it here, never in components.
export const SERVER_URL = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:4000';

// Ambient labels drawn on the tracking maps (all purely cosmetic).
export const MAP_LABEL_URBAN = 'NCB-06';