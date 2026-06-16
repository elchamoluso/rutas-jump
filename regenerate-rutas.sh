#!/usr/bin/env bash
# regenerate-rutas.sh — escanea las raíces (RUTAS_ROOT_*) y regenera rutas.generated.sh
# con los aliases cd-* actualizados. Cross-platform (ChromeOS, macOS, Linux).
#
# Las raíces se leen de rutas.config.sh:
#   RUTAS_ROOT_N="etiqueta|path|prefijo|maxdepth|filtro"   (filtro: "" | "whitelist:a,b")
# Retro-compat: si no hay RUTAS_ROOT_*, se usa RUTAS_BASE como raíz única (sin prefijo).
# Ejecutar:  bash regenerate-rutas.sh      ·      o vía función:  rutas-refresh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CONFIG="$SCRIPT_DIR/rutas.config.sh"

if [ ! -f "$CONFIG" ]; then
    echo "ERROR: falta $CONFIG" >&2
    echo "  Ejecuta primero:  bash \"$SCRIPT_DIR/install.sh\"" >&2
    exit 1
fi
# shellcheck source=/dev/null
. "$CONFIG"

OUT="$SCRIPT_DIR/rutas.generated.sh"

# --- Recolectar las raíces (RUTAS_ROOT_1, _2, …) o caer a RUTAS_BASE ---
roots=()
i=1
while :; do
    var="RUTAS_ROOT_$i"
    val="${!var:-}"
    [ -z "$val" ] && break
    roots+=("$val")
    i=$((i + 1))
done
if [ ${#roots[@]} -eq 0 ] && [ -n "${RUTAS_BASE:-}" ]; then
    roots+=("Drive|$RUTAS_BASE||40|")
fi
if [ ${#roots[@]} -eq 0 ]; then
    echo "ERROR: ni RUTAS_ROOT_* ni RUTAS_BASE definidos en $CONFIG" >&2
    exit 1
fi

# Normaliza un nombre de carpeta a un alias-safe ASCII (minúsculas; espacios/_ → guión; resto fuera).
# LC_ALL=C lo hace DETERMINISTA en ChromeOS, Linux y macOS (mismo resultado, sin depender del locale).
normalize() {
    printf '%s' "$1" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C tr ' _' '--' | LC_ALL=C sed 's/^\.//; s/[^a-z0-9-]//g'
}

# Carpetas que NO generan alias: ocultas, screencast con fecha, Icon\r de Mac, duplicados "(N)".
should_skip() {
    local name="$1"
    [[ "$name" =~ ^\. ]] && return 0
    [[ "$name" =~ ^screencast-[0-9]{4}-[0-9]{2}-[0-9]{2} ]] && return 0
    [[ "$name" == Icon* ]] && return 0
    [[ "$name" =~ \([0-9]+\)$ ]] && return 0
    return 1
}

# Escapa un nombre para el interior de comillas dobles (\, $, `, ").
esc_dq() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\$/\\\$}"
    s="${s//\`/\\\`}"
    s="${s//\"/\\\"}"
    printf '%s' "$s"
}

# Emite:  alias <name>='cd "$<VAR>/<path>"'   (<path> ya escapado para comillas dobles)
emit_alias() {
    local name="$1" var="$2" path_dq="$3"
    local body="cd \"\$${var}/${path_dq}\""
    body="${body//\'/\'\\\'\'}"
    printf "alias %s='%s'\n" "$name" "$body"
}

# ¿está $1 en la lista CSV $2?
in_csv() {
    case ",$2," in *",$1,"*) return 0 ;; *) return 1 ;; esac
}

# Nombre de la variable base para un prefijo ("" → DRIVE, "sd" → DRIVE_SD).
var_for_prefix() {
    if [ -z "$1" ]; then printf 'DRIVE'; else printf 'DRIVE_%s' "$(printf '%s' "$1" | LC_ALL=C tr '[:lower:]' '[:upper:]')"; fi
}

# Escritura atómica: generar en temporal y mover al final.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

{
    echo "#!/usr/bin/env bash"
    echo "# rutas.generated.sh — AUTOGENERADO por regenerate-rutas.sh. NO EDITAR."
    echo "# Atajos personales en custom-aliases.sh · Regenerar: rutas-refresh"
    echo ""

    # --- exports de las variables base (una por raíz) ---
    for entry in "${roots[@]}"; do
        IFS='|' read -r r_label r_base r_prefix r_maxd r_filter <<< "$entry"
        case "$r_base" in "~"|"~/"*) r_base="$HOME${r_base#\~}" ;; esac
        [ -d "$r_base" ] || continue
        var="$(var_for_prefix "$r_prefix")"
        printf 'export %s="%s"\n' "$var" "$r_base"
    done

    # --- aliases por raíz (nivel 1 y 2) ---
    for entry in "${roots[@]}"; do
        IFS='|' read -r r_label r_base r_prefix r_maxd r_filter <<< "$entry"
        case "$r_base" in "~"|"~/"*) r_base="$HOME${r_base#\~}" ;; esac
        [ -d "$r_base" ] || continue
        var="$(var_for_prefix "$r_prefix")"
        if [ -z "$r_prefix" ]; then aprefix=""; else aprefix="${r_prefix}-"; fi
        wl=""
        case "$r_filter" in whitelist:*) wl="${r_filter#whitelist:}" ;; esac

        echo ""
        echo "# === ${r_label} ==="
        if [ -z "$r_prefix" ]; then
            echo "alias cd-drive='cd \"\$${var}\"'"
        else
            echo "alias cd-${r_prefix}='cd \"\$${var}\"'"
        fi

        # Raíces (nivel 1) + subcarpetas (nivel 2)
        for root in "$r_base"/*/; do
            [ -d "$root" ] || continue
            root_name=$(basename "$root")
            should_skip "$root_name" && continue
            [ -n "$wl" ] && { in_csv "$root_name" "$wl" || continue; }
            alias_root=$(normalize "$root_name")
            [ -z "$alias_root" ] && continue
            emit_alias "cd-${aprefix}${alias_root}" "$var" "$(esc_dq "$root_name")"
            for sub in "$root"*/; do
                [ -d "$sub" ] || continue
                sub_name=$(basename "$sub")
                should_skip "$sub_name" && continue
                alias_sub=$(normalize "$sub_name")
                [ -z "$alias_sub" ] && continue
                emit_alias "cd-${aprefix}${alias_root}-${alias_sub}" "$var" "$(esc_dq "$root_name")/$(esc_dq "$sub_name")"
            done
        done
    done
} > "$TMP"

mv "$TMP" "$OUT"
trap - EXIT

echo "✓ Regenerado $OUT ($(grep -c "^alias cd-" "$OUT") aliases)"

# Regenerar también el dashboard web (no bloquea ni falla si node no está instalado).
if command -v node >/dev/null 2>&1; then
    node "$SCRIPT_DIR/generate-dashboard.js" >/dev/null 2>&1 || true
fi
