// Sidebar — marca, navegación de vistas, botón «Actualizar», toggle de tema y footer de stats.
import { useState } from 'react';
import { Flex, View, Heading, Text, ActionGroup, Item, Divider, ActionButton, TooltipTrigger, Tooltip, ToastQueue } from '@adobe/react-spectrum';
import Moon from '@spectrum-icons/workflow/Moon';
import Light from '@spectrum-icons/workflow/Light';
import Refresh from '@spectrum-icons/workflow/Refresh';

// «Actualizar»: el servidor vuelve a escanear las carpetas y regenera los alias cd-*
// (regenerate-rutas.sh, ~2 s); después se recarga la página. Recargar a secas solo rehace las
// carpetas. Abierto como file:// no hay servidor al que llamar, así que el botón no sale.
function BotonActualizar() {
  const [actualizando, setActualizando] = useState(false);
  if (!/^https?:$/.test(window.location.protocol)) return null;

  const actualizar = () => {
    setActualizando(true);
    // Sin la cabecera X-Rutas el servidor rechaza la petición (cierra el CSRF; ver serve-dashboard.js).
    fetch('api/regenerate', { method: 'POST', headers: { 'X-Rutas': '1' } })
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.ok) throw new Error('regeneración fallida');
        window.location.reload();
      })
      .catch(() => {
        setActualizando(false);
        ToastQueue.negative('No se pudo actualizar', { timeout: 2500 });
      });
  };

  return (
    <TooltipTrigger delay={300}>
      <ActionButton isQuiet onPress={actualizar} isDisabled={actualizando} aria-label="Actualizar carpetas y alias">
        <Refresh />
        <Text>{actualizando ? 'Actualizando…' : 'Actualizar'}</Text>
      </ActionButton>
      <Tooltip>Vuelve a escanear las carpetas y regenera los alias cd-*</Tooltip>
    </TooltipTrigger>
  );
}

export default function Sidebar({ brand, stats, clis, view, onViewChange, scheme, onToggleScheme, generatedAt }) {
  return (
    <View
      backgroundColor="gray-75"
      padding="size-200"
      height="100%"
      UNSAFE_style={{ borderRight: '1px solid var(--spectrum-gray-300, rgba(128,128,128,.25))', boxSizing: 'border-box' }}
    >
      <Flex direction="column" gap="size-200" height="100%">
        <Flex alignItems="center" gap="size-100">
          <Text UNSAFE_style={{ fontSize: '22px', lineHeight: 1 }}>{brand.emoji || '🗂️'}</Text>
          <Heading level={2} margin="size-0">{brand.title || 'Rutas'}</Heading>
        </Flex>

        <ActionGroup
          orientation="vertical"
          density="compact"
          isQuiet
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[view]}
          onSelectionChange={(keys) => {
            const k = [...keys][0];
            if (k) onViewChange(k);
          }}
        >
          {/* Una entrada por CLI: el mismo árbol de carpetas, pero lo que copias sale ya
              montado para ella. Sin <Divider> aquí dentro: ActionGroup es una colección de
              Spectrum y solo admite <Item>. */}
          {(clis || []).length
            ? clis.map((c) => <Item key={'cli:' + c.id}>{(c.icon ? c.icon + ' ' : '') + c.name}</Item>)
            : <Item key="rutas">📁 Rutas</Item>}
          <Item key="comandos">⌨ Comandos</Item>
        </ActionGroup>

        <Flex flex />

        <Divider size="S" />
        <Flex direction="column" gap="size-100">
          <BotonActualizar />
          <TooltipTrigger delay={300}>
            <ActionButton isQuiet onPress={onToggleScheme} aria-label="Cambiar tema claro/oscuro">
              {scheme === 'dark' ? <Light /> : <Moon />}
              <Text>{scheme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</Text>
            </ActionButton>
            <Tooltip>Cambiar entre claro y oscuro</Tooltip>
          </TooltipTrigger>
          <Text UNSAFE_style={{ fontSize: '11px', opacity: 0.65 }}>
            {stats.folderCount ?? 0} carpetas · {stats.sectionCount ?? 0} raíces · {stats.commandCount ?? 0} comandos
          </Text>
          {generatedAt ? (
            <Text UNSAFE_style={{ fontSize: '11px', opacity: 0.5 }}>act. {generatedAt}</Text>
          ) : null}
        </Flex>
      </Flex>
    </View>
  );
}
