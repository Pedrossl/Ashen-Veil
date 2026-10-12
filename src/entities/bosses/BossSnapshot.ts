// Cooperativo: estado de um boss mandado por quem o comanda, ~10x/s. As
// decisões vão à parte, como `FoeDecision` (components/FoeControl.ts).
export type BossSnapshot = {
  x: number;
  y: number;
  facing: 1 | -1;
  health: number;
  engaged: boolean;
  // Estado próprio de cada boss (ex.: barra de raízes, segunda fase).
  detail: Record<string, number>;
};
