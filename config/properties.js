import { expand } from './prefixes';

export const meeting = [
  expand`prov:startedAtTime`,
  expand`ext:agendaVrijgave`,
  expand`ext:notificatieVrijgave`,
  expand`ext:extraInfo`,
  expand`oc:agendaItem`,
  expand`oc:documents`
];

export const agendaItem = [
  expand`oc:priority`,
  expand`oc:subPriority`,
  expand`dct:subject`,
  // expand`oc:notification`,
  expand`oc:submitter`
  // expand`oc:documents`,
  // expand`oc:notificationRelatedDocuments`,
];

export const _case = [
  expand`dct:identifier`,
  expand`oc:caseAgendaItem`
];
