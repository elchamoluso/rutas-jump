#!/usr/bin/env bash
# rutas.lib.sh — funciones de la herramienta (dashboard web + helpers).
# Lo sourcea loader.sh. Usa $RUTAS_DIR (carpeta del repo) y $RUTAS_PORT.

# Lista todos los aliases cd-* con su destino.
rutas-help() {
    alias | grep "alias cd-" | sed "s/alias //;s/='cd /  →  /;s/\"\$DRIVE/\$DRIVE/;s/\"'\$//"
}

# Re-escanea las raíces y recarga los aliases en la sesión actual. Antes quita los cd-* que definían
# rutas.generated.sh y custom-aliases.sh ANTES de regenerar: si no, los de carpetas renombradas o
# borradas seguirían vivos hasta cerrar la terminal. Los cd-* que vengan de otro sitio (tu .zshrc,
# otra herramienta) no se tocan. El bucle va con <<< y no con una tubería: en bash, una tubería lo
# correría en un subshell y el unalias no llegaría a esta terminal.
rutas-refresh() {
    local viejos a
    viejos="$(sed -n 's/^alias \(cd-[^=]*\)=.*/\1/p' "$RUTAS_DIR/rutas.generated.sh" "$RUTAS_DIR/custom-aliases.sh" 2>/dev/null)"
    bash "$RUTAS_DIR/regenerate-rutas.sh" || return 1
    while read -r a; do [ -n "$a" ] && unalias "$a" 2>/dev/null; done <<< "$viejos"
    # shellcheck source=/dev/null
    [ -f "$RUTAS_DIR/rutas.generated.sh" ] && . "$RUTAS_DIR/rutas.generated.sh"
    [ -f "$RUTAS_DIR/custom-aliases.sh" ]  && . "$RUTAS_DIR/custom-aliases.sh"
    echo "✓ Rutas actualizadas"
}

# ¿Está instalada la unidad systemd de usuario? Si lo está, ELLA es la dueña del servidor y
# nadie más lo arranca ni lo mata a mano (si no, habría dos dueños del puerto: un pkill
# mataría el proceso y systemd lo respawnearía). En macOS no hay systemctl: modo nohup.
_rutas_tiene_unidad() {
    command -v systemctl >/dev/null 2>&1 && systemctl --user cat rutas-jump.service >/dev/null 2>&1
}

# En macOS, el equivalente es el LaunchAgent com.rutas-jump (arranca al iniciar sesión).
_rutas_tiene_launchd() {
    [ -f "$HOME/Library/LaunchAgents/com.rutas-jump.plist" ] && command -v launchctl >/dev/null 2>&1
}

# Espera a que el servidor responda antes de abrir la ventana (el navegador en modo app no
# reintenta si llega demasiado pronto).
_rutas_espera_health() {
    local port="$1" i
    for i in $(seq 60); do
        curl -sf -o /dev/null "http://localhost:$port/health" && return 0
        sleep 0.25
    done
    return 1
}

# Regenera el dashboard, arranca el servidor local y lo abre en el navegador.
# (En ChromeOS el Chrome del host no puede abrir file:// del contenedor, por eso se sirve por http.)
rutas-jump() {
    local dir="$RUTAS_DIR"
    local port="${RUTAS_PORT:-7777}"
    command -v node >/dev/null 2>&1 || { echo "✗ node no está instalado" >&2; return 1; }
    node "$dir/generate-dashboard.js" || { echo "✗ fallo al generar el dashboard" >&2; return 1; }

    if _rutas_tiene_unidad; then
        systemctl --user start rutas-jump.service || { echo "✗ no arrancó rutas-jump.service" >&2; return 1; }
    elif _rutas_tiene_launchd; then
        launchctl print "gui/$(id -u)/com.rutas-jump" >/dev/null 2>&1 \
            || launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.rutas-jump.plist" \
            || { echo "✗ no arrancó com.rutas-jump (launchctl bootstrap)" >&2; return 1; }
        launchctl kickstart "gui/$(id -u)/com.rutas-jump" >/dev/null 2>&1
    else
        # Sin unidad: como siempre. Si ya hay uno en el puerto, la 2ª instancia sale sola.
        RUTAS_PORT="$port" nohup node "$dir/serve-dashboard.js" >"$dir/.serve.log" 2>&1 & disown 2>/dev/null
    fi

    _rutas_espera_health "$port" || { echo "✗ el servidor no respondió en el puerto $port" >&2; return 1; }
    local url="http://localhost:$port"
    echo "→ Abre en el navegador:  $url"
    if command -v xdg-open >/dev/null 2>&1; then xdg-open "$url" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then open "$url"; fi
}

# Detiene el servidor del dashboard.
rutas-jump-stop() {
    if _rutas_tiene_unidad; then
        systemctl --user stop rutas-jump.service && echo "✓ servicio detenido"
    elif _rutas_tiene_launchd; then
        launchctl bootout "gui/$(id -u)/com.rutas-jump" 2>/dev/null && echo "✓ servicio detenido (vuelve al iniciar sesión o con rutas-jump)" || echo "(no había servidor corriendo)"
    else
        pkill -f "serve-dashboard.js" >/dev/null 2>&1 && echo "✓ servidor detenido" || echo "(no había servidor corriendo)"
    fi
}

# Solo regenera el HTML del dashboard (sin servir ni abrir).
rutas-jump-build() {
    command -v node >/dev/null 2>&1 || { echo "✗ node no está instalado" >&2; return 1; }
    node "$RUTAS_DIR/generate-dashboard.js"
}

# rutas-jump-rebuild — SOLO para desarrollar la UI (requiere npm, build-time).
# Recompila el bundle React Spectrum (ui/dashboard.bundle.js) desde src/ y regenera
# el dashboard. El uso normal (rutas-jump / rutas-jump-build / cron) NO necesita npm:
# basta el bundle ya commiteado. Tras recompilar, recuerda commitear el bundle.
# `npm ci` y no `npm install`: clava las versiones del lock. React Spectrum 3.47.1 es la
# versión contra la que están verificados a mano el workaround del SlotProvider del TreeView
# (components/RouteActions.jsx) y el hack de altura de fila de theme.js; un minor nuevo los
# rompe en silencio.
rutas-jump-rebuild() {
    command -v npm >/dev/null 2>&1 || { echo "✗ npm no está instalado (solo hace falta para desarrollar la UI)" >&2; return 1; }
    ( cd "$RUTAS_DIR" && npm ci && npm run build ) || return 1
    echo "✓ ui/dashboard.bundle.js recompilado — recuerda: git add ui/dashboard.bundle.js && git commit"
    node "$RUTAS_DIR/generate-dashboard.js"
}

# Nombres antiguos (la herramienta se llamaba rutas-web). Se mantienen para no romper
# memoria muscular ni scripts viejos.
rutas-web()         { rutas-jump "$@"; }
rutas-web-stop()    { rutas-jump-stop "$@"; }
rutas-web-build()   { rutas-jump-build "$@"; }
rutas-web-rebuild() { rutas-jump-rebuild "$@"; }
