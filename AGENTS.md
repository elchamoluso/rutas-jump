# rutas-jump — Instrucciones para agentes AI

**Audiencia:** Claude Code, agy (Antigravity/Gemini CLI) o cualquier agente con acceso al
filesystem donde está clonado este repo.

## Qué es este sistema

Permite navegar una o varias **raíces** (My Drive, Unidades Compartidas, carpetas del home…) desde la
terminal mediante aliases `cd-*` autogenerados, más un dashboard web local que agrupa cada raíz en su
sección. Es **cross-platform** (ChromeOS/Crostini, macOS, Linux) y configurable: cada usuario define
sus raíces en `rutas.config.sh` con líneas `RUTAS_ROOT_N="etiqueta|path|prefijo|maxdepth|filtro"`
(retro-compat: `RUTAS_BASE` como raíz única si no hay ninguna).

## Componentes

| Archivo | Propósito | Mantenimiento |
|---|---|---|
| `install.sh` | Instalador: detecta SO/base, escribe config, genera aliases, cablea el shell rc | Estable |
| `rutas.config.sh` | Configuración del usuario (`RUTAS_BASE`, `RUTAS_PORT`, branding) | Generado/manual · **gitignored** |
| `loader.sh` | Punto de entrada que sourcea el rc: config → aliases → lib → custom | Estable |
| `regenerate-rutas.sh` | Escanea `RUTAS_BASE` y reescribe `rutas.generated.sh` (escritura atómica) | Estable |
| `rutas.generated.sh` | Aliases `cd-*` autogenerados (raíz + nivel 2) | **Autogenerado** · gitignored |
| `rutas.lib.sh` | Funciones: `rutas-web`, `rutas-web-stop`, `rutas-web-build`, `rutas-web-rebuild`, `rutas-help`, `rutas-refresh` | Estable |
| `custom-aliases.sh` | Atajos personales del usuario (override de los autogenerados) | Manual · **gitignored** |
| `generate-dashboard.js` | Inyecta datos (`window.DATA`) + el bundle commiteado en la plantilla → `dashboard.html` (Node, **runtime sin npm**) | Estable |
| `serve-dashboard.js` | Sirve `dashboard.html` por HTTP (Node, runtime sin npm) | Estable |
| `dashboard.template.html` | Shell mínimo: `#root` + markers `/*__DATA__*/` y `/*__BUNDLE__*/` | Raramente |
| `src/` | **UI React + Adobe React Spectrum** (App, Sidebar, RutasView, ComandosView…) | **Editar para cambiar la UI** |
| `build.js` | esbuild: `src/` → `ui/dashboard.bundle.js` (CSS de Spectrum inline) | Build-time |
| `ui/dashboard.bundle.js` | Bundle React precompilado y **VERSIONADO** (lo que se sirve) | **Compilado · `npm run build`** |
| `package.json` | Deps build-time (react, @adobe/react-spectrum, esbuild) | Build-time |
| `commands.json` | Comandos/secciones copiables del dashboard | Manual |
| `dashboard.html` | Salida generada autocontenida | **Autogenerado** · gitignored |

**Cadena de carga** (`loader.sh`, sourceado desde `~/.bashrc` o `~/.zshrc`):
`rutas.config.sh` → `rutas.generated.sh` (define `export DRIVE` + `cd-*`) → `rutas.lib.sh` →
`custom-aliases.sh`. Por tanto `custom-aliases.sh` **sobrescribe** cualquier alias autogenerado del
mismo nombre.

> **Portabilidad:** `custom-aliases.sh` debe usar **siempre** `$DRIVE/...`, nunca rutas absolutas
> hardcodeadas, para que funcione en cualquier máquina (cada `rutas.config.sh` define su `RUTAS_BASE`).

## Cuándo regenerar

- El usuario crea, renombra, mueve o borra una carpeta en la base (nivel 1 o 2).
- El usuario lo pide ("actualiza las rutas", "rutas-refresh").
- Solo se reflejan nivel 1 y 2; no regeneres por cambios en nivel 3+.

## Cómo regenerar

