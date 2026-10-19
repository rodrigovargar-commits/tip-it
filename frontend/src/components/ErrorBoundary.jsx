import { Component } from 'react';

// A page that fails to load must never be a blank screen. The most common cause
// is a new version going live while someone still has the old one open (the old
// page asks for a file that no longer exists): reloading once fixes it, so that
// happens by itself. Anything else shows a message and a button.
const STALE_FILE = /dynamically imported module|Loading chunk|ChunkLoadError|Importing a module script failed|error loading dynamically/i;
const FLAG = 'tipit_reloaded_for_update';

export function reloadOnceForUpdate() {
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, '1');
  } catch {
    // storage blocked: still try once
  }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (STALE_FILE.test(String(error?.message || error))) reloadOnceForUpdate();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FFF8EC', color: '#0A2F2F', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 26, margin: '0 0 12px' }}>Algo no cargó bien</h1>
          <p style={{ fontSize: 16, margin: '0 0 20px' }}>Pasa a veces cuando hay una versión nueva. Vuelve a cargar la página.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: '#0A2F2F', color: '#FFF8EC', border: 0, borderRadius: 999, padding: '14px 28px', fontSize: 17, fontWeight: 700 }}
          >
            Volver a cargar
          </button>
        </div>
      </div>
    );
  }
}
