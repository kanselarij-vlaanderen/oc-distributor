import { getMeeting, getAgendaItem } from '../../queries/oc';
import { copyObject, deleteObject } from '../../queries/distribution/generic';
import { copyDocuments, deleteDocuments } from '../../queries/distribution/documents';
import { meeting as meetingProperties, agendaItem as agendaItemProperties } from '../../config/properties';
import * as accessLevels from '../../config/access-levels';
import { graphs, source, targets } from '../../config/graphs';

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

export { runAgendaDistribution, runAgendaRetraction };
