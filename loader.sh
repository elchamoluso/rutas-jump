#!/usr/bin/env bash
# loader.sh — punto de entrada de rutas-jump.
# Lo sourcea tu ~/.bashrc (bash) o ~/.zshrc (zsh). install.sh lo cablea por ti.
#
# Orden de carga:
#   1) rutas.config.sh        → tu configuración (RUTAS_BASE, RUTAS_PORT, branding)
#   2) rutas.generated.sh     → aliases cd-* autogenerados (export DRIVE + cd-*)
#   3) rutas.lib.sh           → funciones de la herramienta (rutas-web, rutas-help…)
#   4) custom-aliases.sh      → tus atajos personales (opcional)

# Carpeta del repo. install.sh exporta RUTAS_DIR en el rc; si no, se autodetecta.
if [ -z "${RUTAS_DIR:-}" ]; then
    if [ -n "${BASH_SOURCE:-}" ]; then
        RUTAS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    else
        # zsh y otros shells exponen $0 como la ruta del archivo sourceado
        RUTAS_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
    fi
fi
export RUTAS_DIR

[ -f "$RUTAS_DIR/rutas.config.sh" ] && . "$RUTAS_DIR/rutas.config.sh"
export RUTAS_PORT="${RUTAS_PORT:-7777}"

[ -f "$RUTAS_DIR/rutas.generated.sh" ] && . "$RUTAS_DIR/rutas.generated.sh"
[ -f "$RUTAS_DIR/rutas.lib.sh" ]       && . "$RUTAS_DIR/rutas.lib.sh"
[ -f "$RUTAS_DIR/custom-aliases.sh" ]  && . "$RUTAS_DIR/custom-aliases.sh"
