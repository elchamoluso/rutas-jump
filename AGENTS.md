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
| `rutas.lib.sh` | Funciones: `rutas-jump`, `rutas-jump-stop`, `rutas-jump-build`, `rutas-jump-rebuild`, `rutas-help`, `rutas-refresh` | Estable |
| `custom-aliases.sh` | Atajos personales del usuario (override de los autogenerados) | Manual · **gitignored** |
| `generate-dashboard.js` | Inyecta datos (`window.DATA`) + el bundle commiteado en la plantilla → `dashboard.html` (Node, **runtime sin npm**) | Estable |
| `serve-dashboard.js` | Sirve `dashboard.html` por HTTP en **loopback** (lo regenera en cada carga) + `POST /api/regenerate` (alias + dashboard: el botón «Actualizar») + `GET /api/llave` (Node, runtime sin npm) | Estable |
| `dashboard.template.html` | Shell mínimo: `#root` + markers `/*__DATA__*/` y `/*__BUNDLE__*/` | Raramente |
| `src/` | **UI React + Adobe React Spectrum** (App, Sidebar, RutasView, ComandosView, FlagsBar, VaultBanner…) | **Editar para cambiar la UI** |
| `src/launcher.js` | Contexto de la CLI activa (modo/toggles, persistencia) + sonda de la bóveda | **Editar para cambiar la UI** |
| `build.js` | esbuild: `src/` → `ui/dashboard.bundle.js` (CSS de Spectrum inline) | Build-time |
| `ui/dashboard.bundle.js` | Bundle React precompilado y **VERSIONADO** (lo que se sirve) | **Compilado · `npm run build`** |
| `package.json` | Deps build-time (react, @adobe/react-spectrum, esbuild) | Build-time |
| `commands.json` | Comandos/secciones copiables del dashboard | Manual |
| `launchers.json` | Las CLIs de la barra lateral (`modos` + `toggles` por CLI) | Manual |
| `commands.local.json` | Secciones de comandos propias de la máquina, fusionadas al generar | Manual · **gitignored** |
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

- **Build-time (solo máquina de dev, requiere npm):** `npm run build` (o `rutas-jump-rebuild`) compila
  `src/` → `ui/dashboard.bundle.js`. **Ese bundle se COMMITEA al repo.**
- **Scan-time (toda máquina, solo node):** `generate-dashboard.js` escanea la base, parsea los aliases
  de `rutas.generated.sh` + `custom-aliases.sh`, lee `commands.json` + branding, e inyecta `window.DATA`
  y el **bundle commiteado** en `dashboard.template.html` → `dashboard.html` (atómico). **Nunca corre
  npm/esbuild**, así que cron/`rutas-refresh`/`rutas-jump` funcionan con solo node.

Cada **raíz** (`RUTAS_ROOT_*`) se renderiza como un **nodo de primer nivel** del árbol con su alias de
raíz (`cd-drive`/`cd-sd`/…). Ese alias sale de `aliasByPath[section.base]`; por eso el regex de
`parseAliases` en `generate-dashboard.js` admite subpath **opcional** (reconoce los `cd-*` a la raíz).
No lo rompas.

- **Abrir:** `rutas-jump` (regenera, sirve, abre). `rutas-jump-stop` detiene; `rutas-jump-build` solo
  regenera (node); `rutas-jump-rebuild` recompila el bundle (npm, solo dev).
- **Al día:** cada carga de la página regenera el dashboard (carpetas, ~0,3 s). El botón «Actualizar»
  de la barra lateral llama a `POST /api/regenerate`, que corre `regenerate-rutas.sh` (alias `cd-*` +
  dashboard, ~2 s), y recarga. La petición lleva la cabecera `X-Rutas: 1`: sin ella el servidor responde
  403, y así ninguna web ajena la dispara (CSRF). La carga solo regenera si el Host es el nuestro.
  Las terminales abiertas cogen los alias nuevos con `rutas-refresh`, que antes quita los `cd-*` que
  definían sus ficheros (los de otro sitio no los toca) para que no sigan vivos los de carpetas
  renombradas; las terminales nuevas los cargan solas.
- **Que dos regeneraciones no se pisen:** cada `generate-dashboard.js` escribe su propio temporal
  (`dashboard.html.<pid>.tmp`) y lo renombra, así que siempre queda un dashboard completo, venga de
  donde venga (el servidor, `rutas-refresh`, un cron). Con un nombre fijo, una truncaba el temporal
  mientras la otra lo renombraba. Además, `regenerar()` en `serve-dashboard.js` no lanza dos a la vez,
  no vuelve a escanear si el dashboard tiene menos de 2 s y, al vencer el tope, mata el grupo de
  procesos entero y sirve la última versión. No quites nada de esto.

**Para AIs — REGLA CRÍTICA:**
- Si creas/borras/renombras carpetas o editas `commands.json` → `node "$RUTAS_DIR/generate-dashboard.js"`.
- Para cambiar la **UI**: edita `src/`, luego **recompila** (`npm run build` / `rutas-jump-rebuild`) **y
  commitea `ui/dashboard.bundle.js`**. Editar `src/` sin recompilar NO cambia nada (el dashboard inyecta
  el bundle commiteado).
