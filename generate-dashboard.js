#!/usr/bin/env node
/*
 * generate-dashboard.js — Escanea las carpetas del Drive + parsea los aliases cd-*
 * y genera un dashboard.html AUTOCONTENIDO (rutas copiables + comandos).
 *
 * Cero dependencias (solo módulos nativos de Node).
 *
 * Uso:        node generate-dashboard.js [--max-depth N]
 * Cron:       lo llama regenerate-rutas.sh tras regenerar rutas.sh (cada 30 min).
 * On-demand:  el alias `rutas-web` (en extra-aliases.sh) regenera y abre el dashboard.
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
    const m = line.match(/^\s*(?:export\s+)?(RUTAS_[A-Z_]+)\s*=\s*(.*)$/);
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
// Carpeta base a escanear: variable de entorno DRIVE → RUTAS_BASE de la config.
const DRIVE = process.env.DRIVE || expandHome(CFG.RUTAS_BASE);
if (!DRIVE) {
  console.error('ERROR: no hay carpeta base. Falta rutas.config.sh (RUTAS_BASE) o la variable $DRIVE.');
  console.error('  Ejecuta primero:  bash install.sh');
  process.exit(1);
}
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

// Tope de profundidad de escaneo (seguridad anti-bucles). Override: --max-depth N
let MAX_DEPTH = 40;
const mdIdx = process.argv.indexOf('--max-depth');
if (mdIdx !== -1 && process.argv[mdIdx + 1]) {
  const n = parseInt(process.argv[mdIdx + 1], 10);
  if (!isNaN(n) && n > 0) MAX_DEPTH = n;
}

const TEMPLATE = path.join(SCRIPT_DIR, 'dashboard.template.html');
const COMMANDS_FILE = path.join(SCRIPT_DIR, 'commands.json');
const OUT = path.join(SCRIPT_DIR, 'dashboard.html');
const OUT_TMP = OUT + '.tmp';
const GENERATED_SH = path.join(SCRIPT_DIR, 'rutas.generated.sh');
const CUSTOM_SH = path.join(SCRIPT_DIR, 'custom-aliases.sh');

// ---------------- helpers ----------------
function shouldSkip(name) {
  if (name.startsWith('.')) return true;
  if (EXCLUDE_NAMES.has(name)) return true;
  if (SCREENCAST_RE.test(name)) return true;
  return false;
}

// Escaneo recursivo de una raíz. Devuelve [{name, abs, rel, depth, root}]
function scanRoot(rootName) {
  const out = [];
  const rootAbs = path.join(DRIVE, rootName);
  (function walk(dirAbs, depth) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); }
    catch (e) { return; } // permisos / dir ilegible → se salta
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;          // ignora archivos y symlinks (evita bucles)
      const name = ent.name;
      if (shouldSkip(name)) continue;
      const abs = path.join(dirAbs, name);
      out.push({ name, abs, rel: path.relative(DRIVE, abs), depth, root: rootName });
      walk(abs, depth + 1);
    }
  })(rootAbs, 1);
  return out;
}

// Parsea  alias cd-XXX='cd "$DRIVE/PATH"'  → [{alias, rel}]
function parseAliases(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const re = /alias\s+(cd-[\w-]+)='cd\s+"\$DRIVE\/([^"]+)"'/g;
  const res = [];
  let m;
  while ((m = re.exec(txt)) !== null) res.push({ alias: m[1], rel: m[2] });
  return res;
}

// ---------------- escaneo ----------------
const t0 = Date.now();

let rootNames;
try {
  rootNames = fs.readdirSync(DRIVE, { withFileTypes: true })
    .filter(d => d.isDirectory() && !shouldSkip(d.name))
    .map(d => d.name)
    .sort();
} catch (e) {
  console.error('ERROR: no se pudo leer DRIVE =', DRIVE, '\n ', e.message);
  process.exit(1);
}

let folders = [];
const perRoot = {};
for (const r of rootNames) {
  const f = scanRoot(r);
  perRoot[r] = f.length;
  folders = folders.concat(f);
}

// ---------------- aliases ----------------
const aliasByPath = {};
for (const a of parseAliases(GENERATED_SH).concat(parseAliases(CUSTOM_SH))) {
  if (!aliasByPath[a.rel]) aliasByPath[a.rel] = [];
  if (!aliasByPath[a.rel].includes(a.alias)) aliasByPath[a.rel].push(a.alias);
}

// Favoritos = aliases custom de custom-aliases.sh que apuntan a carpetas existentes
const favSeen = new Set();
const favorites = [];
for (const a of parseAliases(CUSTOM_SH)) {
  if (favSeen.has(a.alias)) continue;
  favSeen.add(a.alias);
  const abs = path.join(DRIVE, a.rel);
  let exists = false;
  try { exists = fs.statSync(abs).isDirectory(); } catch (e) {}
  if (exists) favorites.push({ alias: a.alias, rel: a.rel, abs });
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
  driveRoot: DRIVE,
  brand: BRAND,
  platform: process.platform,
  roots: rootNames,
  folders,
  aliasByPath,
  favorites,
  commands,
  stats: {
    folderCount: folders.length,
    rootCount: rootNames.length,
    commandCount: cmdCount,
    aliasCount: Object.keys(aliasByPath).length,
    perRoot,
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

if (tpl.indexOf('/*__DATA__*/') === -1) {
  console.error('ERROR: la plantilla no contiene el marcador /*__DATA__*/');
  process.exit(1);
}
const html = tpl.replace('/*__DATA__*/', () => 'const DATA = ' + json + ';');

// Escritura atómica (tmp + rename), igual patrón que regenerate-rutas.sh
fs.writeFileSync(OUT_TMP, html);
fs.renameSync(OUT_TMP, OUT);

const ms = Date.now() - t0;
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`✓ dashboard.html generado — ${folders.length} carpetas · ${rootNames.length} raíces · ${cmdCount} comandos · ${favorites.length} favoritos · ${kb} KB · ${ms} ms`);
console.log('  Abrir: ' + OUT);
