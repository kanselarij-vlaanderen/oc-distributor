import { getMeeting, getAgendaItem } from '../../queries/oc';
import { copyObject } from '../../queries/distribution/generic';
import { copyDocuments, deleteDocuments } from '../../queries/distribution/documents';
import * as accessLevels from '../../config/access-levels';
import { graphs, source, targets } from '../../config/graphs';
import { expand } from '../../config/prefixes';

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
        [graphs['minister']],
        accessLevels.accessLevelsByGraph[graphs['minister']]
      );
      await copyDocuments([agendaItem.notification],
        source,
        [graphs['kabinet']],
        accessLevels.accessLevelsByGraph[graphs['kabinet']]
      );
      await copyDocuments(allDocuments,
        source,
        [graphs['administratie']],
        accessLevels.accessLevelsByGraph[graphs['administratie']]
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
        if (graph === graphs['administratie'] && allDocuments.length) {
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

export { runNotificationDistribution, runNotificationsRetraction };
