#!/usr/bin/env node
/*
 * serve-dashboard.js — Sirve dashboard.html por HTTP.
 *
 * Útil en general, e imprescindible en ChromeOS: el Chrome del host no puede
 * abrir file:// del contenedor Linux, así que se sirve por http.
 *
 * Cero dependencias. Escucha SOLO en loopback (127.0.0.1), que es lo que abre
 * `rutas-jump` y además es "secure context" (requisito de navigator.clipboard).
 * Si alguna vez hiciera falta alcanzarlo desde otra máquina: RUTAS_HOST=0.0.0.0.
 *
 * Uso:    node serve-dashboard.js        (puerto de rutas.config.sh, o RUTAS_PORT, o 7777)
 * Normal: lo arranca `rutas-jump` vía systemd. Detener: `rutas-jump-stop`.
 *
 * Rutas servidas:
 *   GET  /                -> dashboard.html (leído fresco en cada petición)
 *   GET  /api/llave       -> estado de la bóveda de credenciales (solo existencia de ficheros)
 *   POST /api/regenerate  -> ejecuta generate-dashboard.js y devuelve {ok}
 *   GET  /health          -> ok
 */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const HTML = path.join(DIR, 'dashboard.html');
const GEN = path.join(DIR, 'generate-dashboard.js');

// Puerto: env RUTAS_PORT → RUTAS_PORT de rutas.config.sh → 7777. Valida que sea un puerto real.
function validPort(n) { return Number.isInteger(n) && n > 0 && n < 65536; }
function configPort() {
  const env = parseInt(process.env.RUTAS_PORT, 10);
  if (validPort(env)) return env;
  try {
    const txt = fs.readFileSync(path.join(DIR, 'rutas.config.sh'), 'utf8');
    const m = txt.match(/^\s*(?:export\s+)?RUTAS_PORT\s*=\s*"?(\d+)"?/m);
    if (m) { const p = parseInt(m[1], 10); if (validPort(p)) return p; }
  } catch (e) {}
  return 7777;
}
const PORT = configPort();
const HOST = process.env.RUTAS_HOST || '127.0.0.1';

// Los endpoints /api/* solo responden si el Host es el nuestro. Con el bind en loopback
// esto solo deja fuera el DNS rebinding, pero son tres líneas y cierra el hueco.
const HOSTS_OK = new Set(['localhost:' + PORT, '127.0.0.1:' + PORT]);
function hostOk(req) { return HOSTS_OK.has(String(req.headers.host || '').toLowerCase()); }

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function regenerate() {
  try { execFileSync(process.execPath, [GEN], { stdio: 'ignore' }); return true; }
  catch (e) { return false; }
}

// ---------------- sonda de la bóveda (llave) ----------------
// Solo se mira la EXISTENCIA y el TIPO de unas rutas conocidas: nunca su contenido, nunca
// la clave del pendrive, y jamás se ejecuta `llave` (que pediría PIN). Ver secrets-protocol.
//
// Con la bóveda ABIERTA cada ruta del manifiesto es un symlink a un tmpfs; al reiniciar el
// tmpfs se vacía y quedan COLGANDO. Que un fichero exista de verdad (no sea enlace) significa
// que está EN CLARO en el disco — el caso que deja `gws` al caer en las credenciales de gcloud.
// Por eso la sonda va por las rutas del manifiesto y no por el directorio del tmpfs: ese
// directorio lo deja creado hasta un `unlock` fallido, y daría "abierta" en falso.
const HOME = os.homedir();
const LLAVE_HOME = process.env.LLAVE_HOME || path.join(HOME, '.llave');
const MANIF_DIR = path.join(LLAVE_HOME, 'manifiestos');
const REMOVABLE = '/mnt/chromeos/removable';

function ambitosConocidos() {
  try {
    return fs.readdirSync(MANIF_DIR)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => f.slice(0, -4))
      .filter((a) => /^[a-z0-9_-]+$/.test(a))   // el ámbito NUNCA viene de la petición
      .sort();
  } catch (e) { return []; }
}

function rutasDelManifiesto(ambito) {
  const txt = fs.readFileSync(path.join(MANIF_DIR, ambito + '.txt'), 'utf8');
  return txt.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function estadoDe(ambito) {
  let rutas;
  try { rutas = rutasDelManifiesto(ambito); } catch (e) { return null; }
  let enlazadas = 0, enClaro = 0;
  for (const rel of rutas) {
    const p = path.join(HOME, rel);
    let st;
    try { st = fs.lstatSync(p); } catch (e) { continue; }   // ausente
    if (st.isSymbolicLink()) { if (fs.existsSync(p)) enlazadas++; }  // existsSync sigue el enlace
    else enClaro++;
  }
  // El naranja gana al verde: un 🟢 con credenciales en claro certificaría como seguro
  // un disco que no lo está.
  let estado;
  if (enClaro > 0) estado = 'en-claro';
  else if (rutas.length && enlazadas === rutas.length) estado = 'abierta';
  else if (enlazadas > 0) estado = 'a-medias';
  else estado = 'cerrada';
  return { ambito, estado, total: rutas.length, enlazadas, enClaro };
}

function pendrivePresente() {
  try {
    for (const e of fs.readdirSync(REMOVABLE)) {          // readdirSync, no glob: hay espacios
      if (fs.existsSync(path.join(REMOVABLE, e, '.llave', 'key.bin'))) return true;
    }
  } catch (e) {}
  return false;
}

function estadoLlave() {
  const ambitos = ambitosConocidos().map(estadoDe).filter(Boolean);
  return { instalada: ambitos.length > 0, pendrive: pendrivePresente(), ambitos };
}

// ---------------- servidor ----------------
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return;
  }

  if (url.startsWith('/api/')) {
    if (!hostOk(req)) { sendJSON(res, 403, { error: 'host no permitido' }); return; }

    if (url === '/api/llave' && req.method === 'GET') {
      sendJSON(res, 200, estadoLlave()); return;
    }
    if (url === '/api/regenerate' && req.method === 'POST') {
      const ok = regenerate(); sendJSON(res, ok ? 200 : 500, { ok }); return;
    }
    sendJSON(res, 404, { error: 'no existe' }); return;
  }

  // Cualquier otra ruta sirve el dashboard (leído fresco -> siempre la última versión generada)
  fs.readFile(HTML, (err, buf) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No se pudo leer dashboard.html.\nEjecuta: node generate-dashboard.js');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    // Ya hay un servidor en ese puerto: no es un error, simplemente salimos.
    // OJO: por eso la unidad systemd usa Restart=on-failure y NUNCA always (este exit 0
    // con el puerto ocupado la metería en un bucle de reinicios).
    console.error('El puerto ' + PORT + ' ya está en uso (servidor ya activo). OK.');
    process.exit(0);
  }
  console.error('Error del servidor:', e.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('✓ Dashboard sirviéndose:');
  console.log('   http://localhost:' + PORT);
});