```bash
bash "$RUTAS_DIR/regenerate-rutas.sh"     # reescribe rutas.generated.sh y refresca el dashboard
```
El usuario ve los cambios al abrir una terminal nueva o con `rutas-refresh`. `RUTAS_DIR` es la
carpeta del repo (la exporta `loader.sh`).

## Normalización de nombres de carpeta → alias

| Caso | Transformación | Ejemplo |
|---|---|---|
| Mayúsculas | minúsculas | `DevOps` → `devops` |
| Espacios / `_` | guión | `Mi Carpeta` → `mi-carpeta` |
| Punto inicial | omitir la carpeta | `.git`, `.cache` → SKIP |
| `screencast-YYYY-MM-DD…`, `Icon`, duplicados `(N)` | omitir | — |
| Otros caracteres | eliminar | salvo `a-z 0-9 -` |

Patrón de alias: My Drive (prefijo vacío) → `cd-<root>`, `cd-<root>-<sub>` (y `cd-drive`). Raíces con
prefijo → `cd-<prefijo>-<root>[-<sub>]` (p.ej. `cd-sd-lusomagnet`, `cd-home-dev`). Var base por raíz:
`$DRIVE` (My Drive), `$DRIVE_SD`, `$DRIVE_HOME`.

## Dashboard web

La UI es una app **React + Adobe React Spectrum** (en `src/`) compilada con esbuild a un único bundle
autocontenido `ui/dashboard.bundle.js` (todo el CSS de Spectrum va inline; offline, sin CDN). Hay una
separación deliberada **build-time vs scan-time** que preserva la portabilidad:

- **Build-time (solo máquina de dev, requiere npm):** `npm run build` (o `rutas-web-rebuild`) compila
  `src/` → `ui/dashboard.bundle.js`. **Ese bundle se COMMITEA al repo.**
- **Scan-time (toda máquina, solo node):** `generate-dashboard.js` escanea la base, parsea los aliases
  de `rutas.generated.sh` + `custom-aliases.sh`, lee `commands.json` + branding, e inyecta `window.DATA`
  y el **bundle commiteado** en `dashboard.template.html` → `dashboard.html` (atómico). **Nunca corre
  npm/esbuild**, así que cron/`rutas-refresh`/`rutas-web` funcionan con solo node.

Cada **raíz** (`RUTAS_ROOT_*`) se renderiza como un **nodo de primer nivel** del árbol con su alias de
raíz (`cd-drive`/`cd-sd`/…). Ese alias sale de `aliasByPath[section.base]`; por eso el regex de
`parseAliases` en `generate-dashboard.js` admite subpath **opcional** (reconoce los `cd-*` a la raíz).
No lo rompas.

- **Abrir:** `rutas-web` (regenera, sirve, abre). `rutas-web-stop` detiene; `rutas-web-build` solo
  regenera (node); `rutas-web-rebuild` recompila el bundle (npm, solo dev).

**Para AIs — REGLA CRÍTICA:**
- Si creas/borras/renombras carpetas o editas `commands.json` → `node "$RUTAS_DIR/generate-dashboard.js"`.
- Para cambiar la **UI**: edita `src/`, luego **recompila** (`npm run build` / `rutas-web-rebuild`) **y
  commitea `ui/dashboard.bundle.js`**. Editar `src/` sin recompilar NO cambia nada (el dashboard inyecta
  el bundle commiteado).
- **Nunca** edites a mano `dashboard.html` (generado) ni `ui/dashboard.bundle.js` (compilado).

## Mantener actualizado (opcional)

Cron de ejemplo (Linux/ChromeOS), cada 30 min:
```cron
*/30 * * * * /bin/bash "$RUTAS_DIR/regenerate-rutas.sh" >/dev/null 2>&1
```

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `cd-foo: command not found` tras crear carpeta | aliases desactualizados | `rutas-refresh` |
| No aparecen aliases en terminal nueva | el rc no sourcea `loader.sh` | re-ejecutar `bash install.sh` |
| `regenerate-rutas.sh` falla con "falta rutas.config.sh" | no instalado | `bash install.sh` |
| El dashboard no abre | falta `node`, o puerto ocupado | instalar Node; `rutas-web-stop` y reintentar |
