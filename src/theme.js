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
  }

  /* Altura de fila del árbol: Spectrum fija cada fila del TreeView a 40px, lo que
     APRETABA el nombre + sus botones (y, al darles aire, se solapaban). El árbol se
     renderiza estático (sin virtualización: filas en flujo normal, position:relative),
     así que dejar la fila crecer a su contenido es seguro y empuja a las siguientes.
     Acotado al treegrid para no tocar las filas planas (búsqueda/comandos). */
  .rutas-root [role="treegrid"] [role="row"] {
    height: auto !important;
    min-height: var(--spectrum-global-dimension-size-500, 40px);
  }

  /* Botones de copiado: "chips" con el color de acento para que se noten y se lean
     como clicables-para-copiar. !important para ganar al CSS de Spectrum; el color
     tiñe también el texto del alias y el icono Copy (SVG con fill currentColor). */
  .rutas-copybtn {
    --copy-accent: var(--rutas-accent, #0070f3);
    border: 1px solid color-mix(in srgb, var(--copy-accent) 45%, transparent) !important;
    background: color-mix(in srgb, var(--copy-accent) 12%, transparent) !important;
    border-radius: 7px !important;
    color: var(--copy-accent) !important;
    font-weight: 500;
    transition: background 120ms ease, border-color 120ms ease;
  }
  .rutas-copybtn * { color: var(--copy-accent) !important; fill: var(--copy-accent) !important; }
  .rutas-copybtn:hover {
    background: color-mix(in srgb, var(--copy-accent) 22%, transparent) !important;
    border-color: color-mix(in srgb, var(--copy-accent) 65%, transparent) !important;
  }
  .rutas-copybtn:active {
    background: color-mix(in srgb, var(--copy-accent) 32%, transparent) !important;
  }`;
  const s = document.createElement('style');
  s.setAttribute('data-rutas-accent', '');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
}
