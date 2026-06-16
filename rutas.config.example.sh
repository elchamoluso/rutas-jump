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
#   filtro   : ""  (escanea todo el nivel 1)  |  "whitelist:dev,secrets" (solo esas carpetas).
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

# --- Puerto del dashboard web local ------------------------------------------
RUTAS_PORT="7777"

# --- Branding del dashboard (opcional) ---------------------------------------
RUTAS_TITLE="Rutas"
RUTAS_EMOJI="🗂️"
RUTAS_ACCENT="#0070f3"
