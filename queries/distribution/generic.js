import { sparqlEscapeUri } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';

export const copyObject = async function (uri, properties, sourceGraph, targetGraphs, filter) {
  const escapedUri = sparqlEscapeUri(uri);

  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  
  INSERT {
      GRAPH ?targetGraphs {
          ${escapedUri} a ?class ;
              mu:uuid ?uuid ;
              ?p ?o .
      }
  }
  WHERE {
      GRAPH ${sparqlEscapeUri(sourceGraph)} {
          ${escapedUri} a ?class ;
              mu:uuid ?uuid .
          OPTIONAL { ${escapedUri} ?p ?o . }
          VALUES ?p {
              ${properties.map(sparqlEscapeUri).join('\n              ')}
          }
          ${filter || ''}
      }
      VALUES ?targetGraphs {
          ${targetGraphs.map(sparqlEscapeUri).join('\n          ')}
      }
  }
  `;
  await updateSudo(queryString);
};

export const clearGraph = function (uri) {
  const escapedGraph = sparqlEscapeUri(uri);
  const queryString = `
  DELETE {
    GRAPH ${escapedGraph} {
      ?s ?p ?o .
    }
  }
  WHERE {
    GRAPH ${escapedGraph} {
      ?s ?p ?o .
    }
  }
  `;
  return updateSudo(queryString);
};

export const deleteObject = async function (uri, graphs) {
  const escapedUri = sparqlEscapeUri(uri);
  const escapedGraphs = graphs.map(sparqlEscapeUri).join(' ');
  const queryString = `
  DELETE {
    GRAPH ${escapedGraphs} {
      ${escapedUri} ?p ?o .
    }
  }
  WHERE {
    GRAPH ${escapedGraphs} {
      ${escapedUri} ?p ?o .
    }
  }
  `;
  await updateSudo(queryString);
};
