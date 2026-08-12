// VaultBanner — la nota de la bóveda de credenciales, arriba del todo.
//
// Existe porque los MCP leen su token AL ARRANCAR la sesión: abrir una CLI con la bóveda
// cerrada da un agente sin credenciales que no falla hasta media tarea después.
//
// El fondo va con un tinte translúcido y el estado lo lleva el emoji: así se lee igual en
// tema claro y oscuro sin pelearse con los tokens de color de Spectrum.
import { Flex, View, Text, ActionButton, TooltipTrigger, Tooltip } from '@adobe/react-spectrum';
import { copyText } from '../clipboard';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const TINTE = {
  'en-claro': 'rgba(245,158,11,.16)',
  cerrada: 'rgba(239,68,68,.13)',
  abierta: 'rgba(34,197,94,.13)',
};

function Cmd({ cmd }) {
  return (
    <TooltipTrigger delay={400}>
      <ActionButton
        isQuiet
        UNSAFE_className="rutas-copybtn"
        onPress={() => copyText(cmd)}
        aria-label={'Copiar comando: ' + cmd}
        UNSAFE_style={{ minWidth: 0, height: 26, paddingInline: 9, flexShrink: 0 }}
      >
        <Text UNSAFE_style={{ fontFamily: MONO, fontSize: '11.5px' }}>{cmd}</Text>
      </ActionButton>
      <Tooltip>Copiar «{cmd}»</Tooltip>
    </TooltipTrigger>
  );
}

export default function VaultBanner({ vault, ambito }) {
  // Este entorno no declara ámbito (RUTAS_LLAVE_AMBITO vacío) o no hay bóveda instalada:
  // no hay nada que avisar y la app se comporta como un dashboard de rutas normal.
  if (!ambito || !vault || !vault.instalada) return null;
  const a = (vault.ambitos || []).find((x) => x.ambito === ambito);
  if (!a) return null;

  const abierta = a.estado === 'abierta';
  const emoji = a.estado === 'en-claro' ? '🟠' : abierta ? '🟢' : (vault.pendrive ? '🔴' : '⚠️');
  const tinte = TINTE[a.estado === 'en-claro' ? 'en-claro' : abierta ? 'abierta' : 'cerrada'];

  let texto;
  const cmds = [];
  if (a.estado === 'en-claro') {
    // El caso de gws cayendo en las credenciales de gcloud: quedan escritas EN CLARO aunque
    // la bóveda esté cerrada, y a partir de ahí `unlock` muere y `lock` se niega.
    texto = `${a.enClaro} de las ${a.total} credenciales de «${a.ambito}» están SIN CIFRAR en el disco. Hasta arreglarlo, la bóveda no protege nada:`;
    cmds.push(`llave unlock ${a.ambito} --force`);
  } else if (abierta) {
    texto = `Bóveda «${a.ambito}» abierta (${a.enlazadas} credenciales en RAM) — los comandos van directos. Al terminar:`;
    cmds.push(`llave lock ${a.ambito}`, `llave sync ${a.ambito}`);
  } else if (!vault.pendrive) {
    texto = `Bóveda «${a.ambito}» cerrada y no detecto el pendrive: enchúfalo y, si no aparece, compártelo con Linux desde Archivos (clic derecho → Compartir con Linux).`;
  } else if (vault.error) {
    texto = `No se pudo comprobar la bóveda «${a.ambito}». Por si acaso, los comandos incluirán el desbloqueo.`;
  } else {
    texto = `Bóveda «${a.ambito}» cerrada — los comandos incluirán «llave unlock ${a.ambito}» para que la CLI vea tus tokens. El PIN se teclea en tu terminal.`;
  }

  return (
    <View paddingX="size-200" paddingY="size-100" UNSAFE_style={{ background: tinte }}>
      <Flex direction="row" gap="size-125" alignItems="center" wrap UNSAFE_style={{ rowGap: 6 }}>
        <Text UNSAFE_style={{ fontSize: '15px', lineHeight: 1 }}>{emoji}</Text>
        <Text UNSAFE_style={{ fontSize: '12.5px' }}>{texto}</Text>
        {cmds.map((c) => <Cmd key={c} cmd={c} />)}
      </Flex>
    </View>
  );
}
