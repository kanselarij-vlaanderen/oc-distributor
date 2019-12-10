import { uuid } from 'mu';
import {
  createJob,
  getScheduledJob,
  updateJob,
  getFirstScheduledJob,
  getCompletedJobsByMeeting,
  deleteJobsByMeeting,
  FINISHED, STARTED, FAILED
} from '../queries/jobs';
import { runAgendaDistribution, runAgendaRetraction } from './distribution/agenda';
import { runNotificationDistribution, runNotificationsRetraction } from './distribution/notifications';
import { getPastMeetings } from '../queries/oc';
import * as graphs from '../config/graphs';
import { clearGraph } from '../queries/distribution/generic';

const runJob = async function (jobUri) {
  const job = await getScheduledJob(jobUri);
  if (job) {
    await updateJob(jobUri, STARTED);
  }
  let distributionFunction, retractionFunction;
  if (job.entity === 'agenda') {
    distributionFunction = runAgendaDistribution;
    retractionFunction = runAgendaRetraction;
  } else if (job.entity === 'notifications') {
    distributionFunction = runNotificationDistribution;
    retractionFunction = runNotificationsRetraction;
  } else {
    console.log('No method availble for running distributions of entity type' + job.entity);
    await updateJob(jobUri, FAILED);
    return;
  }
  const hasPreviousDistribution = (await getCompletedJobsByMeeting(job.meeting, job.entity)).length > 0;
  if (hasPreviousDistribution) {
    console.log(`Previously ditributed ${job.entity} for meeting ${job.meeting}. Retracting before redistributing`);
    await retractionFunction(job.meeting);
  }
  try {
    console.log(`Distributing ${job.entity} for meeting ${job.meeting} (job ${job.uuid})`);
    await distributionFunction(job.meeting);
    console.error(`Successfully ran job ${jobUri}`);
    await updateJob(jobUri, FINISHED);
  } catch (error) {
    console.error(`Failed running job ${jobUri}\n${error}`);
    await updateJob(jobUri, FAILED);
  }
};

const runscheduledJobs = async function () {
  console.log('Running all still scheduled jobs on startup');
  let job = await getFirstScheduledJob();
  while (job) {
    console.log('Running job', job.uri);
    try {
      await runJob(job.uri);
    } catch (e) {
      console.log('Something went wrong while running job', job.uri);
    }
    job = await getFirstScheduledJob();
  }
};

const redistributePastMeetings = async function () {
  console.log(`
################################################################################
# Redistributing all past meetings #############################################
################################################################################
  `);
  const clearings = graphs.targets.map(async (g) => {
    console.log(`clearing graph <${g}> ...`);
    return clearGraph(g);
  });
  return Promise.all(clearings).then(() => {
    console.log('cleared all target graphs');
    return getPastMeetings();
  }).then(async (pastMeetings) => {
    for (var i = 0; i < pastMeetings.length; i++) {
      const meeting = pastMeetings[i];
      await deleteJobsByMeeting(meeting.uri);
      console.log(`Creating distribution jobs for meeting of ${meeting.startedAt} (<${meeting.uri}>)`);
      const distAgendaJob = await createJob(uuid(), meeting.uri, 'agenda');
      console.log('Running distribution of agenda');
      await runJob(distAgendaJob.uri);
      const distNotifJob = await createJob(uuid(), meeting.uri, 'notifications');
      console.log('Running distribution of notifications');
      await runJob(distNotifJob.uri);
    }
  }).then(() => {
    console.log(`
################################################################################
# Done distributing past meetings #############################################
################################################################################
    `);
    console.log('Ran distribution jobs for all past meetings.');
  });
};

export { runJob, runscheduledJobs, redistributePastMeetings };
