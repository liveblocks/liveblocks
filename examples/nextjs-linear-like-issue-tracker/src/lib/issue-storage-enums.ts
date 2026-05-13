/** Plain ids — keep in sync with `src/config.tsx` progress / priority / labels. */

export const ISSUE_PROGRESS_IDS = [
  "none",
  "todo",
  "progress",
  "review",
  "done",
] as const;

export const ISSUE_PRIORITY_IDS = [
  "none",
  "urgent",
  "high",
  "medium",
  "low",
] as const;

export const ISSUE_LABEL_IDS = [
  "feature",
  "bug",
  "engineering",
  "design",
  "product",
] as const;

export type IssueProgressId = (typeof ISSUE_PROGRESS_IDS)[number];
export type IssuePriorityId = (typeof ISSUE_PRIORITY_IDS)[number];
export type IssueLabelId = (typeof ISSUE_LABEL_IDS)[number];

export type IssuePropertyUpdates = {
  title?: string;
  progress?: IssueProgressId;
  priority?: IssuePriorityId;
  assignedTo?: string | "none";
  labels?: IssueLabelId[];
};
