#!/usr/bin/env node
/*
 * generate-dashboard.js — Escanea varias raíces (My Drive · Unidades Compartidas · home…)
 * + parsea los aliases cd-* y genera un dashboard.html AUTOCONTENIDO (rutas copiables + comandos).
 *
 * Cero dependencias (solo módulos nativos de Node).
 *
 * Uso:        node generate-dashboard.js [--max-depth N]
 * Cron:       lo llama regenerate-rutas.sh tras regenerar rutas.generated.sh.
 * On-demand:  el comando `rutas-web` regenera y abre el dashboard.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ---------------- CONFIG ----------------
const SCRIPT_DIR = __dirname;

// Expande ~ y $HOME en una ruta leída de la config.
function expandHome(p) {
  if (!p) return p;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p.replace(/\$\{?HOME\}?/g, home);
}

// Lee rutas.config.sh (formato CLAVE="valor") sin ejecutar shell.
function readConfig(file) {
  const cfg = {};
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return cfg; }
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?(RUTAS_[A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"')) { const e = v.indexOf('"', 1); if (e !== -1) v = v.slice(1, e); }
    else if (v.startsWith("'")) { const e = v.indexOf("'", 1); if (e !== -1) v = v.slice(1, e); }
    else { v = v.split('#')[0].trim(); }
    cfg[m[1]] = v;
  }
  return cfg;
}

const CONFIG_FILE = path.join(SCRIPT_DIR, 'rutas.config.sh');
const CFG = readConfig(CONFIG_FILE);

const BRAND = {
  title: CFG.RUTAS_TITLE || 'Rutas',
  emoji: CFG.RUTAS_EMOJI || '🗂️',
  accent: CFG.RUTAS_ACCENT || '#0070f3',
};

// Carpetas que NO se escanean (ruido / pesadas). Se suman a "empieza por ."
const EXCLUDE_NAMES = new Set([
  'node_modules', '.git', '.claude', '.claude-sync', 'claude-sync', '.claude-flow', '.antigravitycli',
  'build', 'dist', '.next', '.cache', '__pycache__', '.venv', 'venv'
]);
// Salta dotfolders y screencast-YYYY-MM-DD (igual que should_skip en regenerate-rutas.sh)
const SCREENCAST_RE = /^screencast-\d{4}-\d{2}-\d{2}/;

// Tope de profundidad por defecto (si una raíz no define el suyo). Override global: --max-depth N
let MAX_DEPTH = 40;
const mdIdx = process.argv.indexOf('--max-depth');
if (mdIdx !== -1 && process.argv[mdIdx + 1]) {
  const n = parseInt(process.argv[mdIdx + 1], 10);
  if (!isNaN(n) && n > 0) MAX_DEPTH = n;
}

// --- Raíces múltiples: RUTAS_ROOT_N="etiqueta|path|prefijo|maxdepth|filtro" ---
// filtro: "" (escanea todo el nivel 1) | "whitelist:a,b" (solo esas carpetas de nivel 1)
// prefijo: vacío = My Drive (alias sin prefijo, var $DRIVE) · "sd"/"home" = prefijo de alias + var $DRIVE_SD/$DRIVE_HOME
function parseRoots(cfg) {
  const keys = Object.keys(cfg).filter(k => /^RUTAS_ROOT_\d+$/.test(k))
    .sort((a, b) => parseInt(a.slice(11), 10) - parseInt(b.slice(11), 10));
  const roots = [];
  for (const k of keys) {
    const parts = cfg[k].split('|');
    const base = expandHome((parts[1] || '').trim());
    if (!base) continue;
    const prefix = (parts[2] || '').trim();
    const mdn = parseInt((parts[3] || '').trim(), 10);
    const filter = (parts[4] || '').trim();
    roots.push({
      id: prefix || 'md',
      label: (parts[0] || base).trim(),
      base,
      prefix,
      varName: prefix ? 'DRIVE_' + prefix.toUpperCase() : 'DRIVE',
      maxdepth: (!isNaN(mdn) && mdn > 0) ? mdn : MAX_DEPTH,
      whitelist: filter.startsWith('whitelist:')
        ? filter.slice('whitelist:'.length).split(',').map(s => s.trim()).filter(Boolean) : null,
    });
  }
  return roots;
}

let ROOTS = parseRoots(CFG);
if (!ROOTS.length) {
  // Retro-compat: una sola raíz desde RUTAS_BASE (o $DRIVE del entorno).
  const base = process.env.DRIVE || expandHome(CFG.RUTAS_BASE);
  if (base) ROOTS = [{ id: 'md', label: 'Drive', base, prefix: '', varName: 'DRIVE', maxdepth: MAX_DEPTH, whitelist: null }];
}
if (!ROOTS.length) {
  console.error('ERROR: no hay ninguna raíz. Define RUTAS_ROOT_* o RUTAS_BASE en rutas.config.sh.');
  console.error('  Ejecuta primero:  bash install.sh');
  process.exit(1);
}

const TEMPLATE = path.join(SCRIPT_DIR, 'dashboard.template.html');
const COMMANDS_FILE = path.join(SCRIPT_DIR, 'commands.json');
const OUT = path.join(SCRIPT_DIR, 'dashboard.html');
const OUT_TMP = OUT + '.tmp';
const GENERATED_SH = path.join(SCRIPT_DIR, 'rutas.generated.sh');
const CUSTOM_SH = path.join(SCRIPT_DIR, 'custom-aliases.sh');
// Bundle React Spectrum PREBUILD y COMMITEADO. generate-dashboard.js solo lo INYECTA
// (node-only); se reconstruye en la máquina de dev con `npm run build` (build.js).
const BUNDLE = path.join(SCRIPT_DIR, 'ui', 'dashboard.bundle.js');

// ---------------- helpers ----------------
function shouldSkip(name) {
  if (name.startsWith('.')) return true;
  if (EXCLUDE_NAMES.has(name)) return true;
  if (SCREENCAST_RE.test(name)) return true;
  return false;
}

// Escaneo de una raíz. Devuelve { roots:[nombres nivel-1], folders:[{name,abs,rel,depth,root}] }
// rel es relativo a root.base (único DENTRO de la sección).
function scanBase(root) {
  const out = [];
  let level1;
  try { level1 = fs.readdirSync(root.base, { withFileTypes: true }); }
  catch (e) { return { roots: [], folders: [] }; }
  const rootNames = level1
    .filter(d => d.isDirectory() && !shouldSkip(d.name))
    .filter(d => !root.whitelist || root.whitelist.includes(d.name))
    .map(d => d.name)
    .sort();
  for (const rn of rootNames) {
    const rootAbs = path.join(root.base, rn);
    (function walk(dirAbs, depth) {
      if (depth > root.maxdepth) return;
      let entries;
      try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); }
      catch (e) { return; } // permisos / dir ilegible → se salta
      for (const ent of entries) {
        if (!ent.isDirectory()) continue;          // ignora archivos y symlinks (evita bucles)
        const name = ent.name;
        if (shouldSkip(name)) continue;
        const abs = path.join(dirAbs, name);
        out.push({ name, abs, rel: path.relative(root.base, abs), depth, root: rn });
        walk(abs, depth + 1);
      }
    })(rootAbs, 1);
  }
  return { roots: rootNames, folders: out };
}

// Parsea  alias cd-XXX='cd "$VAR/PATH"'  resolviendo $VAR→base. Devuelve [{alias, rel, abs}].
function parseAliases(file, baseByVar) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  // El subpath es OPCIONAL: así los atajos a la RAÍZ de una sección (cd "$DRIVE")
  // también se reconocen y pueden salir como favoritos, no solo los de subcarpeta.
  const re = /alias\s+(cd-[\w-]+)='cd\s+"\$(DRIVE[A-Z0-9_]*)(?:\/([^"]+))?"'/g;
  const res = [];
  let m;
  while ((m = re.exec(txt)) !== null) {
    const base = baseByVar[m[2]];
    if (!base) continue;
    const sub = m[3] || '';
    res.push({ alias: m[1], rel: sub, abs: sub ? path.join(base, sub) : base });
  }
  return res;
}

// ---------------- escaneo ----------------
const t0 = Date.now();
const baseByVar = {};
ROOTS.forEach(r => { baseByVar[r.varName] = r.base; });

const sections = [];
let totalFolders = 0;
const perSection = {};
for (const r of ROOTS) {
  const { roots, folders } = scanBase(r);
  perSection[r.id] = folders.length;
  totalFolders += folders.length;
  sections.push({ id: r.id, label: r.label, base: r.base, prefix: r.prefix, roots, folders });
}

// ---------------- aliases (indexados por ruta ABSOLUTA → sin colisión entre secciones) ----------------
const aliasByPath = {};
for (const a of parseAliases(GENERATED_SH, baseByVar).concat(parseAliases(CUSTOM_SH, baseByVar))) {
  if (!aliasByPath[a.abs]) aliasByPath[a.abs] = [];
  if (!aliasByPath[a.abs].includes(a.alias)) aliasByPath[a.abs].push(a.alias);
}

// Favoritos = aliases custom de custom-aliases.sh que apuntan a carpetas existentes
const favSeen = new Set();
const favorites = [];
for (const a of parseAliases(CUSTOM_SH, baseByVar)) {
  if (favSeen.has(a.alias)) continue;
  favSeen.add(a.alias);
  let exists = false;
  try { exists = fs.statSync(a.abs).isDirectory(); } catch (e) {}
  if (exists) favorites.push({ alias: a.alias, rel: a.rel || '(raíz)', abs: a.abs });
}
favorites.sort((x, y) => x.alias.localeCompare(y.alias));

// ---------------- comandos ----------------
let commands = { categories: [] };
try { commands = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8')); }
catch (e) { console.warn('AVISO: no se pudo leer commands.json:', e.message); }
const cmdCount = (commands.categories || []).reduce((n, c) => n + ((c.commands || []).length), 0);

// ---------------- datos + render ----------------
const now = new Date();
const DATA = {
  generatedAt: now.toISOString(),
  generatedAtHuman: now.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
  brand: BRAND,
  platform: process.platform,
  sections,
  aliasByPath,
  favorites,
  commands,
  stats: {
    folderCount: totalFolders,
    sectionCount: sections.length,
    commandCount: cmdCount,
    aliasCount: Object.keys(aliasByPath).length,
    perSection,
  },
};

let tpl;
try { tpl = fs.readFileSync(TEMPLATE, 'utf8'); }
catch (e) { console.error('ERROR: falta dashboard.template.html en', SCRIPT_DIR); process.exit(1); }

// Escapamos para no romper el cierre de <script> ni el parser JS.
// U+2028/U+2029 se construyen con RegExp para no meter caracteres invisibles en el fuente.
const json = JSON.stringify(DATA)
  .replace(/</g, '\\u003c')
  .replace(new RegExp('\\u2028', 'g'), '\\u2028')
  .replace(new RegExp('\\u2029', 'g'), '\\u2029');

// 1) Inyección del DATA (mismo marcador y escaping de siempre). Como global window.DATA
//    para que la app React lo lea al arrancar.
if (tpl.indexOf('/*__DATA__*/') === -1) {
  console.error('ERROR: la plantilla no contiene el marcador /*__DATA__*/');
  process.exit(1);
}
let html = tpl.replace('/*__DATA__*/', () => 'window.DATA = ' + json + ';');

