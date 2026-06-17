// data.js — adaptadores puros (sin React) sobre el objeto DATA que inyecta
// generate-dashboard.js. Reutiliza la lógica de anidado del dashboard vanilla.

// Port literal de buildSectionTree del template vanilla: convierte el array plano
// section.folders (con rel/depth/root) en un árbol anidado {name, rel, abs, children}.
export function buildSectionTree(section) {
  const map = new Map();
  (section.roots || []).forEach((r) =>
    map.set(r, { name: r, rel: r, abs: section.base + '/' + r, children: [] })
  );
  (section.folders || []).forEach((f) =>
    map.set(f.rel, { name: f.name, rel: f.rel, abs: f.abs, children: [] })
  );
  (section.folders || []).forEach((f) => {
    const i = f.rel.lastIndexOf('/');
    const parent = map.get(i === -1 ? f.root : f.rel.slice(0, i)) || map.get(f.root);
    if (parent) parent.children.push(map.get(f.rel));
  });
  map.forEach((n) => n.children.sort((a, b) => a.name.localeCompare(b.name)));
  return (section.roots || []).map((r) => map.get(r)).filter(Boolean);
}

// Decora recursivamente un nodo de carpeta con id estable + aliases, para TreeView.
function decorateFolder(node, data) {
  return {
    id: 'f:' + node.abs,
    name: node.name,
    abs: node.abs,
    rel: node.rel,
    kind: 'folder',
    aliases: data.aliasByPath[node.abs] || [],
    children: (node.children || []).map((c) => decorateFolder(c, data)),
  };
}

// Construye los items top-level del TreeView de Rutas:
//   [⭐ Favoritos]?  +  un nodo por sección (My Drive · Unidades Compartidas · Home)
// CADA SECCIÓN ES UN NODO DE PRIMER NIVEL (no una etiqueta): lleva su alias de raíz
// (cd-drive/cd-sd/cd-home) y se expande a su árbol de carpetas.
export function buildRutasTree(data) {
  const items = [];

  if (data.favorites && data.favorites.length) {
    items.push({
      id: 'group:favs',
      name: '⭐ Favoritos',
      kind: 'favs',
      aliases: [],
      count: data.favorites.length,
      children: data.favorites.map((f) => ({
        id: 'fav:' + f.abs + ':' + f.alias,
        name: f.alias,
        description: f.rel,
        abs: f.abs,
        kind: 'fav',
        aliases: [f.alias],
        children: [],
      })),
    });
  }

  (data.sections || []).forEach((section) => {
    items.push({
      id: 'sec:' + (section.id || section.base),
      name: section.label,
      abs: section.base,
      kind: 'section',
      aliases: data.aliasByPath[section.base] || [],
      count: (section.folders || []).filter((f) => f.depth === 1).length,
      children: buildSectionTree(section).map((n) => decorateFolder(n, data)),
    });
  });

  return items;
}

export const SEARCH_CAP = 500;

// Búsqueda de carpetas (port de runSearch, rama rutas): match en nombre o rel.
export function filterFolders(data, q) {
  const needle = q.toLowerCase();
  const out = [];
  for (const s of data.sections || []) {
    for (const f of s.folders || []) {
      if (f.name.toLowerCase().includes(needle) || f.rel.toLowerCase().includes(needle)) {
        out.push({
          id: 'r:' + f.abs,
          name: f.name,
          rel: f.rel,
          abs: f.abs,
          section: s.label,
          aliases: data.aliasByPath[f.abs] || [],
        });
        if (out.length >= SEARCH_CAP) return { rows: out, capped: true };
      }
    }
  }
  return { rows: out, capped: false };
}

// Búsqueda de comandos (port de runSearch, rama comandos): match en cmd o desc.
export function filterCommands(data, q) {
  const needle = q.toLowerCase();
  const out = [];
  for (const cat of (data.commands && data.commands.categories) || []) {
    for (const c of cat.commands || []) {
      if (c.cmd.toLowerCase().includes(needle) || (c.desc || '').toLowerCase().includes(needle)) {
        out.push({ id: 'c:' + cat.name + ':' + c.cmd, cmd: c.cmd, desc: c.desc, category: cat.name });
        if (out.length >= SEARCH_CAP) return { rows: out, capped: true };
      }
    }
  }
  return { rows: out, capped: false };
}
