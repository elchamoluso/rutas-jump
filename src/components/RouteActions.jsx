// RouteActions — clúster de acciones reutilizable (filas de árbol, favoritos, búsqueda).
//
// CAMBIO CLAVE (verificado contra @adobe/react-spectrum 3.47.1,
// dist/private/tree/TreeView.mjs): TreeViewItemContent envuelve a sus hijos en un
// SlotProvider que asigna la clase `treeActions` (borde DERECHO) a cualquier
// ActionGroup/ActionButton vía los slots actionGroup/actionButton. Por eso antes este
// clúster aparecía pegado a la derecha, lejos del nombre. La solución es devolver un
// <Flex> SIN slot (no ActionGroup): el SlotProvider no lo captura, así que renderiza
// donde lo coloquemos — aquí, en la línea justo debajo del nombre.
import { Flex, ActionButton, Text, TooltipTrigger, Tooltip } from '@adobe/react-spectrum';
import { copyText } from '../clipboard';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const BTN = { minWidth: 0, height: 22, paddingInline: 8 };

export default function RouteActions({ abs, aliases = [] }) {
  return (
    <Flex direction="row" gap="size-65" wrap alignItems="center" UNSAFE_style={{ rowGap: 4 }}>
      {aliases.map((a) => (
        <TooltipTrigger key={'alias:' + a} delay={400}>
          <ActionButton isQuiet onPress={() => copyText(a)} aria-label={'Copiar alias ' + a} UNSAFE_style={BTN}>
            <Text UNSAFE_style={{ fontFamily: MONO, fontSize: '11.5px' }}>{a}</Text>
          </ActionButton>
          <Tooltip>Copiar alias «{a}»</Tooltip>
        </TooltipTrigger>
      ))}

      <TooltipTrigger delay={400}>
        <ActionButton isQuiet onPress={() => copyText(abs)} aria-label={'Copiar ruta absoluta: ' + abs} UNSAFE_style={BTN}>
          <Text UNSAFE_style={{ fontSize: '11.5px' }}>Copiar ruta</Text>
        </ActionButton>
        <Tooltip>{abs}</Tooltip>
      </TooltipTrigger>

      <TooltipTrigger delay={400}>
        <ActionButton isQuiet onPress={() => copyText('cd "' + abs + '"')} aria-label={'Copiar comando cd a: ' + abs} UNSAFE_style={BTN}>
          <Text UNSAFE_style={{ fontSize: '11.5px' }}>cd</Text>
        </ActionButton>
        <Tooltip>cd "{abs}"</Tooltip>
      </TooltipTrigger>
    </Flex>
  );
}
