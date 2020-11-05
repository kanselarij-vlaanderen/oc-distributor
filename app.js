import bodyParser from 'body-parser';
import { app, uuid, errorHandler } from 'mu';
import { authorizedSession } from './lib/session';
import { getMeetingById } from './queries/oc';
import { authorizedUserGroups } from './config/config';
import { expand } from './config/prefixes';
import { createJob, getJobByMeeting, FINISHED } from './queries/jobs';
import * as deltaUtil from './lib/delta-util';
import { runJob, redistributePastMeetings } from './lib/distribution';
import { runAgendaRetraction } from './lib/distribution/agenda';

if (process.env.REDISTRIBUTE_PAST_ON_STARTUP === 'true') {
  redistributePastMeetings();
}

app.get('/', function (req, res) {
  res.send('Hello from oc-distributor');
});

app.all('/meetings/:uuid/:entity/*', async function (req, res, next) {
  const meetingId = req.params.uuid;
  const meeting = await getMeetingById(meetingId);
  if (meeting) {
    req.meeting = meeting;
    next();
  } else {
    const err = new Error(`Could not find meeting with uuid ${meetingId}`);
    err.status = 404;
    next(err);
  }
}, async function (req, res, next) {
  const entity = req.params.entity;
  if (['agenda', 'notifications'].includes(entity)) {
    req.entity = entity;
    next();
  } else {
    const err = new Error(`Distributor doesn't support entity of type ${entity}`);
    err.status = 400;
    next(err);
  }
});

app.post('/meetings/:uuid/:entity/distribute', async function (req, res, next) {
  const authorized = authorizedSession(JSON.parse(req.get('MU-AUTH-ALLOWED-GROUPS')), authorizedUserGroups);
  if (authorized) {
    next();
  } else {
    const err = new Error(`You don't have the authorization to distribute ${req.entity}`);
    err.status = 403;
    next(err);
  }
}, async function (req, res, next) {
  const jobId = uuid();
  const job = await createJob(jobId, req.meeting.uri, req.entity);
  runJob(job.uri);
  res.status(202).send({ data: job });
});

app.get('/meetings/:uuid/:entity/distribute', async function (req, res, next) {
  const job = await getJobByMeeting(req.meeting.uri, req.entity);
  if (job) {
    if (job.status === FINISHED) {
      res.status(200).send({ data: job });
    } else {
      res.status(406).send({ data: job });
    }
  } else {
    res.status(404).end();
  }
});

app.post('/delta', bodyParser.json(), async (req, res) => {
  res.status(202).end();
  const insertionDeltas = deltaUtil.insertionDeltas(req.body);
  const deletionDeltas = deltaUtil.deletionDeltas(req.body);
  if (insertionDeltas.length || deletionDeltas.length) {
    console.debug(`Received deltas (${insertionDeltas.length + deletionDeltas.length} total)`);
  } else {
    return; // Empty delta message received on startup?
  }

  const typeDeletionDeltas = deltaUtil.filterByType(deletionDeltas, [expand`oc:Meeting`]);
  if (typeDeletionDeltas.length) {
    console.log(`Received deltas for ${typeDeletionDeltas.length} DELETED Meeting object(s)`);
  }
  const meetingUris = deltaUtil.uniqueSubjects(typeDeletionDeltas);
  for (const meetingUri of meetingUris) {
    console.log(`Running cascading retraction for meeting <${meetingUri}>`);
    await runAgendaRetraction(meetingUri);
  }
});

app.use(errorHandler);
