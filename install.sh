#!/usr/bin/env bash
# install.sh — instalador de rutas-jump (ChromeOS · macOS · Linux).
#
# Qué hace:
#   1) Detecta tu carpeta base (tu Google Drive, o la que indiques) y tu shell.
#   2) Escribe rutas.config.sh con tu configuración.
#   3) Genera los aliases cd-* (rutas.generated.sh) escaneando esa carpeta.
#   4) Cablea tu ~/.bashrc o ~/.zshrc para cargarlo en cada terminal nueva.
#
# Uso interactivo:     bash install.sh
# Uso no interactivo:  bash install.sh --base /ruta/a/carpeta --yes
#
# Flags:
#   --base DIR     Carpeta base a escanear (si se omite, se autodetecta/pregunta).
#   --port N       Puerto del dashboard (def. 7777).
#   --title T      Título del dashboard (def. "Rutas").
#   --emoji E      Emoji/logo del dashboard (def. 🗂️).
#   --accent C     Color de acento, p.ej. "#0070f3".
#   --yes          No preguntar; usa lo detectado/los flags.
#   --no-shell     No tocar ~/.bashrc / ~/.zshrc (solo config + generar).
#   --help         Muestra esta ayuda.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CONFIG="$REPO_DIR/rutas.config.sh"

# ---------- valores por defecto / previos ----------
RUTAS_BASE=""; RUTAS_PORT="7777"; RUTAS_TITLE="Rutas"; RUTAS_EMOJI="🗂️"; RUTAS_ACCENT="#0070f3"
# Si re-instalas, parte de tus valores actuales.
# shellcheck source=/dev/null
[ -f "$CONFIG" ] && . "$CONFIG"

# ---------- flags ----------
print_help() { awk 'NR>1 && /^#/{sub(/^# ?/,"");print;next} NR>1{exit}' "$0"; }
ASSUME_YES=false; DO_SHELL=true; BASE_FROM_FLAG=false
while [ $# -gt 0 ]; do
    case "$1" in
        --base)   RUTAS_BASE="${2:?--base requiere una ruta}"; BASE_FROM_FLAG=true; shift 2 ;;
        --port)   RUTAS_PORT="${2:?--port requiere un número}"; shift 2 ;;
        --title)  RUTAS_TITLE="${2:?--title requiere un texto}"; shift 2 ;;
        --emoji)  RUTAS_EMOJI="${2:?--emoji requiere un valor}"; shift 2 ;;
        --accent) RUTAS_ACCENT="${2:?--accent requiere un color}"; shift 2 ;;
        --yes|-y) ASSUME_YES=true; shift ;;
        --no-shell) DO_SHELL=false; shift ;;
        --help|-h) print_help; exit 0 ;;
        *) echo "Flag desconocido: $1" >&2; exit 2 ;;
    esac
done

echo "rutas-jump · instalador"
echo "  repo: $REPO_DIR"

# ---------- detectar carpeta base ----------
detect_base() {
    local c acct root
    # ChromeOS / Crostini
    [ -d "/mnt/chromeos/GoogleDrive/MyDrive" ] && { echo "/mnt/chromeos/GoogleDrive/MyDrive"; return; }
    # macOS — Google Drive vía CloudStorage (GoogleDrive-<cuenta>/<raíz localizada>)
    if [ -d "$HOME/Library/CloudStorage" ]; then
        for acct in "$HOME"/Library/CloudStorage/GoogleDrive-*/; do
            [ -d "$acct" ] || continue
            for root in "$acct"*/; do
                [ -d "$root" ] || continue
                case "$(basename "$root")" in
                    "My Drive"|"Mi unidad"|"O meu disco"|"Meu Drive"|"Mon Drive"|"Il mio Drive"|"Mein Drive")
                        echo "${root%/}"; return ;;
                esac
            done
            for root in "$acct"*/; do [ -d "$root" ] && { echo "${root%/}"; return; }; done
        done
    fi
    # Linux — ubicaciones comunes
    for c in "$HOME/GoogleDrive" "$HOME/Google Drive" "$HOME/gdrive"; do
        [ -d "$c" ] && { echo "$c"; return; }
    done
    echo ""
}

# Si la base heredada de una config previa ya no existe (carpeta movida) y no se pasó --base,
# vacíala para volver a autodetectar en lugar de fallar.
if [ -n "$RUTAS_BASE" ] && [ ! -d "$RUTAS_BASE" ] && [ "$BASE_FROM_FLAG" != true ]; then
    RUTAS_BASE=""
fi
if [ -z "$RUTAS_BASE" ]; then
    RUTAS_BASE="$(detect_base)"
fi

if [ "$ASSUME_YES" != true ] && [ -t 0 ]; then
    if [ -n "$RUTAS_BASE" ]; then
        printf "→ Carpeta base a navegar [%s]: " "$RUTAS_BASE"
    else
        printf "→ Carpeta base a navegar (ruta absoluta): "
    fi
    read -r reply
    [ -n "$reply" ] && RUTAS_BASE="$reply"
