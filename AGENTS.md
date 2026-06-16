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
| `rutas.lib.sh` | Funciones: `rutas-web`, `rutas-web-stop`, `rutas-web-build`, `rutas-help`, `rutas-refresh` | Estable |
| `custom-aliases.sh` | Atajos personales del usuario (override de los autogenerados) | Manual · **gitignored** |
| `generate-dashboard.js` | Escanea base + parsea aliases + comandos → `dashboard.html` (Node, cero deps) | Estable |
| `serve-dashboard.js` | Sirve `dashboard.html` por HTTP (Node, cero deps) | Estable |
| `dashboard.template.html` | Plantilla UI (placeholder `/*__DATA__*/`) | Editar para cambiar la UI |
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

`generate-dashboard.js` escanea la base, parsea los aliases de `rutas.generated.sh` +
`custom-aliases.sh`, lee `commands.json` y el branding de `rutas.config.sh`, inyecta todo en
`dashboard.template.html` y escribe `dashboard.html` de forma atómica. `serve-dashboard.js` lo sirve
por HTTP (en ChromeOS es imprescindible: el Chrome del host no abre `file://` del contenedor Linux).

- **Abrir:** `rutas-web` (regenera, sirve y abre el navegador). `rutas-web-stop` detiene; `rutas-web-build` solo regenera.
- **Botón "Actualizar ahora":** visible al servir por HTTP; llama a `GET /api/regenerate` y recarga.

**Para AIs:** si creas/borras/renombras carpetas o editas `commands.json`, ejecuta
`node "$RUTAS_DIR/generate-dashboard.js"` para reflejarlo. Edita la UI en `dashboard.template.html`,
nunca en `dashboard.html` (se sobrescribe).

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
