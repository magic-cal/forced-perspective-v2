/**
 * Debug configuration
 * Set DEBUG to true to enable debug mode, false to disable
 */
export const DEBUG = true;

/**
 * Debug logger - only logs when DEBUG is true
 * More performant than console.log because it short-circuits when disabled
 */
export const debug = {
  log: DEBUG ? console.log.bind(console, '[DEBUG]') : () => {},
  warn: DEBUG ? console.warn.bind(console, '[DEBUG]') : () => {},
  error: DEBUG ? console.error.bind(console, '[DEBUG]') : () => {},
  
  // Specialized loggers for different subsystems
  socket: DEBUG ? console.log.bind(console, '[SOCKET]') : () => {},
  camera: DEBUG ? console.log.bind(console, '[CAMERA]') : () => {},
  trick: DEBUG ? console.log.bind(console, '[TRICK]') : () => {},
  store: DEBUG ? console.log.bind(console, '[STORE]') : () => {},
};

/**
 * Performance monitoring - only active when DEBUG is true
 */
export const perf = {
  start: (label: string) => {
    if (DEBUG) performance.mark(`${label}-start`);
  },
  end: (label: string) => {
    if (DEBUG) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label)[0];
      console.log(`[PERF] ${label}: ${measure.duration.toFixed(2)}ms`);
    }
  },
};

/**
 * UI toggle for debug panels/buttons. Hidden by default.
 * Enable by setting VITE_DEBUG_UI=1 (or "true") at build/runtime or by
 * adding a URL parameter, e.g. `?debug=1` or `?debug=true`.
 */
export const SHOW_DEBUG_UI = (() => {
  try {
    // Check Vite env flags (available at build time)
    const env = (import.meta as any)?.env || {};
    const envFlag =
      env.VITE_DEBUG_UI === "1" || env.VITE_DEBUG_UI === "true" ||
      env.VITE_SHOW_DEBUG === "1" || env.VITE_SHOW_DEBUG === "true";

    // Allow enabling via URL param at runtime for quick testing
    const urlFlag =
      typeof window !== "undefined" &&
      (() => {
        const params = new URLSearchParams(window.location.search);
        return (
          params.get("debug") === "1" ||
          params.get("debug") === "true" ||
          params.has("debug")
        );
      })();

    return !!(envFlag || urlFlag);
  } catch (e) {
    return false;
  }
})();
