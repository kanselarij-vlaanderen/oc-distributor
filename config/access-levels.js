export const accessLevels = [
  'http://kanselarij.vo.data.gift/id/concept/toegangs-niveaus/d335f7e3-aefd-4f93-81a2-1629c2edafa3',
  'http://kanselarij.vo.data.gift/id/concept/toegangs-niveaus/abe4c18d-13a9-45f0-8cdd-c493eabbbe29',
  'http://kanselarij.vo.data.gift/id/concept/toegangs-niveaus/e3d64f24-4feb-4770-8212-e9e3e23a7d29'
];

export const accessLevelsByGraph = {
  'http://mu.semte.ch/graphs/organizations/minister': accessLevels,
  'http://mu.semte.ch/graphs/organizations/kabinet': accessLevels.slice(1),
  'http://mu.semte.ch/graphs/organizations/administratie': accessLevels.slice(2)
};
