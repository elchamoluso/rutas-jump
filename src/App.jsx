// App — Provider + layout (nota de la bóveda / sidebar / topbar / flags / main), búsqueda
// global y conmutación de vistas. ToastContainer montado una vez para el feedback de copiar.
//
// La navegación es POR CLI: cada entrada de la barra lateral enseña el MISMO árbol de
// carpetas, pero el botón de copiar de cada fila saca el comando montado para esa CLI, con
// los modificadores de la banda superior y el `llave unlock` delante si hace falta.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Provider, defaultTheme, Grid, View, SearchField, ToastContainer } from '@adobe/react-spectrum';
import Sidebar from './components/Sidebar';
import RutasView from './components/RutasView';
import ComandosView from './components/ComandosView';
import SearchResults from './components/SearchResults';
import FlagsBar from './components/FlagsBar';
import VaultBanner from './components/VaultBanner';
import { useSystemColorScheme, injectAccentOverride } from './theme';
import { LauncherProvider, useVault, cargarPrefs, guardarPrefs } from './launcher';
import { buildCommand } from './data';

export default function App({ data }) {
  const system = useSystemColorScheme();
  const [override, setOverride] = useState(null); // null = seguir al sistema
  const scheme = override || system;

  const clis = useMemo(() => (data.launchers && data.launchers.clis) || [], [data]);
  // Sin launchers.json (o en una instalación ajena) la vista de rutas de siempre sigue ahí.
  const [view, setView] = useState(() => (clis.length ? 'cli:' + clis[0].id : 'rutas'));
  const [prefs, setPrefs] = useState(() => cargarPrefs(clis));
  const vault = useVault();
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => { injectAccentOverride(); }, []);
  useEffect(() => { guardarPrefs(prefs, clis); }, [prefs, clis]);

  // Atajo "/" enfoca la búsqueda; Escape la limpia (port del dashboard vanilla).
  useEffect(() => {
    const onKey = (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
      } else if (e.key === 'Escape' && query) {
        setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [query]);

  const cli = view.startsWith('cli:') ? (clis.find((c) => c.id === view.slice(4)) || null) : null;
  const pref = (cli && prefs[cli.id]) || { modo: '', toggles: [] };

  // El ámbito de la bóveda es de la MÁQUINA, no de cada CLI (RUTAS_LLAVE_AMBITO en
  // rutas.config.sh). Vacío = este entorno no cifra credenciales: ni nota ni prefijo.
  const ambito = data.llaveAmbito || '';

  const launcher = useMemo(
    () => ({
      cli,
      comando: (abs) => buildCommand({ cli, modo: pref.modo, toggles: pref.toggles, abs, vault, ambito }),
    }),
    [cli, pref.modo, pref.toggles, vault, ambito]
  );

  const brand = data.brand || {};
  const searching = query.trim().length > 0;

  return (
    <Provider theme={defaultTheme} colorScheme={scheme} UNSAFE_className="rutas-root" height="100vh">
      <LauncherProvider value={launcher}>
        <Grid
          areas={['vault vault', 'sidebar topbar', 'sidebar flags', 'sidebar main']}
          columns={['size-3000', '1fr']}
          rows={['auto', 'size-700', 'auto', '1fr']}
          height="100vh"
          UNSAFE_style={{ maxHeight: '100vh' }}
        >
          {/* Filas `auto`: colapsan solas a 0 cuando no hay nada que pintar. */}
          <View gridArea="vault">
            <VaultBanner vault={vault} ambito={ambito} />
          </View>

          <View gridArea="sidebar" minHeight="size-0">
            <Sidebar
              brand={brand}
              stats={data.stats || {}}
              clis={clis}
              view={view}
              onViewChange={setView}
              scheme={scheme}
              onToggleScheme={() => setOverride(scheme === 'dark' ? 'light' : 'dark')}
              generatedAt={data.generatedAtHuman || ''}
            />
          </View>

          <View gridArea="topbar" padding="size-200" paddingBottom="size-100">
            <SearchField
              ref={searchRef}
              aria-label="Buscar rutas y comandos"
              width="100%"
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              placeholder="Buscar…  ( / para enfocar )"
            />
          </View>

          {/* Fuera de `main` a propósito: `main` es el único contenedor con scroll, y ahí
              dentro los modificadores desaparecerían al bajar dos pantallas. */}
          <View gridArea="flags">
            <FlagsBar
              cli={cli}
              modo={pref.modo}
              toggles={pref.toggles}
              onModo={(m) => setPrefs((p) => ({ ...p, [cli.id]: { ...p[cli.id], modo: m } }))}
              onToggles={(t) => setPrefs((p) => ({ ...p, [cli.id]: { ...p[cli.id], toggles: t } }))}
            />
          </View>

          <View gridArea="main" minHeight="size-0" UNSAFE_style={{ overflow: 'auto' }} padding="size-200" paddingTop="size-100">
            {searching ? (
              <SearchResults data={data} query={query.trim()} view={view} />
            ) : view === 'comandos' ? (
              <ComandosView data={data} />
            ) : (
              <RutasView data={data} />
            )}
          </View>
        </Grid>
      </LauncherProvider>
      <ToastContainer />
    </Provider>
  );
}
