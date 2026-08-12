// launcher.js — estado de la CLI activa (modo + toggles) y sonda de la bóveda.
//
// El estado llega a RouteActions por CONTEXTO, no por props: ese componente se instancia
// desde dos árboles distintos (RutasView, dentro de una renderNode recursiva de nivel de
// módulo, y Rows/SearchResults), así que pasarlo por props obligaría a cambiar la firma de
// renderNode y a atravesar componentes intermedios que no usan el dato.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const LauncherContext = createContext({ cli: null, comando: () => '' });
export const LauncherProvider = LauncherContext.Provider;
export function useLauncher() { return useContext(LauncherContext); }

const LS_KEY = 'rutas-jump:lanzadores';

function esWarn(cli, id) {
  return (cli.toggles || []).some((t) => t.id === id && t.warn);
}

// Los toggles marcados `warn` NO se leen de disco: arrancan SIEMPRE en su `default`. Con
// `default: true` (el caso de --dangerously-skip-permissions y el bypass de codex) eso significa
// que el comando copiado los lleva siempre, y desmarcarlos vale solo para esta sesión.
// Los demás toggles sí se recuerdan; su `default` solo aplica la primera vez, cuando no hay nada
// guardado para esa CLI.
export function cargarPrefs(clis) {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) {}
  const out = {};
  for (const cli of clis) {
    const p = raw[cli.id];
    const modos = (cli.modos || []).map((m) => m.id);
    const ids = (cli.toggles || []).map((t) => t.id);
    const warnPorDefecto = (cli.toggles || []).filter((t) => t.warn && t.default).map((t) => t.id);
    const resto = p
      ? (p.toggles || []).filter((id) => ids.includes(id) && !esWarn(cli, id))
      : (cli.toggles || []).filter((t) => !t.warn && t.default).map((t) => t.id);
    out[cli.id] = {
      modo: modos.includes(p && p.modo) ? p.modo : (modos[0] || ''),
      toggles: warnPorDefecto.concat(resto),
    };
  }
  return out;
}

export function guardarPrefs(prefs, clis) {
  const out = {};
  for (const cli of clis) {
    const p = prefs[cli.id];
    if (!p) continue;
    out[cli.id] = { modo: p.modo, toggles: (p.toggles || []).filter((id) => !esWarn(cli, id)) };
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(out)); } catch (e) {}
}

// Estado de la bóveda. Se refresca al montar y al recuperar el foco de la ventana: el PIN se
// teclea en TU terminal, o sea que para desbloquear hay que salir de aquí, y al volver siempre
// hay un evento focus. Sin setInterval: /mnt/chromeos va por 9p y no merece un bucle.
export function useVault() {
  const [vault, setVault] = useState(null);

  const refresh = useCallback(() => {
    fetch('api/llave', { headers: { Accept: 'application/json' } })
      .then((r) => {
        // Un servidor viejo (o un file://) responde 200 con el HTML del dashboard por el
        // catch-all: sin esta comprobación, JSON.parse se comería 1,2 MB antes de fallar.
        if (!r.ok) throw new Error('http ' + r.status);
        if (!(r.headers.get('content-type') || '').includes('application/json')) {
          throw new Error('respuesta no-JSON');
        }
        return r.json();
      })
      .then(setVault)
      .catch(() => setVault((prev) => (prev && prev.instalada
        ? { ...prev, error: true, ambitos: (prev.ambitos || []).map((a) => ({ ...a, estado: 'desconocido' })) }
        : { instalada: false, pendrive: false, ambitos: [], error: true })));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  return vault;
}
