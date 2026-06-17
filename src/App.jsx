// App — Provider + layout (sidebar / topbar / main), búsqueda global y conmutación
// de vistas. ToastContainer montado una vez para el feedback de copiar.
import { useEffect, useRef, useState } from 'react';
import { Provider, defaultTheme, Grid, View, SearchField, ToastContainer } from '@adobe/react-spectrum';
import Sidebar from './components/Sidebar';
import RutasView from './components/RutasView';
import ComandosView from './components/ComandosView';
import SearchResults from './components/SearchResults';
import { useSystemColorScheme, injectAccentOverride } from './theme';

export default function App({ data }) {
  const system = useSystemColorScheme();
  const [override, setOverride] = useState(null); // null = seguir al sistema
  const scheme = override || system;
  const [view, setView] = useState('rutas');
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => { injectAccentOverride(); }, []);

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

  const brand = data.brand || {};
  const searching = query.trim().length > 0;

  return (
    <Provider theme={defaultTheme} colorScheme={scheme} UNSAFE_className="rutas-root" height="100vh">
      <Grid
        areas={['sidebar topbar', 'sidebar main']}
        columns={['size-3000', '1fr']}
        rows={['size-700', '1fr']}
        height="100vh"
        UNSAFE_style={{ maxHeight: '100vh' }}
      >
        <View gridArea="sidebar" minHeight="size-0">
          <Sidebar
            brand={brand}
            stats={data.stats || {}}
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

        <View gridArea="main" minHeight="size-0" UNSAFE_style={{ overflow: 'auto' }} padding="size-200" paddingTop="size-100">
          {searching ? (
            <SearchResults data={data} query={query.trim()} view={view} />
          ) : view === 'rutas' ? (
            <RutasView data={data} />
          ) : (
            <ComandosView data={data} />
          )}
        </View>
      </Grid>
      <ToastContainer />
    </Provider>
  );
}
