// theme.js — color scheme (light/dark) + override del accent de Spectrum con el
// RUTAS_ACCENT del usuario (ya puesto en :root como --rutas-accent por el template).
import { useEffect, useState } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

export function useSystemColorScheme() {
  const [scheme, setScheme] = useState(() =>
    typeof matchMedia === 'function' && matchMedia(QUERY).matches ? 'dark' : 'light'
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(QUERY);
    const handler = (e) => setScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return scheme;
}

// Inyecta una vez el override del accent. Mapea las variables de Spectrum a
// --rutas-accent; va sobre la clase del Provider (rutas-root) para ganar en orden.
let injected = false;
export function injectAccentOverride() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const css = `
  .rutas-root {
    --spectrum-accent-background-color-default: var(--rutas-accent, #0070f3);
    --spectrum-accent-background-color-hover: color-mix(in srgb, var(--rutas-accent, #0070f3) 86%, #000);
    --spectrum-accent-background-color-down: color-mix(in srgb, var(--rutas-accent, #0070f3) 78%, #000);
    --spectrum-accent-background-color-key-focus: color-mix(in srgb, var(--rutas-accent, #0070f3) 86%, #000);
    --spectrum-accent-content-color-default: var(--rutas-accent, #0070f3);
    --spectrum-accent-content-color-hover: var(--rutas-accent, #0070f3);
    --spectrum-accent-color-900: var(--rutas-accent, #0070f3);
    --spectrum-accent-color-1000: var(--rutas-accent, #0070f3);
  }`;
  const s = document.createElement('style');
  s.setAttribute('data-rutas-accent', '');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
}
