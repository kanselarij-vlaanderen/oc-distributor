export const prefixes = {
  'ext': 'http://mu.semte.ch/vocabularies/ext/',
  'oc': 'http://mu.semte.ch/vocabularies/ext/oc/',

  'besluit': 'http://data.vlaanderen.be/ns/besluit#',
  'mandaat': 'http://data.vlaanderen.be/ns/mandaat#',
  'besluitvorming': 'http://data.vlaanderen.be/ns/besluitvorming#',

  'dbpedia': 'http://dbpedia.org/ontology/',
  'dct': 'http://purl.org/dc/terms/',
  'foaf': 'http://xmlns.com/foaf/0.1/',
  'nfo': 'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#',
  'nie': 'http://www.semanticdesktop.org/ontologies/2007/01/19/nie#',
  'nmo': 'http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#',
  'owl': 'http://www.w3.org/2002/07/owl#',
  'person': 'http://www.w3.org/ns/person#',
  'prov': 'http://www.w3.org/ns/prov#',
  'skos': 'http://www.w3.org/2004/02/skos/core#'
};

export const expand = (function (prefixes) {
  return function (strings) {
    const [prefix, predicate] = strings[0].split(':');
    if (prefixes[prefix]) {
      return prefixes[prefix] + predicate;
    }
  };
})(prefixes);
