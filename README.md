# 🗂️ drive-jump

**Salta a cualquier carpeta de tu Google Drive (o de donde sea) desde la terminal — sin
memorizar rutas — y explóralas en un dashboard web local.**

`drive-jump` escanea una carpeta base y genera atajos de terminal (`cd-proyectos`,
`cd-proyectos-cliente`, …) automáticamente. Cuando creas, mueves o renombras carpetas, los atajos
se regeneran solos. Incluye un **dashboard web local** para ver el árbol completo, copiar rutas y
comandos, y buscar al instante.

Pensado para quien trabaja con un Drive grande y no quiere memorizar comandos que además cambian
cada vez que reorganiza sus carpetas — y para quien no se siente cómodo navegando carpetas a mano
en la terminal.

> Cross-platform: **ChromeOS (Crostini) · macOS · Linux**. Cero dependencias (solo `bash` y, para
> el dashboard, `node`).

---

## ✨ Qué hace

- **Atajos `cd-*` autogenerados** — un alias por carpeta de nivel 1 y 2 de tu carpeta base.
  `cd-drive` te lleva a la raíz; `cd-proyectos-cliente` a `proyectos/cliente`.
- **Se regeneran solos** — al crear/mover/renombrar carpetas, `rutas-refresh` (o un cron) actualiza
  los atajos. Nunca memorizas una ruta que va a cambiar.
- **Dashboard web local** — árbol plegable de tus carpetas, ⭐ favoritos, buscador instantáneo y
  botones *Copiar ruta* / *cd* en cada carpeta. Diseño limpio con tema claro/oscuro automático.
- **Directorio de comandos** — secciones de comandos copiables (Claude Code, git, etc.), totalmente
  configurables por ti.
- **Configurable** — tu carpeta base, puerto y branding (título, emoji, color) en un solo archivo.

---

## 🚀 Instalación

```bash
git clone https://github.com/elchamoluso/drive-jump.git
cd drive-jump
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
rutas-web      # abre el dashboard en el navegador
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
RUTAS_BASE="/mnt/chromeos/GoogleDrive/MyDrive"   # carpeta a escanear/navegar (cualquiera)
RUTAS_PORT="7777"                                 # puerto del dashboard
RUTAS_TITLE="Rutas"                               # branding del dashboard
RUTAS_EMOJI="🗂️"
RUTAS_ACCENT="#0070f3"
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

Ejecuta `rutas-web` (o `rutas-web-build`) para reflejarlo.

---

## 🖥️ El dashboard

| Comando | Acción |
|---|---|
| `rutas-web` | Regenera, sirve y abre el dashboard en el navegador |
| `rutas-web-stop` | Detiene el servidor |
| `rutas-web-build` | Solo regenera el HTML (sin servir) |

Se sirve por `http://localhost:7777` (en ChromeOS también `http://penguin.linux.test:7777`).
Se sirve por HTTP porque el navegador del host de ChromeOS no puede abrir `file://` del contenedor
Linux; en macOS/Linux funciona igual. Requiere `node` (cualquier versión reciente).

---

## 🔄 Mantener actualizado automáticamente (opcional)

Añade a tu `crontab -e` (Linux/ChromeOS) para regenerar cada 30 minutos:

```cron
*/30 * * * * /bin/bash "/ruta/a/drive-jump/regenerate-rutas.sh" >/dev/null 2>&1
```

En macOS basta con ejecutar `rutas-refresh` cuando reorganices carpetas.

---

## 🧭 Notas por plataforma

- **ChromeOS (Crostini):** base habitual `/mnt/chromeos/GoogleDrive/MyDrive`. El dashboard se abre en
  el Chrome del host vía `localhost` o `penguin.linux.test`.
- **macOS:** base habitual `~/Library/CloudStorage/GoogleDrive-<cuenta>/<Mi unidad>` (el nombre de la
  raíz depende del idioma del sistema). `install.sh` lo autodetecta.
- **Linux:** cualquier carpeta o un Drive montado con rclone/insync.

---

## 📁 Estructura del proyecto

```
install.sh              Instalador cross-platform
loader.sh               Punto de entrada (lo sourcea tu shell rc)
regenerate-rutas.sh     Escanea la base → genera los aliases cd-*
rutas.lib.sh            Funciones (rutas-web, rutas-help, rutas-refresh…)
generate-dashboard.js   Genera el dashboard.html (Node, cero deps)
serve-dashboard.js      Sirve el dashboard por HTTP (Node, cero deps)
dashboard.template.html UI del dashboard (diseño + tema claro/oscuro)
commands.json           Secciones de comandos copiables (edítalo)
rutas.config.example.sh Plantilla de configuración
custom-aliases.example.sh Plantilla de atajos personales
AGENTS.md               Notas para agentes AI
```

---

## 📝 Licencia

[MIT](LICENSE) · Hecho por **Jesús Ferreira** ([@elchamoluso](https://github.com/elchamoluso)).
