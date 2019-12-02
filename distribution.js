import { getMeeting } from './queries/oc';
import { copyObject } from './queries/distribution/generic';
import { copyDocuments } from './queries/distribution/documents';
import { meeting as meetingProperties, agendaItem as agendaItemProperties } from './config/properties';
import * as accessLevels from './config/access-levels';
import { graphs, source, targets } from './config/graphs';
import { getScheduledJob, updateJob, FINISHED, STARTED, FAILED } from './queries/jobs';

const runJob = async function (jobUri) {
  const job = await getScheduledJob(jobUri);
  if (job) {
    await updateJob(jobUri, STARTED);
  }
  if (job.entity === 'agenda') {
    try {
      await runAgendaDistribution(job.meeting);
      console.error(`Successfully ran job ${jobUri}`);
      await updateJob(jobUri, FINISHED);
    } catch (error) {
      console.error(`Failed running job ${jobUri}`);
      await updateJob(jobUri, FAILED);
    }
  } else if (job.entity === 'notifications') {
    // TODO
  } else {
    await updateJob(jobUri, FAILED);
  }
};

const runAgendaDistribution = async function (meetingUri) {
  const meeting = await getMeeting(meetingUri);
  console.log(`Copying meeting ${meeting.uuid} ...`);
  await copyObject(meetingUri,
    meetingProperties,
    source,
    targets);
  if (meeting.documents) {
    console.log(`Copying ${meeting.documents.length} meeting documents ...`);
    await copyDocuments(meeting.documents,
      source,
      [graphs['kabinet']],
      accessLevels['kabinet']
    );
    await copyDocuments(meeting.documents,
      source,
      [graphs['adviesverlener']],
      accessLevels['adviesverlener']
    );
    await copyDocuments(meeting.documents,
      source,
      [graphs['parlement']],
      accessLevels['parlement']
    );
  }
  console.log(`Copying ${meeting.agendaItems.length} agenda items for meeting ${meeting.uuid} ...`);
  const copyItems = meeting.agendaItems.map((agendaItemUri) => {
    console.log(`Copying item ${agendaItemUri}`);
    return copyObject(agendaItemUri,
      agendaItemProperties,
      source,
      targets);
  });
  return Promise.all(copyItems);
};

export { runJob };