- **Nunca** edites a mano `dashboard.html` (generado) ni `ui/dashboard.bundle.js` (compilado).

## Lanzadores por CLI y bóveda de credenciales

La barra lateral se genera desde `launchers.json`: una entrada por CLI, cada una con sus
`modos` (excluyentes) y `toggles` (acumulativos). El botón `[📋 <CLI>]` de cada fila copia
`llave unlock <ámbito> && cd '<ruta>' && <bin> <modo> <toggles>`.

El **ámbito de la bóveda es de la máquina**, no de cada CLI: sale de `RUTAS_LLAVE_AMBITO`
(`rutas.config.sh`, gitignored) y llega a la UI como `data.llaveAmbito`. Vacío = el entorno no
cifra credenciales: sin nota y sin prefijo. Nada específico de una bóveda concreta se commitea:
lo de esta máquina vive en `rutas.config.sh` y `commands.local.json`, y el repo solo lleva la
documentación de cómo activarlo (`rutas.config.example.sh`, README).

También son de la máquina, y por eso viven en `rutas.config.sh`:

- `RUTAS_CLIS` filtra por `id` las CLIs de `launchers.json` que salen en la barra lateral (vacío = todas).
- `RUTAS_LANZADOR_<PREFIJO>` da a una raíz su **propio lanzador**, que llega a la UI como
  `section.lanzador`. En esa raíz el 📋 copia `<lanzador> '<subcarpeta relativa>' <modo> <toggles>`:
  sin `cd`, porque lo hace el lanzador. Solo lo genera con la CLI de bin `claude`; con otra, esa raíz
  no tiene comando. Y **nunca lleva los toggles `warn`**, porque el lanzador trae sus propias
  confirmaciones. La raíz de una ruta es la de `base` más larga que la contiene (`seccionDe` en
  `src/data.js`), porque un home en `$HOME` contiene a todas las demás.

Reglas que **no** se rompen:

- **Los flags son por CLI, nunca una plantilla común.** En codex `-c` es `--config` (TOML), no
  «continuar»; continuar es el subcomando `resume --last`. `agy` usa el paquete `flag` de Go y
  aborta ante un flag desconocido. Verifica contra `--help` antes de tocar `launchers.json`.
- **El modo va inmediatamente tras el binario** (puede ser un subcomando), los toggles después.
- **Comillas simples** en el `cd` (`shellQuote` en `src/data.js`): en dobles, una ruta con `!`
  se expande en silencio. Y el comando es **una línea sin salto final**, o el terminal lo
  ejecutaría al pegarlo.
- **La app nunca ejecuta nada ni emite `llave unlock --force`**, y jamás menciona, define o
  exporta `LLAVE_PIN`. El PIN se teclea en la terminal del usuario.
- La sonda de `GET /api/llave` mira las rutas del manifiesto (`~/.llave/manifiestos/*.txt`),
  **no** el directorio del tmpfs: un `unlock` fallido deja ese directorio creado y daría
  «abierta» en falso. Solo comprueba existencia y tipo; nunca lee contenidos.
- Los toggles con `warn: true` nunca se leen de `localStorage`: arrancan siempre en su `default`
  (hoy `true` en las tres CLIs, por decisión del usuario — el comando los lleva puestos y
  desmarcarlos dura solo esa sesión). Los demás sí se recuerdan.

**Dueño del servidor:** si existe la unidad `rutas-jump.service` (systemd de usuario), ella
manda: `rutas-jump`/`rutas-jump-stop` hacen `systemctl --user start|stop`. En macOS hace lo mismo
el LaunchAgent `~/Library/LaunchAgents/com.rutas-jump.plist` (`launchctl bootstrap|kickstart|bootout`;
la plantilla está en el README).
Sin ninguno de los dos se cae al modo `nohup`+`pkill` de siempre. No mezcles dos dueños del puerto.
Bajo launchd el PATH no trae `/usr/local/bin`: por eso el servidor antepone la carpeta de su `node` al
lanzar `regenerate-rutas.sh`. Y `node` necesita el permiso de macOS para leer la Drive (File Provider):
sin él, la regeneración se queda esperando y, al llegar al tope, se sirve la última versión.

## Mantener actualizado (opcional)

Cron de ejemplo (Linux/ChromeOS), cada 30 min:
```cron
*/30 * * * * /bin/bash "$RUTAS_DIR/regenerate-rutas.sh" >/dev/null 2>&1
```

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `cd-foo: command not found` tras crear carpeta | aliases desactualizados | `rutas-refresh` |
| Una carpeta sale sin alias en el dashboard, o un `cd-*` lleva a una carpeta que ya no existe | aliases desactualizados (recargar solo rehace el dashboard) | botón «Actualizar» del dashboard, o `rutas-refresh` |
| No aparecen aliases en terminal nueva | el rc no sourcea `loader.sh` | re-ejecutar `bash install.sh` |
| `regenerate-rutas.sh` falla con "falta rutas.config.sh" | no instalado | `bash install.sh` |
| El dashboard no abre | falta `node`, o puerto ocupado | instalar Node; `rutas-jump-stop` y reintentar |
