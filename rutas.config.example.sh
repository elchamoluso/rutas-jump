# rutas.config.example.sh — plantilla de configuración.
#
# Copia este archivo a  rutas.config.sh  y edítalo (install.sh lo crea por ti).
# rutas.config.sh está en .gitignore: es TUYO, no se publica.
#
# Lo leen tanto los scripts de shell (lo sourcean) como el generador de Node,
# así que mantén el formato simple  CLAVE="valor".

# --- Raíces a navegar (multi-raíz) -------------------------------------------
# Una línea por raíz:  RUTAS_ROOT_N="etiqueta|path|prefijo|maxdepth|filtro"
#   etiqueta : cabecera que se muestra en el dashboard (p.ej. "My Drive").
#   path     : ruta ABSOLUTA de la base (admite ~ y $HOME).
#   prefijo  : prefijo de los alias cd-* y nombre de la var base.
#              vacío  → My Drive: alias sin prefijo (cd-<carpeta>) y var $DRIVE  (compat).
#              "sd"   → alias cd-sd-* y var $DRIVE_SD.   "home" → cd-home-* y $DRIVE_HOME.
#   maxdepth : profundidad de escaneo del dashboard (los alias cd-* siempre son nivel 1-2).
#   filtro   : ""  (escanea todo el nivel 1)  |  "whitelist:dev,secrets" (solo esas)  |  "blacklist:LusoMagnet" (todas menos esas).
#
# Ejemplo ChromeOS/Crostini (este equipo):
RUTAS_ROOT_1="My Drive|/mnt/chromeos/GoogleDrive/MyDrive||40|"
RUTAS_ROOT_2="Unidades Compartidas|/mnt/chromeos/GoogleDrive/SharedDrives|sd|6|"
RUTAS_ROOT_3="Linux (home)|$HOME|home|2|whitelist:dev"
#
# Ejemplo macOS (ajusta a tus rutas — la Mac necesita su propio rutas.config.sh):
#   RUTAS_ROOT_1="My Drive|$HOME/Library/CloudStorage/GoogleDrive-TUCORREO@gmail.com/My Drive||40|"
#   RUTAS_ROOT_2="Unidades Compartidas|$HOME/Library/CloudStorage/GoogleDrive-TUCORREO@gmail.com/Shared drives|sd|6|"
#   RUTAS_ROOT_3="Linux (home)|$HOME|home|2|whitelist:dev"

# --- Retro-compat: raíz única (se usa SOLO si no hay ningún RUTAS_ROOT_*) -----
RUTAS_BASE="$HOME"

# --- Directorio de arranque de la terminal -----------------------------------
# Vacío = $HOME (comportamiento estándar). Pon una ruta para abrir siempre ahí.
RUTAS_START_DIR=""

# --- Bóveda de credenciales (OPCIONAL, según el entorno) ---------------------
# Déjalo VACÍO si esta máquina no cifra sus credenciales: el dashboard se comporta como un
# dashboard de rutas normal, sin nota ni prefijos.
#
# Si SÍ las cifra —p.ej. con `llave` (github.com/elchamoluso/llave-usb), que guarda los tokens
# en un pendrive + PIN y los descifra a RAM— pon aquí el ÁMBITO que hay que abrir. Entonces:
#
#   1. El dashboard consulta el estado real de la bóveda (GET /api/llave) y muestra una nota
#      arriba: abierta, cerrada, sin pendrive, o con credenciales sin cifrar en el disco.
#   2. Mientras ese ámbito no esté abierto, el comando que copias de cada carpeta llega ya con
#      el desbloqueo delante, porque las CLIs leen sus tokens AL ARRANCAR:
#
#        llave unlock personal && cd '/ruta/al/proyecto' && claude -c
#
#      Si el unlock falla, el `&&` corta y la CLI no arranca a ciegas sin credenciales.
#      El PIN se teclea en tu terminal: la app nunca lo pide ni lo toca.
#
# Es propiedad de la MÁQUINA, no de cada CLI, por eso vive aquí y no en launchers.json.
RUTAS_LLAVE_AMBITO=""

# --- CLIs de la barra lateral (OPCIONAL) --------------------------------------
# Ids de launchers.json que usa esta máquina, separados por comas. Vacío = todas.
RUTAS_CLIS=""

# --- Lanzador propio por raíz (OPCIONAL) --------------------------------------
# Si una raíz no se abre con `cd && claude` sino con un envoltorio tuyo que ya hace el cd y
# carga su propia configuración, decláralo con el PREFIJO de la raíz en mayúsculas:
#
#   RUTAS_ROOT_5="Cliente Acme|/ruta/a/Acme|acme|6|"
#   RUTAS_LANZADOR_ACME="mi-lanzador acme"
#
# El 📋 de esa raíz copia entonces  mi-lanzador acme '<subcarpeta relativa>' <modo> <toggles>:
# sin `cd`, solo con Claude Code (con otra CLI esa raíz no tiene comando) y SIN los toggles
# marcados `warn` (--dangerously-skip-permissions…), porque el lanzador trae sus confirmaciones.
# El lanzador debe aceptar  [subcarpeta] [argumentos de claude…].

# --- Puerto del dashboard web local ------------------------------------------
RUTAS_PORT="7777"

# --- Branding del dashboard (opcional) ---------------------------------------
RUTAS_TITLE="Rutas"
RUTAS_EMOJI="🗂️"
RUTAS_ACCENT="#0070f3"
