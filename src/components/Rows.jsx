// Rows — filas planas reutilizables (resultados de búsqueda y paneles de comandos).
import { Flex, Text, ActionButton } from '@adobe/react-spectrum';
import Copy from '@spectrum-icons/workflow/Copy';
import Folder from '@spectrum-icons/workflow/Folder';
import { copyText } from '../clipboard';
import RouteActions from './RouteActions';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export function FolderRow({ row }) {
  return (
    <Flex alignItems="center" gap="size-150" UNSAFE_style={{ padding: '6px 4px' }}>
      <Folder aria-label="carpeta" size="S" />
      <Flex direction="column" gap="size-25" flex minWidth="size-0">
        <Text>{row.name}</Text>
        <Text UNSAFE_style={{ fontSize: '12px', opacity: 0.7 }}>{row.section} · {row.rel}</Text>
      </Flex>
      <RouteActions abs={row.abs} aliases={row.aliases} />
    </Flex>
  );
}

export function CommandRow({ c }) {
  return (
    <Flex alignItems="center" gap="size-150" UNSAFE_style={{ padding: '6px 4px' }}>
      <Flex direction="column" gap="size-25" flex minWidth="size-0">
        <Text UNSAFE_style={{ fontFamily: MONO, fontSize: '12.5px' }}>{c.cmd}</Text>
        {c.desc ? <Text UNSAFE_style={{ fontSize: '12px', opacity: 0.7 }}>{c.desc}</Text> : null}
      </Flex>
      <ActionButton isQuiet onPress={() => copyText(c.cmd)} aria-label="Copiar comando">
        <Copy />
      </ActionButton>
    </Flex>
  );
}
