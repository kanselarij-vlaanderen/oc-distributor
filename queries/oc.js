import { query, update, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';
import { parseResult } from './helpers';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';

async function getPastMeetings () {
  const queryString = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oc: <http://mu.semte.ch/vocabularies/ext/oc/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    SELECT ?uri ?uuid ?startedAt
    WHERE {
        ?uri a oc:Meeting ;
            mu:uuid ?uuid ;
            prov:startedAtTime ?startedAt .
        FILTER ( ?startedAt < NOW () )
    }
    ORDER BY DESC(?startedAt)
`;
  const meetings = parseResult(await querySudo(queryString));
  return meetings;
}

async function getMeetingById (uuid) {
  const queryString = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oc: <http://mu.semte.ch/vocabularies/ext/oc/>
    SELECT ?uri
    WHERE {
        ?uri a oc:Meeting ;
            mu:uuid ${sparqlEscapeString(uuid)} .
    }
`;
  const meetings = parseResult(await query(queryString));
  return meetings.length ? meetings[0] : null;
}

async function getMeeting (uri, graph) {
  const queryString = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oc: <http://mu.semte.ch/vocabularies/ext/oc/>
    SELECT ?uuid ?agendaItems ?documents
    FROM ${sparqlEscapeUri(graph)}
    WHERE {
        ${sparqlEscapeUri(uri)} a oc:Meeting ;
            mu:uuid ?uuid ;
            oc:agendaItem ?agendaItems .
        OPTIONAL {
          ${sparqlEscapeUri(uri)} oc:documents ?documents .
        }
    }
`;
  const meetings = parseResult(await querySudo(queryString));
  if (meetings.length) {
    return {
      uuid: meetings[0].uuid,
      agendaItems: [...new Set(meetings.filter((m) => m.agendaItems).map((m) => m.agendaItems))],
      documents: [...new Set(meetings.filter((m) => m.documents).map((m) => m.documents))]
    };
  } else {
    return null;
  }
}

async function getAgendaItem (uri, graph) {
  const escapedUri = sparqlEscapeUri(uri);
  const queryString = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oc: <http://mu.semte.ch/vocabularies/ext/oc/>
    SELECT ?uuid ?notification ?documents
    FROM ${sparqlEscapeUri(graph)}
    WHERE {
        ${escapedUri} a oc:AgendaItem ;
            mu:uuid ?uuid .
        OPTIONAL { ${escapedUri} oc:notification ?notification . }
        OPTIONAL { ${escapedUri} oc:documents ?documents . }
    }
`;
  const agendaItem = parseResult(await querySudo(queryString));
  if (agendaItem.length) {
    return {
      uuid: agendaItem[0].uuid,
      notification: agendaItem[0].notification,
      documents: [...new Set(agendaItem.filter((m) => m.documents).map((m) => m.documents))]
    };
  } else {
    return null;
  }
}

export { getPastMeetings, getMeetingById, getMeeting, getAgendaItem };
