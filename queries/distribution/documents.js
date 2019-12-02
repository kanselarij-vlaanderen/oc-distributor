import { sparqlEscapeUri } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';

export const copyDocuments = async function (documentUris, sourceGraph, targetGraphs, allowedAccessLevels, extraFilter) {
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX mulit: <http://mu.semte.ch/vocabularies/typed-literals/>
  PREFIX besluitvorming: <http://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>

  INSERT {
      GRAPH ${targetGraphs.map(sparqlEscapeUri).join(' ')} {
          ?doc ?dp ?do .
          ?ver ?vp ?vo .
          ?file ?fp ?fo .
          ?physical ?pp ?po .
      }
  }
  WHERE {
      GRAPH ${sparqlEscapeUri(sourceGraph)} {
          VALUES ?doc {
              ${documentUris.map(sparqlEscapeUri).join('\n              ')}
          }
          ?doc a foaf:Document ;
              besluitvorming:heeftVersie ?ver ;
              ?dp ?do .
          ?ver a ext:DocumentVersie ;
              ext:vertrouwelijk "false"^^mulit:boolean ;
              ext:toegangsniveauVoorDocumentVersie ?al ;
              ?vp ?vo .
          VALUES ?al { ${allowedAccessLevels.map(sparqlEscapeUri).join(' ')} }
          ?ver ext:file ?file .
          ?file a nfo:FileDataObject ;
              ?fp ?fo .
          ?physical a nfo:FileDataObject ;
              nie:dataSource ?file ;
              ?pp ?po .
          ${extraFilter || ''}
      }
  }
  `;
  await updateSudo(queryString);
};
