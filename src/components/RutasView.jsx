// RutasView — el árbol jerárquico. CADA RAÍZ (My Drive · Unidades Compartidas · Home)
// es un nodo de PRIMER NIVEL con su alias (cd-drive/cd-sd/cd-home) y acciones, que se
// expande a su árbol de carpetas. Favoritos va fijado arriba.
//
// Render ESTÁTICO recursivo (TreeViewItem anidados): es el modo fiable para que Spectrum
// marque las filas como expandibles. ~477 nodos rinden sin problema.
import { useMemo, useState } from 'react';
import { TreeView, TreeViewItem, TreeViewItemContent, Text, Flex, View } from '@adobe/react-spectrum';
import Folder from '@spectrum-icons/workflow/Folder';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import Star from '@spectrum-icons/workflow/Star';
import { buildRutasTree } from '../data';
import RouteActions from './RouteActions';

function iconFor(item) {
  if (item.kind === 'favs') return <Star aria-label="favoritos" />;
  if (item.kind === 'section') return <FolderOpen aria-label="raíz" />;
  return <Folder aria-label="carpeta" />;
}

function renderNode(item) {
  const label = typeof item.count === 'number' ? `${item.name}  ·  ${item.count}` : item.name;
  // Las raíces (My Drive · Unidades Compartidas · Home) se distinguen como cabeceras:
  // texto en negrita y más grande, más aire arriba/abajo, y sin la línea divisoria
  // (no la necesitan porque ya destacan por peso/tamaño).
  const isRoot = item.kind === 'section';
  return (
    <TreeViewItem key={item.id} id={item.id} textValue={item.name}>
      <TreeViewItemContent>
        {/* El icono queda como hijo DIRECTO → Spectrum le da el slot `icon` y lo
            mantiene en su columna, centrado contra el bloque de dos líneas. */}
        {iconFor(item)}
        {/* La fila es un GRID con áreas nombradas (… expand-button icon content actions …).
            Un <Text slot="text"> recibiría la clase treeContent (grid-area:content), pero un
            <Flex slot="text"> NO hereda esa clase y cae a la celda drag-handle (izquierda).
            Por eso fijamos gridArea="content" explícito: la columna va a su sitio (tras el
            icono) y dentro apilamos el nombre y, justo debajo, sus botones de copiado. */}
        <Flex gridArea="content" direction="column" gap="size-100" minWidth="size-0" UNSAFE_style={{ paddingTop: isRoot ? 12 : 8, paddingBottom: isRoot ? 12 : 8 }}>
          <Text
            UNSAFE_style={{
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              fontWeight: isRoot ? 700 : 400,
              fontSize: isRoot ? '15px' : undefined,
            }}
          >
            {label}
          </Text>
          {item.abs ? (
            <View UNSAFE_style={{ paddingInlineStart: 2, paddingTop: 6, borderTop: isRoot ? 'none' : '1px solid var(--spectrum-gray-200, rgba(128,128,128,0.18))' }}>
              <RouteActions abs={item.abs} aliases={item.aliases} />
            </View>
          ) : null}
        </Flex>
      </TreeViewItemContent>
      {(item.children || []).map((child) => renderNode(child))}
    </TreeViewItem>
  );
}

export default function RutasView({ data }) {
  const items = useMemo(() => buildRutasTree(data), [data]);
  // Todo colapsado por defecto: así los 4 nodos top-level (Favoritos + las 3 raíces)
  // se ven de golpe, limpios. El usuario expande lo que necesita.
  const [expanded, setExpanded] = useState(() => new Set());

  if (!items.length) {
    return (
      <Flex alignItems="center" justifyContent="center" height="size-3000">
        <Text>No hay rutas. Ejecuta <code>rutas-refresh</code>.</Text>
      </Flex>
    );
  }

  return (
    <TreeView
      aria-label="Rutas por raíz"
      selectionMode="none"
      expandedKeys={expanded}
      onExpandedChange={setExpanded}
      height="100%"
    >
      {items.map((item) => renderNode(item))}
    </TreeView>
  );
}
