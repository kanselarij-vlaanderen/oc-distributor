export const graphs = {
  kanselarij: 'http://mu.semte.ch/graphs/organizations/kanselarij',
  kabinet: 'http://mu.semte.ch/graphs/organizations/kabinet',
  adviesverlener: 'http://mu.semte.ch/graphs/organizations/adviesverlener',
  parlement: 'http://mu.semte.ch/graphs/organizations/parlement'
};

export const source = graphs.kanselarij;

export const targets = [graphs.kabinet, graphs.adviesverlener, graphs.parlement];
