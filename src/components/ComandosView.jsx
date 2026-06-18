// ComandosView — categorías de comandos como acordeón Spectrum.
import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel, Flex, Text, Badge, Link } from '@adobe/react-spectrum';
import { CommandRow } from './Rows';

export default function ComandosView({ data }) {
  const cats = (data.commands && data.commands.categories) || [];
  if (!cats.length) return <Text>Sin comandos.</Text>;

  return (
    <Accordion defaultExpandedKeys={['cat0']} allowsMultipleExpanded>
      {cats.map((cat, i) => (
        <Disclosure id={'cat' + i} key={i}>
          <DisclosureTitle>
            <Flex alignItems="center" gap="size-100" flex>
              <Text>{(cat.icon ? cat.icon + ' ' : '') + cat.name}</Text>
              <Badge variant="neutral">{(cat.commands || []).length}</Badge>
            </Flex>
          </DisclosureTitle>
          <DisclosurePanel>
            {cat.source ? (
              <Link>
                <a href={cat.source} target="_blank" rel="noopener noreferrer">📖 Documentación oficial</a>
              </Link>
            ) : null}
            <Flex direction="column" gap="size-100">
              {(cat.commands || []).map((c, j) => (
                <CommandRow key={j} c={c} />
              ))}
            </Flex>
          </DisclosurePanel>
        </Disclosure>
      ))}
    </Accordion>
  );
}
