// SearchResults — resultados planos filtrados (port de runSearch). Cap a 500.
import { Flex, Text, IllustratedMessage, Heading, Content } from '@adobe/react-spectrum';
import { filterFolders, filterCommands, SEARCH_CAP } from '../data';
import { FolderRow, CommandRow } from './Rows';

export default function SearchResults({ data, query, view }) {
  const isCmd = view === 'comandos';
  const { rows, capped } = isCmd ? filterCommands(data, query) : filterFolders(data, query);

  if (!rows.length) {
    return (
      <IllustratedMessage>
        <Heading>Sin resultados</Heading>
        <Content>Nada coincide con «{query}» en {isCmd ? 'comandos' : 'rutas'}.</Content>
      </IllustratedMessage>
    );
  }

  return (
    <Flex direction="column" gap="size-50">
      <Text UNSAFE_style={{ fontSize: '12px', opacity: 0.7, marginBottom: 4 }}>
        {rows.length}{capped ? '+' : ''} resultado{rows.length === 1 ? '' : 's'} en {isCmd ? 'comandos' : 'rutas'}
        {capped ? ` (tope ${SEARCH_CAP}, afina la búsqueda)` : ''}
      </Text>
      {rows.map((r) => (isCmd ? <CommandRow key={r.id} c={r} /> : <FolderRow key={r.id} row={r} />))}
    </Flex>
  );
}
