#!/usr/bin/env bash
# rutas.lib.sh — funciones de la herramienta (dashboard web + helpers).
# Lo sourcea loader.sh. Usa $RUTAS_DIR (carpeta del repo) y $RUTAS_PORT.

# Lista todos los aliases cd-* con su destino.
rutas-help() {
    alias | grep "alias cd-" | sed "s/alias //;s/='cd /  →  /;s/\"\$DRIVE/\$DRIVE/;s/\"'\$//"
}

# Re-escanea la carpeta base y recarga los aliases en la sesión actual.
rutas-refresh() {
    bash "$RUTAS_DIR/regenerate-rutas.sh" || return 1
    # shellcheck source=/dev/null
    [ -f "$RUTAS_DIR/rutas.generated.sh" ] && . "$RUTAS_DIR/rutas.generated.sh"
    [ -f "$RUTAS_DIR/custom-aliases.sh" ]  && . "$RUTAS_DIR/custom-aliases.sh"
    echo "✓ Rutas actualizadas"
}

# Regenera el dashboard, arranca el servidor local y lo abre en el navegador.
# (En ChromeOS el Chrome no puede abrir file:// del contenedor, por eso se sirve por http.)
rutas-web() {
    local dir="$RUTAS_DIR"
    local port="${RUTAS_PORT:-7777}"
    command -v node >/dev/null 2>&1 || { echo "✗ node no está instalado" >&2; return 1; }
    node "$dir/generate-dashboard.js" || { echo "✗ fallo al generar el dashboard" >&2; return 1; }
    # Arranca el servidor en segundo plano (si ya hay uno en el puerto, la 2ª instancia sale sola)
    RUTAS_PORT="$port" nohup node "$dir/serve-dashboard.js" >"$dir/.serve.log" 2>&1 & disown 2>/dev/null
    sleep 1
    local url="http://localhost:$port"
    echo "→ Abre en el navegador:  $url"
    [ "$(uname)" = "Linux" ] && echo "  (ChromeOS, si no abre:   http://penguin.linux.test:$port )"
    if command -v xdg-open >/dev/null 2>&1; then xdg-open "$url" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then open "$url"; fi
}

# Detiene el servidor del dashboard.
rutas-web-stop() {
    pkill -f "serve-dashboard.js" >/dev/null 2>&1 && echo "✓ servidor detenido" || echo "(no había servidor corriendo)"
}

# Solo regenera el HTML del dashboard (sin servir ni abrir).
rutas-web-build() {
    command -v node >/dev/null 2>&1 || { echo "✗ node no está instalado" >&2; return 1; }
    node "$RUTAS_DIR/generate-dashboard.js"
}
