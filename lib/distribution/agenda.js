import { getMeeting, getAgendaItem } from '../../queries/oc';
import { copyObject, deleteObject } from '../../queries/distribution/generic';
import { copyDocuments, deleteDocuments } from '../../queries/distribution/documents';
import { meeting as meetingProperties, agendaItem as agendaItemProperties } from '../../config/properties';
import { accessLevelsByGraph } from '../../config/access-levels';
import { graphs, source, targets } from '../../config/graphs';

const runAgendaDistribution = async function (meetingUri) {
  const meeting = await getMeeting(meetingUri, source);
  if (meeting) {
    console.log(`Copying meeting ${meeting.uuid} ...`);
    await copyObject(meetingUri,
      meetingProperties,
      source,
      targets);
    if (meeting.documents.length) {
      console.log(`Copying ${meeting.documents.length} meeting documents ...`);
      for (let [graph, accessLevels] of Object.entries(accessLevelsByGraph)) {
        await copyDocuments(meeting.documents,
          source,
          [graph],
          accessLevels
        );
      }
    }
  }
  for (let agendaItemUri of meeting?.agendaItems ?? []) {
    console.log(`Copying agendaItem and related documents for ${agendaItemUri} ...`);
    const agendaItem = await getAgendaItem(agendaItemUri, source);
    await copyObject(agendaItemUri,
      agendaItemProperties,
      source,
      targets);
    if (agendaItem.documents.length) {
      await copyDocuments(agendaItem.documents,
        source,
        [graphs['minister']],
        accessLevelsByGraph[graphs['minister']]
      );
      await copyDocuments(agendaItem.documents,
        source,
        [graphs['kabinet']],
        accessLevelsByGraph[graphs['kabinet']]
      );
    }
  }
};

const runAgendaRetraction = async function (meetingUri) {
  console.log(`Retracting agenda for meeting ${meetingUri} ...`);
  for (let graph of targets) {
    console.log(`Retracting agenda for group ${graph} ...`);
    const meeting = await getMeeting(meetingUri, graph);
    if (meeting) {
      if (meeting.documents.length) {
        console.log(`Retracting ${meeting.documents.length} meeting documents ...`);
        await deleteDocuments(meeting.documents,
          [graph]);
      }
      for (let agendaItemUri of meeting.agendaItems ?? []) {
        console.log(`Retracting documents for item ${agendaItemUri} ...`);
        const agendaItem = await getAgendaItem(agendaItemUri, graph);
        if (agendaItem) {
          const allDocuments = agendaItem.notification ? [agendaItem.notification, ...agendaItem.documents] : agendaItem.documents;
          if (allDocuments.length) {
            await deleteDocuments(allDocuments, [graph]);
          }
          console.log(`Retracting item ${agendaItemUri} itself ...`);
          await deleteObject(agendaItemUri, [graph]);
        }
      }
      console.log(`Retracting meeting ${meetingUri} itself ...`);
      await deleteObject(meetingUri, [graph]);
    } else {
      console.log(`No meeting ${meetingUri} in graph ${graph}`);
    }
  }
};

export { runAgendaDistribution, runAgendaRetraction };