// 2) Inyección del bundle React Spectrum PREBUILD y COMMITEADO. Degradación elegante:
//    si falta, error claro (no un HTML roto). El scan-time sigue siendo node-only:
//    aquí solo se LEE un archivo versionado, nunca se ejecuta npm/esbuild.
if (tpl.indexOf('/*__BUNDLE__*/') === -1) {
  console.error('ERROR: la plantilla no contiene el marcador /*__BUNDLE__*/');
  process.exit(1);
}
let bundle;
try { bundle = fs.readFileSync(BUNDLE, 'utf8'); }
catch (e) {
  console.error('ERROR: falta el bundle de la UI:', BUNDLE);
  console.error('  Es un artefacto versionado en el repo. Si editaste src/, recompílalo:');
  console.error('    npm install   (una sola vez)');
  console.error('    npm run build   (o: rutas-web-rebuild)');
  console.error('  En una máquina sin npm, basta `git pull` para traerlo ya compilado.');
  process.exit(1);
}
// El bundle es código local de confianza; solo neutralizamos un </script> literal que
// pudiera venir dentro de un string CSS inlineado, para no cerrar el <script> antes de tiempo.
const bundleSafe = bundle.replace(/<\/script>/gi, '<\\/script>');
html = html.replace('/*__BUNDLE__*/', () => bundleSafe);

// Escritura atómica (tmp + rename), igual patrón que regenerate-rutas.sh
fs.writeFileSync(OUT_TMP, html);
fs.renameSync(OUT_TMP, OUT);

const ms = Date.now() - t0;
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`✓ dashboard.html generado — ${totalFolders} carpetas · ${sections.length} secciones · ${cmdCount} comandos · ${favorites.length} favoritos · ${kb} KB · ${ms} ms`);
console.log('  Abrir: ' + OUT);
