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

// ---------------- comando de arranque ----------------

// Cita para bash con comillas SIMPLES. Dentro de comillas DOBLES una ruta con `!` se expande
// en silencio (histexpand está on en bash interactivo) y te llevaría a otro sitio sin avisar;
// `$` y las backticks también se interpretan. Con simples solo hay que escapar la comilla,
// con el idioma estándar '\'' — y queda inmune a todo lo demás.
export function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

// Ámbito de la bóveda que hay que desbloquear para que la CLI vea sus tokens, o null si no hace
// falta: bóveda ya abierta, o este entorno no usa ninguna (`ambito` vacío / sin bóveda instalada).
// Fail-safe: un estado que no sea 'abierta' —incluido 'desconocido'— pide el unlock. Sobrar
// el prefijo cuesta teclear el PIN de más; faltar cuesta arrancar sin tokens y no enterarte.
export function ambitoPendiente(ambito, vault) {
  if (!ambito || !vault || !vault.instalada) return null;
  const a = (vault.ambitos || []).find((x) => x.ambito === ambito);
  if (!a) return null;
  return a.estado === 'abierta' ? null : ambito;
}

// La sección (raíz) de una ruta: la de `base` MÁS LARGA que la contiene, porque una raíz puede
// colgar de otra (un home en $HOME contiene a todas las demás).
export function seccionDe(abs, sections) {
  let best = null;
  for (const s of sections || []) {
    if ((abs === s.base || abs.startsWith(s.base + '/')) && (!best || s.base.length > best.base.length)) best = s;
  }
  return best;
}

// El comando completo de una carpeta para la CLI activa. UNA sola línea y sin salto final:
// un \n haría que el terminal lo EJECUTE al pegarlo, con los flags peligrosos dentro.
//
// Raíz con lanzador propio (section.lanzador, de RUTAS_LANZADOR_<PREFIJO>): el lanzador hace el
// cd, recibe la subcarpeta RELATIVA a la raíz y envuelve a claude, así que con otra CLI esa raíz
// no tiene comando. Tampoco lleva los toggles `warn`: el lanzador trae sus propias confirmaciones
// y saltárselas es justo lo que no se quiere ahí.
export function buildCommand({ cli, modo, toggles, abs, vault, ambito, seccion }) {
  if (!cli || !abs) return '';
  const lanzador = (seccion && seccion.lanzador) || '';
  if (lanzador && cli.bin !== 'claude') return '';
  const partes = [];
  const amb = ambitoPendiente(ambito, vault);
  if (amb) partes.push('llave unlock ' + amb + ' &&');
  if (lanzador) {
    partes.push(lanzador);
    if (abs !== seccion.base) partes.push(shellQuote(abs.slice(seccion.base.length + 1)));
  } else {
    partes.push('cd ' + shellQuote(abs) + ' &&');
    partes.push(cli.bin);
  }
  // El modo va INMEDIATAMENTE tras el binario: en codex es un subcomando ('resume --last'),
  // no una bandera, y los subcomandos no admiten flags por delante.
  const m = (cli.modos || []).find((x) => x.id === modo);
  if (m && m.args) partes.push(m.args);
  for (const t of cli.toggles || []) {
    if (lanzador && t.warn) continue;
    if ((toggles || []).includes(t.id) && t.args) partes.push(t.args);
  }
  return partes.join(' ');
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
