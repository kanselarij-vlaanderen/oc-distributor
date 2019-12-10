import { getScheduledJob, updateJob, getFirstScheduledJob, getCompletedJobsByMeeting, FINISHED, STARTED, FAILED } from '../queries/jobs';
import { runAgendaDistribution, runAgendaRetraction } from './agenda';
import { runNotificationDistribution, runNotificationsRetraction } from './notifications';

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

export { runJob, runscheduledJobs };
