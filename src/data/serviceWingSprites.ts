const ROOT = 'assets/prison/alas_servico';
export const SERVICE_ATLASES = Object.fromEntries(
  ['isolation', 'workshop', 'cistern', 'furniture', 'mechanisms'].map((name) => [name, {
    key: `service-${name}`, imagePath: `${ROOT}/${name}.webp`, dataPath: `${ROOT}/${name}.json`,
  }]),
);
