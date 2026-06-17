// Rows — filas planas reutilizables (resultados de búsqueda y paneles de comandos).
import { Flex, View, Text, ActionButton, TooltipTrigger, Tooltip } from '@adobe/react-spectrum';
import Copy from '@spectrum-icons/workflow/Copy';
import Folder from '@spectrum-icons/workflow/Folder';
import { copyText } from '../clipboard';
import RouteActions from './RouteActions';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// Resultado de búsqueda de carpeta: nombre + meta y, JUSTO DEBAJO, sus botones de copiado
// (igual que en el árbol, para que se lean como un mismo bloque).
export function FolderRow({ row }) {
  return (
    <Flex alignItems="start" gap="size-150" UNSAFE_style={{ padding: '6px 4px' }}>
      <Folder aria-label="carpeta" size="S" />
      <Flex direction="column" gap="size-50" flex minWidth="size-0">
        <Text>{row.name}</Text>
        <Text UNSAFE_style={{ fontSize: '12px', opacity: 0.7 }}>{row.section} · {row.rel}</Text>
        <View UNSAFE_style={{ paddingInlineStart: 2 }}>
          <RouteActions abs={row.abs} aliases={row.aliases} />
        </View>
      </Flex>
    </Flex>
  );
}

// Comando: botón de copiar a la IZQUIERDA, pegado al texto del comando, para que sea
// obvio qué se copia al clicar.
export function CommandRow({ c }) {
  return (
    <Flex alignItems="start" gap="size-100" UNSAFE_style={{ padding: '6px 4px' }}>
      <TooltipTrigger delay={400}>
        <ActionButton
          isQuiet
          UNSAFE_className="rutas-copybtn"
          onPress={() => copyText(c.cmd)}
          aria-label={'Copiar comando: ' + c.cmd}
          UNSAFE_style={{ minWidth: 0, height: 24, paddingInline: 7, flexShrink: 0 }}
        >
          <Copy />
        </ActionButton>
        <Tooltip>Copiar «{c.cmd}»</Tooltip>
      </TooltipTrigger>
      <Flex direction="column" gap="size-25" flex minWidth="size-0">
        <Text UNSAFE_style={{ fontFamily: MONO, fontSize: '12.5px', lineHeight: '22px' }}>{c.cmd}</Text>
        {c.desc ? <Text UNSAFE_style={{ fontSize: '12px', opacity: 0.7 }}>{c.desc}</Text> : null}
      </Flex>
    </Flex>
  );
}
