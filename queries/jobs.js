import { query, update, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { parseResult } from './helpers';
import { distributorGraph } from '../config/config';

const SCHEDULED = 'scheduled';
const STARTED = 'started';
const FINISHED = 'done';
const FAILED = 'failed';

async function createJob (uuid, meeting, entity) {
  const job = {
    uri: distributorGraph + `distribution-jobs/${uuid}`,
    id: uuid,
    meeting,
    entity,
    status: SCHEDULED,
    created: new Date(),
    modified: new Date()
  };
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  INSERT DATA {
      GRAPH ${sparqlEscapeUri(distributorGraph)} {
          ${sparqlEscapeUri(job.uri)} a ext:DistributionJob ;
              mu:uuid ${sparqlEscapeString(job.id)} ;
  
              ext:meeting ${sparqlEscapeUri(job.meeting)} ;
              ext:entity ${sparqlEscapeString(job.entity)} ;
  
              ext:status ${sparqlEscapeString(job.status)} ;
              dct:created ${sparqlEscapeDateTime(job.created)} ;
              dct:modified ${sparqlEscapeDateTime(job.modified)} .
      }
  }`;
  await updateSudo(queryString);
  return job;
}

async function getFirstScheduledJob () {
  const queryString = `
  PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX    ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  SELECT ?uri ?id ?created
  FROM ${sparqlEscapeUri(distributorGraph)}
  WHERE {
      ?uri a ext:DistributionJob ;
          dct:created ?created ;
          ext:status ${sparqlEscapeString(SCHEDULED)} ;
          mu:uuid ?id .
  } ORDER BY ASC(?created) LIMIT 1`;
  const jobs = parseResult(await querySudo(queryString));
  return jobs.length ? jobs[0] : null;
}

async function updateJob (uri, status) {
  let escapedUri = sparqlEscapeUri(uri);
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  WITH ${sparqlEscapeUri(distributorGraph)}
  DELETE {
      ${escapedUri} dct:modified ?modified ;
          ext:status ?status .
   }
  INSERT {
      ${escapedUri} dct:modified ${sparqlEscapeDateTime(new Date())} ;
          ext:status ${sparqlEscapeString(status)} .
  }
  WHERE {
      ${escapedUri} a ext:DistributionJob ;
          dct:modified ?modified ;
          ext:status ?status ;
          mu:uuid ?uuid .
  }`;
  await updateSudo(queryString);
}

async function getScheduledJob (jobUri) {
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  SELECT ?uuid ?meeting ?entity
  FROM ${sparqlEscapeUri(distributorGraph)}
  WHERE {
      ${sparqlEscapeUri(jobUri)} a ext:DistributionJob ;
          mu:uuid ?uuid ;
          ext:meeting ?meeting ;
          ext:entity ?entity ;
          dct:modified ?modified ;
          ext:status ${sparqlEscapeString(SCHEDULED)}  .
  }`;
  const jobs = parseResult(await querySudo(queryString));
  return jobs.length ? jobs[0] : null;
}

async function getJobByMeeting (meeting, entity) {
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  SELECT ?job (?uuid AS ?id) ?modified ?status
  FROM ${sparqlEscapeUri(distributorGraph)}
  WHERE {
      ?job ext:meeting ${sparqlEscapeUri(meeting)} .
      ?job a ext:DistributionJob ;
          mu:uuid ?uuid ;
          ext:entity ${sparqlEscapeString(entity)} ;
          dct:created ?created ;
          dct:modified ?modified ;
          ext:status ?status .
  }
  ORDER BY DESC (?created)
  LIMIT 1
  `;
  const jobs = parseResult(await querySudo(queryString));
  return jobs.length ? jobs[0] : null;
}

export { createJob, updateJob, getFirstScheduledJob, getScheduledJob, getJobByMeeting, FINISHED, FAILED, STARTED };
