export const accessLevels = {
  'Intern Regering': 'http://kanselarij.vo.data.gift/id/concept/toegangs-niveaus/d335f7e3-aefd-4f93-81a2-1629c2edafa3',
  'Intern Overheid': 'http://kanselarij.vo.data.gift/id/concept/toegangs-niveaus/abe4c18d-13a9-45f0-8cdd-c493eabbbe29',
  'Parlement': 'http://kanselarij.vo.data.gift/id/concept/toegangs-niveaus/e3d64f24-4feb-4770-8212-e9e3e23a7d29'
};

export const kabinet = [
  accessLevels['Intern Regering'],
  accessLevels['Intern Overheid'],
  accessLevels['Parlement']
];

export const adviesverlener = [
  accessLevels['Intern Regering'],
  accessLevels['Intern Overheid'],
  accessLevels['Parlement']
];

export const parlement = [ accessLevels['Parlement'] ];
