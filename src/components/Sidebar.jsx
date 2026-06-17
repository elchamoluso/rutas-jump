// Sidebar — marca, navegación de vistas, toggle de tema y footer de stats.
import { Flex, View, Heading, Text, ActionGroup, Item, Divider, ActionButton, TooltipTrigger, Tooltip } from '@adobe/react-spectrum';
import Moon from '@spectrum-icons/workflow/Moon';
import Light from '@spectrum-icons/workflow/Light';

export default function Sidebar({ brand, stats, view, onViewChange, scheme, onToggleScheme, generatedAt }) {
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
          <Item key="rutas">📁 Rutas</Item>
          <Item key="comandos">⌨ Comandos</Item>
        </ActionGroup>

        <Flex flex />

        <Divider size="S" />
        <Flex direction="column" gap="size-100">
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
