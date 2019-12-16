export const graphs = {
  kanselarij: 'http://mu.semte.ch/graphs/organizations/kanselarij',
  minister: 'http://mu.semte.ch/graphs/organizations/minister',
  kabinet: 'http://mu.semte.ch/graphs/organizations/kabinet',
  administratie: 'http://mu.semte.ch/graphs/organizations/administratie'
};

export const source = graphs.kanselarij;

export const targets = [graphs.minister, graphs.kabinet, graphs.administratie];
