import { getMeeting, getAgendaItem } from './queries/oc';
import { copyObject, deleteObject } from './queries/distribution/generic';
import { copyDocuments, deleteDocuments } from './queries/distribution/documents';
import { meeting as meetingProperties, agendaItem as agendaItemProperties } from './config/properties';
import * as accessLevels from './config/access-levels';
import { graphs, source, targets } from './config/graphs';
import { getScheduledJob, updateJob, getFirstScheduledJob, getCompletedJobsByMeeting, FINISHED, STARTED, FAILED } from './queries/jobs';
import { expand } from './config/prefixes';

const runJob = async function (jobUri) {
  const job = await getScheduledJob(jobUri);
  if (job) {
    await updateJob(jobUri, STARTED);
  }
  if (job.entity === 'agenda') {
    const hasPreviousDistribution = (await getCompletedJobsByMeeting(job.meeting, job.entity)).length > 0;
    if (hasPreviousDistribution) {
      console.log(`Previously ditributed ${job.entity} for meeting ${job.meeting}. Retracting before redistributing`);
      await runAgendaRetraction(job.meeting);
    }
    console.log(`Distributing agenda for meeting ${job.meeting} (job ${job.uuid})`);
    try {
      await runAgendaDistribution(job.meeting);
      console.error(`Successfully ran job ${jobUri}`);
      await updateJob(jobUri, FINISHED);
    } catch (error) {
      console.error(`Failed running job ${jobUri}\n${error}`);
      await updateJob(jobUri, FAILED);
    }
  } else if (job.entity === 'notifications') {
    const hasPreviousDistribution = (await getCompletedJobsByMeeting(job.meeting, job.entity)).length > 0;
    if (hasPreviousDistribution) {
      console.log(`Previously ditributed ${job.entity} for meeting ${job.meeting}. Retracting before redistributing`);
      await runNotificationsRetraction(job.meeting);
    }
    try {
      console.log(`Distributing notifications for meeting ${job.meeting} (job ${job.uuid})`);
      await runNotificationDistribution(job.meeting);
      console.error(`Successfully ran job ${jobUri}`);
      await updateJob(jobUri, FINISHED);
    } catch (error) {
      console.error(`Failed running job ${jobUri}\n${error}`);
      await updateJob(jobUri, FAILED);
    }
  } else {
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

const runAgendaDistribution = async function (meetingUri) {
  const meeting = await getMeeting(meetingUri, source);
  console.log(`Copying meeting ${meeting.uuid} ...`);
  await copyObject(meetingUri,
    meetingProperties,
    source,
    targets);
  if (meeting.documents.length) {
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
  const copyItems = meeting.agendaItems.map(async agendaItemUri => {
    console.log(`Copying agendaItem and related documents for ${agendaItemUri} ...`);
    const agendaItem = await getAgendaItem(agendaItemUri, source);
    await copyObject(agendaItemUri,
      agendaItemProperties,
      source,
      targets);
    if (agendaItem.documents.length) {
      await copyDocuments(agendaItem.documents,
        source,
        [graphs['kabinet']],
        accessLevels['kabinet']
      );
      await copyDocuments(agendaItem.documents,
        source,
        [graphs['adviesverlener']],
        accessLevels['adviesverlener']
      );
    }
  });
  return Promise.all(copyItems);
};

const runAgendaRetraction = async function (meetingUri) {
  console.log(`Retracting agenda for meeting ${meetingUri} ...`);
  const retractTargets = targets.map(async (graph) => {
    console.log(`Retracting agenda for group ${graph} ...`);
    const meeting = await getMeeting(meetingUri, graph);
    if (meeting.documents.length) {
      console.log(`Retracting ${meeting.documents.length} meeting documents ...`);
      await deleteDocuments(meeting.documents,
        [graph]);
    }
    const retractItems = meeting.agendaItems.map(async agendaItemUri => {
      console.log(`Retracting documents for item ${agendaItemUri} ...`);
      const agendaItem = await getAgendaItem(agendaItemUri, graph);
      const allDocuments = agendaItem.notification ? [agendaItem.notification, ...agendaItem.documents] : agendaItem.documents;
      if (allDocuments.length) {
        await deleteDocuments(allDocuments, [graph]);
      }
      console.log(`Retracting item ${agendaItemUri} itself ...`);
      await deleteObject(agendaItemUri, [graph]);
    });
    await Promise.all(retractItems);
    console.log(`Retracting meeting ${meetingUri} itself ...`);
    return deleteObject(meetingUri, [graph]);
  });
  return Promise.all(retractTargets);
};

const runNotificationDistribution = async function (meetingUri) {
  const meeting = await getMeeting(meetingUri, source);
  const copyItems = meeting.agendaItems.map(async agendaItemUri => {
    console.log(`Copying notification and related documents for agendaItem ${agendaItemUri} ...`);
    const agendaItem = await getAgendaItem(agendaItemUri, source);
    const allDocuments = agendaItem.notification ? [agendaItem.notification, ...agendaItem.documents] : agendaItem.documents;
    if (allDocuments.length) {
      await copyObject(agendaItemUri,
        [
          expand`oc:notification`,
          expand`oc:documents`,
          expand`oc:notificationRelatedDocuments`
        ],
        source,
        targets);
      await copyDocuments([agendaItem.notification],
        source,
        [graphs['kabinet']],
        accessLevels['kabinet']
      );
      await copyDocuments([agendaItem.notification],
        source,
        [graphs['adviesverlener']],
        accessLevels['adviesverlener']
      );
      await copyDocuments(allDocuments,
        source,
        [graphs['parlement']],
        accessLevels['parlement']
      );
    }
  });
  return Promise.all(copyItems);
};

const runNotificationsRetraction = async function (meetingUri) {
  console.log(`Retracting notifications for meeting ${meetingUri} ...`);
  const retractTargets = targets.map(async (graph) => {
    console.log(`Retracting notifications for group ${graph} ...`);
    const meeting = await getMeeting(meetingUri, graph);
    if (meeting) {
      const retractItems = meeting.agendaItems.map(async agendaItemUri => {
        console.log(`Retracting notifications for item ${agendaItemUri} ...`);
        const agendaItem = await getAgendaItem(agendaItemUri, graph);
        const allDocuments = agendaItem.notification ? [agendaItem.notification, ...agendaItem.documents] : agendaItem.documents;
        if (graph === graphs['parlement'] && allDocuments.length) {
          await deleteDocuments(allDocuments, [graph]);
        } else if (agendaItem.notification) {
          await deleteDocuments([agendaItem.notification], [graph]);
        }
      });
      return Promise.all(retractItems);
    } else {
      console.log(`No meeting ${meetingUri} in graph ${graph}`);
    }
  });
  return Promise.all(retractTargets);
};

export { runJob, runscheduledJobs };
