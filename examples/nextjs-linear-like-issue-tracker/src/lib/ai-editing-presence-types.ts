/** Keys sent in AI server presence `editingTypes` — match `AiPresenceEditFrame` `editingType` props. */
export const AI_EDITING_TYPE = {
  TITLE: "title",
  CONTENT: "content",
  LABELS: "labels",
  LINKS: "links",
  PROGRESS: "progress",
  PRIORITY: "priority",
  ASSIGNED_TO: "assignedTo",
} as const;

export type AiEditingPresenceType =
  (typeof AI_EDITING_TYPE)[keyof typeof AI_EDITING_TYPE];
