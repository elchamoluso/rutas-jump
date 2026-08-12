// FlagsBar — la banda de arranque de la CLI activa: modos (excluyentes) y toggles
// (acumulativos). Se usa ActionGroup y no RadioGroup/ToggleButton porque su CSS ya viaja en
// el bundle commiteado; las otras familias lo engordarían sin ganar nada.
import { Flex, View, Text, ActionGroup, Item } from '@adobe/react-spectrum';

const ETIQUETA = { fontSize: '11px', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.04em' };

export default function FlagsBar({ cli, modo, toggles, onModo, onToggles }) {
  if (!cli) return null;
  const modos = cli.modos || [];
  const extras = cli.toggles || [];

  // Una sola línea de ayuda con lo que está activo ahora mismo. Importa sobre todo cuando hay
  // un toggle `warn` puesto: ahí la frase explica qué comprobación se está desactivando.
  const activos = []
    .concat(modos.filter((m) => m.id === modo && m.desc).map((m) => m.desc))
    .concat(extras.filter((t) => toggles.includes(t.id) && t.desc).map((t) => (t.warn ? '⚠ ' : '') + t.desc));

  return (
    <View paddingX="size-200" paddingBottom="size-100">
      <Flex direction="row" gap="size-200" alignItems="center" wrap UNSAFE_style={{ rowGap: 8 }}>
        <Text UNSAFE_style={ETIQUETA}>Arranque</Text>
        <ActionGroup
          density="compact"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[modo]}
          onSelectionChange={(keys) => { const k = [...keys][0]; if (k) onModo(k); }}
        >
          {modos.map((m) => <Item key={m.id}>{m.label}</Item>)}
        </ActionGroup>

        {extras.length ? (
          <>
            <Text UNSAFE_style={ETIQUETA}>Extras</Text>
            <ActionGroup
              density="compact"
              selectionMode="multiple"
              selectedKeys={toggles}
              onSelectionChange={(keys) => onToggles([...keys])}
            >
              {extras.map((t) => <Item key={t.id}>{(t.warn ? '⚠ ' : '') + t.label}</Item>)}
            </ActionGroup>
          </>
        ) : null}
      </Flex>

      {activos.length ? (
        <Text UNSAFE_style={{ fontSize: '11.5px', opacity: 0.7, display: 'block', marginTop: 8 }}>
          {activos.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}
