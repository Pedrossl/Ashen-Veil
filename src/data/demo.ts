import { version } from '../../package.json';

import { CRIMSON_SURGEON, REAPER_KING, ROOT_OF_CONDEMNED } from './bosses';

// Build jogável para amigos: versão mostrada no menu (vem do package.json) e
// o que conta como terminar a demo.
export const DEMO = {
  version: `v${version}`,
  label: 'demo',
  // Os três bosses da prisão derrotados, em qualquer ordem.
  endFlags: [REAPER_KING.defeatedFlag, ROOT_OF_CONDEMNED.defeatedFlag, CRIMSON_SURGEON.defeatedFlag],
  finishedFlag: 'demo-finished',
  // Espera a vitória e a recompensa saírem da tela antes do fim da demo.
  endDelayMs: 12500,
  // Saiu da sala antes: o fim aparece pouco depois de chegar na próxima.
  arrivalDelayMs: 2500,
} as const;
