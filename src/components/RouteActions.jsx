// RouteActions — clúster de acciones reutilizable (filas de árbol, favoritos, búsqueda).
// ActionGroup para que Spectrum lo posicione bien y colapse en menú si no cabe.
import { ActionGroup, Item } from '@adobe/react-spectrum';
import { copyText } from '../clipboard';

export default function RouteActions({ abs, aliases = [] }) {
  const items = [];
  aliases.forEach((a) => items.push({ key: 'alias:' + a, label: a }));
  items.push({ key: 'path', label: 'Copiar ruta' });
  items.push({ key: 'cd', label: 'cd' });

  const onAction = (key) => {
    const k = String(key);
    if (k === 'path') copyText(abs);
    else if (k === 'cd') copyText('cd "' + abs + '"');
    else if (k.startsWith('alias:')) copyText(k.slice(6));
  };

  return (
    <ActionGroup
      isQuiet
      density="compact"
      overflowMode="collapse"
      onAction={onAction}
      aria-label="Acciones de la ruta"
      buttonLabelBehavior="show"
    >
      {items.map((it) => (
        <Item key={it.key}>{it.label}</Item>
      ))}
    </ActionGroup>
  );
}
