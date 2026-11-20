# 🗂️ rutas-jump

**Salta a cualquier carpeta de tu Google Drive (o de donde sea) desde la terminal — sin
memorizar rutas — y explóralas en un dashboard web local.**

`rutas-jump` escanea una o varias **raíces** (p.ej. My Drive, Unidades Compartidas y carpetas de tu
home) y genera atajos de terminal (`cd-proyectos`, `cd-sd-cliente`, `cd-home-dev`, …) automáticamente.
Cuando creas, mueves o renombras carpetas, los atajos se regeneran solos. Incluye un **dashboard web
local** que agrupa cada raíz en su sección, para ver el árbol completo, copiar rutas y comandos, y
buscar al instante.

Pensado para quien trabaja con un Drive grande y no quiere memorizar comandos que además cambian
cada vez que reorganiza sus carpetas — y para quien no se siente cómodo navegando carpetas a mano
en la terminal.

> Cross-platform: **ChromeOS (Crostini) · macOS · Linux**. **Runtime sin dependencias**: solo `bash`
> y, para el dashboard, `node` — el bundle de la UI viene **precompilado y versionado** en el repo.
> (Solo para *desarrollar* la UI hace falta `npm`; ver [Desarrollar la UI](#-desarrollar-la-ui).)

---

## ✨ Qué hace

- **Atajos `cd-*` autogenerados** — un alias por carpeta de nivel 1 y 2 de tu carpeta base.
  `cd-drive` te lleva a la raíz; `cd-proyectos-cliente` a `proyectos/cliente`.
- **Se regeneran solos** — al crear/mover/renombrar carpetas, el botón **🔄 Actualizar** del dashboard,
  `rutas-refresh` (o un cron) actualiza los atajos. Nunca memorizas una ruta que va a cambiar.
- **Dashboard web local** — UI en **Adobe React Spectrum**. Cada **raíz** (My Drive · Unidades
  Compartidas · Home) es un **nodo de primer nivel** del árbol, con su alias (`cd-drive`/`cd-sd`/…)
  y botones *Copiar ruta* / *cd*, que se expande a su árbol de carpetas. ⭐ favoritos, buscador
  instantáneo, tema claro/oscuro y color de acento configurable. Un único HTML autocontenido y offline.
- **Lanzadores por CLI** — la barra lateral son tus CLIs (Claude Code, agy, codex…). Eliges cómo
  arranca en la banda superior y cada carpeta te da **un solo comando copiable**:
  `cd '<ruta>' && claude -c`. Se definen en `launchers.json`, sin recompilar nada.
- **Directorio de comandos** — secciones de comandos copiables (Claude Code, git, etc.), totalmente
  configurables por ti.
- **Configurable** — tu carpeta base, puerto y branding (título, emoji, color) en un solo archivo.

---

## 🚀 Instalación

```bash
git clone https://github.com/elchamoluso/rutas-jump.git
cd rutas-jump
bash install.sh
```

El instalador:
1. Detecta tu carpeta base (tu Google Drive, si lo encuentra) o te la pregunta.
2. Escribe tu `rutas.config.sh`.
3. Genera los atajos escaneando esa carpeta.
4. Cablea tu `~/.bashrc` o `~/.zshrc` para cargarlos en cada terminal nueva.

Abre una terminal nueva y prueba:

```bash
rutas-help     # lista todos los atajos cd-*
cd-drive       # salta a la raíz de tu carpeta base
rutas-jump      # abre el dashboard en el navegador
```

### Instalación no interactiva

```bash
bash install.sh --base "/ruta/a/tu/carpeta" --yes
```

Flags: `--base DIR · --port N · --title T · --emoji E · --accent "#RRGGBB" · --yes · --no-shell`.

---

## ⚙️ Configuración

Todo vive en `rutas.config.sh` (lo crea `install.sh`; es tuyo, está en `.gitignore`):

```sh
# Multi-raíz: una línea por raíz  →  RUTAS_ROOT_N="etiqueta|path|prefijo|maxdepth|filtro"
#   prefijo vacío = My Drive (alias cd-*, var $DRIVE) · "sd"/"home" = cd-sd-*/cd-home-* y $DRIVE_SD/$DRIVE_HOME
#   filtro: "" (todo el nivel 1) | "whitelist:dev,secrets" (solo esas carpetas)
RUTAS_ROOT_1="My Drive|/mnt/chromeos/GoogleDrive/MyDrive||40|"
RUTAS_ROOT_2="Unidades Compartidas|/mnt/chromeos/GoogleDrive/SharedDrives|sd|6|"
RUTAS_ROOT_3="Linux (home)|$HOME|home|2|whitelist:dev"

RUTAS_BASE="$HOME"      # retro-compat: raíz única si NO hay ningún RUTAS_ROOT_*
RUTAS_START_DIR=""      # dir de arranque del terminal (vacío = $HOME)
RUTAS_PORT="7777"       # puerto del dashboard
RUTAS_TITLE="Rutas"; RUTAS_EMOJI="🗂️"; RUTAS_ACCENT="#0070f3"   # branding
```

Tras editarlo, recarga con `rutas-refresh` o abre una terminal nueva.

### Atajos personales

Copia `custom-aliases.example.sh` a `custom-aliases.sh` (gitignored) y pon tus atajos cortos. Se
cargan **después** de los autogenerados, así que puedes acortar nombres largos. Usa siempre
`$DRIVE/...` para que funcione en cualquier máquina:

```sh
alias cd-cli='cd "$DRIVE/proyectos/cliente-importante/entregables"'
```

### Añadir secciones de comandos al dashboard

Edita `commands.json`. Cada objeto en `categories` es una **sección** del dashboard. Añade la tuya:

```json
{
  "name": "Mis comandos",
  "icon": "🔧",
  "commands": [
    { "cmd": "docker compose up -d", "desc": "Levanta los servicios en segundo plano." }
  ]
}
```

Ejecuta `rutas-jump` (o `rutas-jump-build`) para reflejarlo.

### Añadir una CLI a la barra lateral

Edita `launchers.json`. Cada CLI trae sus `modos` (excluyentes, van justo detrás del binario y
pueden ser un subcomando) y sus `toggles` (acumulativos):

```json
{
  "id": "midcli", "name": "mi-cli", "icon": "🔧", "bin": "mi-cli",
  "modos":   [ { "id": "nueva", "label": "Nueva", "args": "" } ],
  "toggles": [ { "id": "yolo", "label": "Sin confirmar", "args": "--yes", "warn": true } ]
}
```

Verifica los flags contra el `--help` del binario: **no son intercambiables entre CLIs** (en codex
`-c` es `--config`, no «continuar»). Lo marcado con `"warn": true` no se recuerda entre recargas.

### Secciones de comandos propias de una máquina

Lo que solo tenga sentido en **este** equipo va en `commands.local.json` (mismo formato,
está en `.gitignore`). El generador lo fusiona detrás de `commands.json`, así que el repo se
queda genérico y cada entorno añade lo suyo sin ensuciar el proyecto.

### CLIs y lanzadores propios de una máquina

- `RUTAS_CLIS="claude"`: la barra lateral solo muestra esas CLIs de `launchers.json` (ids separados
  por comas; vacío = todas).
- `RUTAS_LANZADOR_<PREFIJO>`: una raíz que se abre con un envoltorio tuyo, no con `cd && claude`.
  Con `RUTAS_ROOT_5="Cliente Acme|/ruta/a/Acme|acme|6|"` y `RUTAS_LANZADOR_ACME="mi-lanzador acme"`,
  el 📋 de sus carpetas copia:

  ```
  mi-lanzador acme 'subcarpeta/relativa' -c
  ```

  Sin `cd` y solo con Claude Code. Tampoco lleva los toggles marcados `warn`, porque el lanzador trae
  sus propias confirmaciones. El envoltorio debe aceptar `[subcarpeta] [argumentos de claude…]`.

### Entornos que cifran sus credenciales

Si la máquina guarda sus tokens en una bóveda —por ejemplo con
[`llave`](https://github.com/elchamoluso/llave-usb), que los cifra en un pendrive con PIN y los
descifra a RAM— pon el ámbito en `RUTAS_LLAVE_AMBITO` (en `rutas.config.sh`). A partir de ahí el
dashboard **se adapta solo**:

- Una nota arriba con el estado real de la bóveda: abierta, cerrada, sin pendrive, o con
  credenciales **sin cifrar** en el disco.
- Mientras el ámbito no esté abierto, el comando que copias llega con el desbloqueo delante —
  las CLIs leen sus tokens **al arrancar**, no después:

  ```
  llave unlock personal && cd '/ruta/al/proyecto' && claude -c
  ```

  Si el desbloqueo falla, el `&&` corta y la CLI no arranca a ciegas sin credenciales.

Con `RUTAS_LLAVE_AMBITO` vacío (el valor por defecto) no aparece ninguna nota ni ningún prefijo:
es un dashboard de rutas normal. El PIN se teclea siempre en tu terminal; la app nunca lo pide,
no ejecuta nada y no toca tus secretos: para saber el estado solo comprueba **si existen** los
ficheros del manifiesto, nunca su contenido.

---

## 🖥️ El dashboard

| Comando | Acción |
|---|---|
| `rutas-jump` | Regenera, sirve y abre el dashboard en el navegador |
| `rutas-jump-stop` | Detiene el servidor |
| `rutas-jump-build` | Solo regenera el HTML (sin servir) — **solo node** |
| `rutas-jump-rebuild` | Recompila el bundle React Spectrum desde `src/` — **solo para desarrollar la UI (requiere npm)** |

Se sirve por `http://localhost:7777`, **solo en loopback** (`RUTAS_HOST=0.0.0.0` si de verdad
necesitas alcanzarlo desde otra máquina). Por HTTP y no `file://` porque el navegador del host de
ChromeOS no puede abrir ficheros del contenedor Linux; en macOS/Linux funciona igual. `localhost`
además es *secure context*, que es lo que necesita el portapapeles. Requiere `node`.

Cada carga de la página regenera el dashboard, así que **recargar = carpetas al día**. El botón
**🔄 Actualizar** de la barra lateral regenera además los alias `cd-*` (`regenerate-rutas.sh`) y recarga.
Las terminales ya abiertas cogen los alias nuevos con `rutas-refresh`.

Si existe una unidad `rutas-jump.service` (systemd de usuario), **ella** es la dueña del servidor y
`rutas-jump`/`rutas-jump-stop` hacen `systemctl --user start|stop`. En macOS hace lo mismo un LaunchAgent
`~/Library/LaunchAgents/com.rutas-jump.plist` (`launchctl`). Sin ninguno se cae al modo `nohup`+`pkill`
de siempre.

### Servidor permanente en macOS (opcional)

Para que el servidor arranque solo al iniciar sesión, crea `~/Library/LaunchAgents/com.rutas-jump.plist`
con este contenido. Cambia `/ruta/a/node` por la de tu `node` (`command -v node`; con Homebrew en Apple
Silicon suele ser `/opt/homebrew/bin/node`) y `/ruta/a/rutas-jump` por la del repo:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.rutas-jump</string>
  <key>ProgramArguments</key>
  <array>
    <string>/ruta/a/node</string>
    <string>/ruta/a/rutas-jump/serve-dashboard.js</string>
  </array>
  <key>WorkingDirectory</key><string>/ruta/a/rutas-jump</string>
  <key>RunAtLoad</key><true/>
  <!-- Como Restart=on-failure: con el puerto ocupado el servidor sale con 0 y no debe reintentar -->
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>/ruta/a/rutas-jump/.serve.log</string>
  <key>StandardErrorPath</key><string>/ruta/a/rutas-jump/.serve.log</string>
</dict>
</plist>
```

Cárgalo con `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.rutas-jump.plist`. Desde ahí,
`rutas-jump` y `rutas-jump-stop` lo usan solos.

- Si tus raíces están en Google Drive, macOS pide permiso para que `node` lea sus archivos. Sin él, la
  regeneración se queda esperando y, al vencer el tope, se sirve la última versión.
- Tras actualizar `serve-dashboard.js`, reinícialo: `launchctl kickstart -k gui/$(id -u)/com.rutas-jump`.

---

## 🎨 Desarrollar la UI

La interfaz del dashboard es una app **React + Adobe React Spectrum** en `src/`. Se compila con
**esbuild** a un único bundle autocontenido `ui/dashboard.bundle.js` (todo el CSS de Spectrum va
inline; cero CDN, 100 % offline). **Ese bundle se versiona en el repo**: por eso el uso normal solo
necesita `node` — `generate-dashboard.js` se limita a inyectar el bundle commiteado + los datos del
escaneo (`window.DATA`) en `dashboard.template.html`.

```bash
npm install        # una sola vez (trae react + @adobe/react-spectrum + esbuild)
npm run build      # recompila ui/dashboard.bundle.js   (o: rutas-jump-rebuild)
npm run build:watch  # rebuild incremental mientras editas src/
```

Tras tocar `src/`, **recompila y commitea `ui/dashboard.bundle.js`** — editar `src/` sin recompilar
no cambia nada (el dashboard usa el bundle commiteado). Nunca edites `dashboard.html` (generado) ni
`ui/dashboard.bundle.js` (compilado) a mano.

---

## 🔄 Mantener actualizado automáticamente (opcional)

Añade a tu `crontab -e` (Linux/ChromeOS) para regenerar cada 30 minutos:

```cron
*/30 * * * * /bin/bash "/ruta/a/rutas-jump/regenerate-rutas.sh" >/dev/null 2>&1
```

Sin cron (en macOS, por ejemplo), basta con el botón **🔄 Actualizar** del dashboard o con
`rutas-refresh` cuando reorganices carpetas.

---

## 🧭 Notas por plataforma

- **ChromeOS (Crostini):** base habitual `/mnt/chromeos/GoogleDrive/MyDrive`. El dashboard se abre en
  el Chromium **del contenedor** vía `localhost`. Para tenerlo como app con ventana propia e icono
  en el lanzador: una unidad `systemd --user` que mantenga el servidor en pie y un `.desktop` que
  espere al `/health` y abra `chromium --app=http://localhost:7777`. Una PWA instalada desde el
  Chrome del host **no** sirve: si el contenedor está apagado, esa ventana no lo levanta.
- **macOS:** base habitual `~/Library/CloudStorage/GoogleDrive-<cuenta>/<Mi unidad>` (el nombre de la
  raíz depende del idioma del sistema). `install.sh` lo autodetecta.
- **Linux:** cualquier carpeta o un Drive montado con rclone/insync.

---

## 📁 Estructura del proyecto

```
install.sh              Instalador cross-platform
loader.sh               Punto de entrada (lo sourcea tu shell rc)
regenerate-rutas.sh     Escanea la base → genera los aliases cd-*
rutas.lib.sh            Funciones (rutas-jump, rutas-help, rutas-refresh…)
generate-dashboard.js   Inyecta datos + bundle en dashboard.html (Node, runtime sin npm)
serve-dashboard.js      Sirve el dashboard por HTTP (Node, runtime sin npm)
dashboard.template.html Shell mínimo: #root + markers /*__DATA__*/ y /*__BUNDLE__*/
src/                    UI React + React Spectrum (edítala aquí)
build.js                esbuild: src/ → ui/dashboard.bundle.js (build-time, npm)
ui/dashboard.bundle.js  Bundle precompilado y VERSIONADO (lo que realmente se sirve)
package.json            Deps build-time (react, @adobe/react-spectrum, esbuild)
commands.json           Secciones de comandos copiables (edítalo)
launchers.json          Las CLIs de la barra lateral y sus modificadores (edítalo)
rutas.config.example.sh Plantilla de configuración
custom-aliases.example.sh Plantilla de atajos personales
AGENTS.md               Notas para agentes AI
```

---

## 📝 Licencia

[MIT](LICENSE) · Hecho por **Jesús Ferreira** ([@elchamoluso](https://github.com/elchamoluso)).
