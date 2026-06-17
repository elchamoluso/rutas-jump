// RutasView — el árbol jerárquico. CADA RAÍZ (My Drive · Unidades Compartidas · Home)
// es un nodo de PRIMER NIVEL con su alias (cd-drive/cd-sd/cd-home) y acciones, que se
// expande a su árbol de carpetas. Favoritos va fijado arriba.
//
// Render ESTÁTICO recursivo (TreeViewItem anidados): es el modo fiable para que Spectrum
// marque las filas como expandibles. ~477 nodos rinden sin problema.
import { useMemo, useState } from 'react';
import { TreeView, TreeViewItem, TreeViewItemContent, Text, Badge, Flex } from '@adobe/react-spectrum';
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
  return (
    <TreeViewItem key={item.id} id={item.id} textValue={item.name}>
      <TreeViewItemContent>
        {iconFor(item)}
        <Text>{label}</Text>
        {item.abs ? <RouteActions abs={item.abs} aliases={item.aliases} /> : null}
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
