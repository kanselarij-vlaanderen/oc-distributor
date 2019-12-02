import { app, uuid, errorHandler } from 'mu';
import { authorizedSession } from './queries/session';
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
  } else {
    res.status(404).send({ error: `Could not find meeting with uuid ${meetingId}` });
  }
  const entity = req.params.entity;
  if (['agenda', 'notifications'].includes(entity)) {
    req.entity = entity;
  } else {
    res.status(400).send({ error: `Distributor doesn't support entity of type ${entity}` });
  }
  next();
});

app.post('/meetings/:uuid/:entity/distribute', async function (req, res, next) {
  const authorized = await authorizedSession(req.get('MU-SESSION-ID'), authorizedUserGroups);
  console.log('auhtorized?', authorized);
  // if (!authorized) {
  //   res.status(403).send({ error: `You don't have the authorization to distribute ${req.entity}` });
  // }
  const jobId = uuid();
  const job = await createJob(jobId, req.meeting.uri, req.entity);
  runJob(job.uri);
  res.status(202).send({ jobId });
});

app.get('/meetings/:uuid/:entity/distribute', async function (req, res, next) {
  const job = await getJobByMeeting(req.meeting.uri, req.entity);
  if (job.status === FINISHED) {
    res.status(200).send({ status: job.status });
  } else {
    res.status(406).send({ status: job.status });
  }
});

app.use(errorHandler);