fi

# Expande ~ inicial por si lo escribieron a mano.
case "$RUTAS_BASE" in "~"|"~/"*) RUTAS_BASE="$HOME${RUTAS_BASE#\~}" ;; esac

if [ -z "$RUTAS_BASE" ]; then
    echo "✗ No se indicó carpeta base. Pásala con --base /ruta o ejecuta sin --yes." >&2
    exit 1
fi
if [ ! -d "$RUTAS_BASE" ]; then
    echo "✗ La carpeta no existe: $RUTAS_BASE" >&2
    echo "  (¿Google Drive montado? Revisa la ruta.)" >&2
    exit 1
fi
echo "  base: $RUTAS_BASE"

# ---------- escribir config ----------
# Preserva tus líneas multi-raíz / arranque (RUTAS_ROOT_*, RUTAS_START_DIR) entre re-instalaciones.
PRESERVE=""
[ -f "$CONFIG" ] && PRESERVE="$(grep -E '^[[:space:]]*(RUTAS_ROOT_[0-9]+|RUTAS_START_DIR)=' "$CONFIG" 2>/dev/null || true)"
cat > "$CONFIG" <<EOF
# rutas.config.sh — configuración local (generado por install.sh; edítalo libremente).
# Está en .gitignore: es tuyo, no se publica.
RUTAS_BASE="$RUTAS_BASE"
RUTAS_PORT="$RUTAS_PORT"
RUTAS_TITLE="$RUTAS_TITLE"
RUTAS_EMOJI="$RUTAS_EMOJI"
RUTAS_ACCENT="$RUTAS_ACCENT"
EOF
if [ -n "$PRESERVE" ]; then
    { echo ""; echo "# Multi-raíz / arranque (preservado de tu config previa; edítalo a mano)."; printf '%s\n' "$PRESERVE"; } >> "$CONFIG"
fi
echo "  ✓ Escrito rutas.config.sh"

# ---------- generar aliases ----------
echo "→ Generando aliases (escaneando la carpeta base)…"
bash "$REPO_DIR/regenerate-rutas.sh" || { echo "✗ Fallo al generar aliases; revisa RUTAS_BASE en $CONFIG" >&2; exit 1; }

# ---------- cablear el shell ----------
if [ "$DO_SHELL" = true ]; then
    case "${SHELL:-}" in
        */zsh) RC="$HOME/.zshrc" ;;
        */bash) RC="$HOME/.bashrc" ;;
        *) if [ -n "${ZSH_VERSION:-}" ]; then RC="$HOME/.zshrc"; else RC="$HOME/.bashrc"; fi ;;
    esac
    touch "$RC"
    # Backup del rc original SOLO la primera vez (no clobberear en re-instalaciones).
    [ -f "$RC.rutasjump.bak" ] || [ -f "$RC.drivejump.bak" ] || cp "$RC" "$RC.rutasjump.bak" 2>/dev/null || true

    # Quita el bloque previo (marcadores drive-jump O rutas-jump, para limpiar el legacy
    # sin dejar huérfanos) y las líneas 'source' del sistema antiguo. Acotado para no borrar
    # líneas legítimas del usuario.
    TMP_RC="$(mktemp)"
    awk '
        /# >>> (drive|rutas)-jump >>>/ {skip=1}
        skip==1 { if (/# <<< (drive|rutas)-jump <<</) skip=0; next }
        /^[[:space:]]*(source|\.|\[).*\/(rutas|mac-rutas)\.sh/ {next}
        /^# Aliases de carpetas Google Drive/ {next}
        {print}
    ' "$RC" > "$TMP_RC"
    # cat (no mv) para preservar inode/modo/propietario del rc original.
    cat "$TMP_RC" > "$RC"
    rm -f "$TMP_RC"

    {
        echo ""
        echo "# >>> rutas-jump >>>"
        echo "export RUTAS_DIR=\"$REPO_DIR\""
        echo "[ -f \"\$RUTAS_DIR/loader.sh\" ] && . \"\$RUTAS_DIR/loader.sh\""
        echo "# <<< rutas-jump <<<"
    } >> "$RC"
    echo "  ✓ Cableado $RC (backup en $RC.rutasjump.bak)"
else
    echo "  (--no-shell: no se tocó ningún rc)"
fi

cat <<EOF

✓ Instalación completa.

  Abre una terminal NUEVA (o ejecuta:  source "$REPO_DIR/loader.sh" )
  y prueba:
    rutas-help        # lista todos los atajos cd-*
    cd-drive          # salta a la raíz de tu carpeta base
    rutas-web         # abre el dashboard web en el navegador

  Atajos personales: copia custom-aliases.example.sh a custom-aliases.sh y edítalo.
  Mantén actualizado automáticamente (opcional) añadiendo a tu crontab:
    */30 * * * * /bin/bash "$REPO_DIR/regenerate-rutas.sh" >/dev/null 2>&1
EOF
