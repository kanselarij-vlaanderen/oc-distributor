import { app, uuid, errorHandler } from 'mu';
import { authorizedSession } from './lib/session';
import { getMeetingById } from './queries/oc';
import { authorizedUserGroups } from './config/config';
import { createJob, getJobByMeeting, FINISHED } from './queries/jobs';
import { runJob } from './distribution';

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
    res.status(404).send({ error: `Could not find meeting with uuid ${meetingId}` });
  }
}, async function (req, res, next) {
  const entity = req.params.entity;
  if (['agenda', 'notifications'].includes(entity)) {
    req.entity = entity;
    next();
  } else {
    res.status(400).send({ error: `Distributor doesn't support entity of type ${entity}` });
  }
});

app.post('/meetings/:uuid/:entity/distribute', async function (req, res, next) {
  const authorized = authorizedSession(JSON.parse(req.get('MU-AUTH-ALLOWED-GROUPS')), authorizedUserGroups);
  if (authorized) {
    next();
  } else {
    res.status(403).send({ error: `You don't have the authorization to distribute ${req.entity}` });
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

app.use(errorHandler);
