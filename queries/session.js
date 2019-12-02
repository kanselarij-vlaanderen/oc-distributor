import { sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { querySudo } from '@lblod/mu-auth-sudo';

async function authorizedSession (muSessionId, authorizedGroups) {
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX session: <http://mu.semte.ch/vocabularies/session/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  SELECT ?group_uri {
    ?session mu:uuid ${sparqlEscapeString(muSessionId)} .
    ?session session:account / ^foaf:account / ^foaf:member ?group_uri .
    VALUES ?group_uri {
      ${authorizedGroups.map(sparqlEscapeUri).join('      \n')}
    }
  }
  `;
  const result = await querySudo(queryString);
  return result;
}

export { authorizedSession };
