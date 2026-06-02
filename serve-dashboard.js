#!/usr/bin/env node
/*
 * serve-dashboard.js — Sirve dashboard.html por HTTP.
 *
 * Útil en general, e imprescindible en ChromeOS: el Chrome del host no puede
 * abrir file:// del contenedor Linux, así que se sirve por http.
 *
 * Cero dependencias. Escucha en 0.0.0.0 para alcanzarlo vía
 * http://localhost:PUERTO  (en ChromeOS también http://penguin.linux.test:PUERTO).
 *
 * Uso:    node serve-dashboard.js        (puerto de rutas.config.sh, o RUTAS_PORT, o 7777)
 * Normal: lo arranca la función `rutas-web`. Detener: `rutas-web-stop`.
 *
 * Rutas servidas:
 *   GET /                -> dashboard.html (leído fresco en cada petición)
 *   GET /api/regenerate  -> ejecuta generate-dashboard.js y devuelve {ok}
 *   GET /health          -> ok
 */
'use strict';
const http = require('http');
const fs = require('fs');
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
const HOST = '0.0.0.0';

function regenerate() {
  try { execFileSync(process.execPath, [GEN], { stdio: 'ignore' }); return true; }
  catch (e) { return false; }
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return;
  }
  if (url === '/api/regenerate') {
    const ok = regenerate();
    res.writeHead(ok ? 200 : 500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok })); return;
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
    console.error('El puerto ' + PORT + ' ya está en uso (servidor ya activo). OK.');
    process.exit(0);
  }
  console.error('Error del servidor:', e.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('✓ Dashboard sirviéndose:');
  console.log('   http://localhost:' + PORT);
  if (process.platform === 'linux') {
    console.log('   http://penguin.linux.test:' + PORT + '   (ChromeOS: alternativa si localhost no abre)');
  }
});
