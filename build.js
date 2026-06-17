#!/usr/bin/env node
/*
 * build.js — BUILD-TIME ONLY (solo máquina de desarrollo, requiere npm).
 *
 * Compila la app React Spectrum de src/ en UN único bundle autocontenido
 * ui/dashboard.bundle.js (IIFE, minificado, con TODO el CSS de Spectrum inline).
 * Ese bundle se COMMITEA al repo; el runtime (generate-dashboard.js) solo lo
 * inyecta con node — nunca corre esbuild. Así el tool sigue instalándose en
 * cualquier máquina con solo bash + node.
 *
 * Uso:  node build.js            (build de producción, minificado)
 *       node build.js --watch    (rebuild incremental para desarrollar)
 */
'use strict';
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'ui', 'dashboard.bundle.js');
const watch = process.argv.includes('--watch');

// Plugin: cada .css importado por React Spectrum se convierte en un módulo JS que
// auto-inyecta un <style> en document.head. Así el CSS queda DENTRO del bundle JS
// (un solo artefacto, sin .css hermano, sin CDN, 100% offline).
const cssInject = {
  name: 'css-inject',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.promises.readFile(args.path, 'utf8');
      const js = `(function(){
        if (typeof document === 'undefined') return;
        var s = document.createElement('style');
        s.setAttribute('data-spectrum','');
        s.appendChild(document.createTextNode(${JSON.stringify(css)}));
        document.head.appendChild(s);
      })();`;
      return { contents: js, loader: 'js' };
    });
  },
};

const opts = {
  entryPoints: [path.join(ROOT, 'src', 'index.jsx')],
  outfile: OUT,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2019'],
  minify: !watch,
  sourcemap: false,
  jsx: 'automatic',
  loader: {
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.gif': 'dataurl',
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.ttf': 'dataurl',
  },
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  legalComments: 'none',
  logLevel: 'info',
  plugins: [cssInject],
};

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (watch) {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
    console.log('👀 build.js --watch: reconstruyendo ui/dashboard.bundle.js en cada cambio de src/');
  } else {
    await esbuild.build(opts);
    const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
    console.log(`✓ ui/dashboard.bundle.js — ${kb} KB (minificado, CSS inline)`);
    // Aviso si esbuild emitió un .css hermano (significa que algún import escapó al plugin)
    const sibling = OUT.replace(/\.js$/, '.css');
    if (fs.existsSync(sibling)) {
      console.warn('⚠ AVISO: se generó', sibling, '— el CSS no quedó inline. Revisa el plugin css-inject.');
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
