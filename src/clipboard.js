// clipboard.js — copia al portapapeles con fallback para file:// (port de copyText
// del dashboard vanilla). Esencial: el dashboard puede abrirse como archivo local,
// donde navigator.clipboard no está disponible.
import { ToastQueue } from '@adobe/react-spectrum';

function execCommandCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

export async function copyText(text) {
  let ok = false;
  // Intenta la API moderna primero (https/localhost). Si rechaza (ventana sin foco,
  // permiso denegado…), cae SIEMPRE al fallback execCommand, que también cubre file://.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      ok = false;
    }
  }
  if (!ok) ok = execCommandCopy(text);

  if (ok) ToastQueue.positive('Copiado al portapapeles', { timeout: 1500 });
  else ToastQueue.negative('No se pudo copiar', { timeout: 2500 });
  return ok;
}
