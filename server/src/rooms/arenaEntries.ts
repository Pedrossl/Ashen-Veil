// Entradas que podem ser usadas por uma transição cooperativa de arena.
// O servidor valida essa lista para não aceitar uma rota inventada pelo cliente.
export const ARENA_ENTRIES: Record<string, readonly string[]> = {
  "prison-root-arena": ["sewers"],
  "prison-boss-lair": ["well"],
  "prison-surgical-theater": ["wing"],
};
