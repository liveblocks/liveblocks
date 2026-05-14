import { RoomData } from "@liveblocks/node";
import { type ReactNode } from "react";
import { PriorityHighIcon } from "@/icons/PriorityHighIcon";
import { PriorityMediumIcon } from "@/icons/PriorityMediumIcon";
import { PriorityLowIcon } from "@/icons/PriorityLowIcon";
import { PriorityUrgentIcon } from "@/icons/PriorityUrgentIcon";
import { DashIcon } from "@/icons/DashIcon";
import { ProgressTodoIcon } from "@/icons/ProgressTodoIcon";
import { ProgressInProgressIcon } from "@/icons/ProgressInProgressIcon";
import { ProgressInReviewIcon } from "@/icons/ProgressInReviewIcon";
import { ProgressDoneIcon } from "@/icons/ProgressDoneIcon";

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

export const LABELS = [
  { id: "feature", text: "Feature", jsx: <>Feature</> },
  { id: "bug", text: "Bug", jsx: <>Bug</> },
  { id: "engineering", text: "Engineering", jsx: <>Engineering</> },
  { id: "design", text: "Design", jsx: <>Design</> },
  { id: "product", text: "Product", jsx: <>Product</> },
] as const satisfies readonly {
  id: IssueLabelId;
  text: string;
  jsx: ReactNode;
}[];

export const PRIORITY_STATES = [
  {
    id: "none",
    text: "No priority",
    icon: <DashIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center text-neutral-600">
        No priority
      </div>
    ),
  },
  {
    id: "urgent",
    text: "Urgent",
    icon: <PriorityUrgentIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <PriorityUrgentIcon className="w-4 h-4 text-neutral-600" />
        Urgent
      </div>
    ),
  },
  {
    id: "high",
    text: "High",
    icon: <PriorityHighIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <PriorityHighIcon className="w-4 h-4 text-neutral-600" />
        High
      </div>
    ),
  },
  {
    id: "medium",
    text: "Medium",
    icon: <PriorityMediumIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <PriorityMediumIcon className="w-4 h-4 text-neutral-600" />
        Medium
      </div>
    ),
  },
  {
    id: "low",
    text: "Low",
    icon: <PriorityLowIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <PriorityLowIcon className="w-4 h-4 text-neutral-600" />
        Low
      </div>
    ),
  },
] as const satisfies readonly {
  id: IssuePriorityId;
  text: string;
  icon: ReactNode;
  jsx: ReactNode;
}[];

export const PROGRESS_STATES = [
  {
    id: "none",
    text: "No progress",
    jsx: (
      <div className="flex gap-2 items-center text-neutral-600">
        No progress
      </div>
    ),
  },
  {
    id: "todo",
    text: "Todo",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressTodoIcon className="w-4 h-4 text-neutral-500" />
        Todo
      </div>
    ),
  },
  {
    id: "progress",
    text: "In Progress",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressInProgressIcon className="w-4 h-4 text-yellow-500" />
        In Progress
      </div>
    ),
  },
  {
    id: "review",
    text: "In Review",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressInReviewIcon className="w-4 h-4 text-emerald-500" />
        In Review
      </div>
    ),
  },
  {
    id: "done",
    text: "Done",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressDoneIcon className="w-4 h-4 text-indigo-500" />
        Done
      </div>
    ),
  },
] as const satisfies readonly {
  id: IssueProgressId;
  text: string;
  jsx: ReactNode;
}[];

const ROOM_PREFIX = "liveblocks:examples:nextjs-project-manager-";

export function getRoomId(issueId: string) {
  return `${ROOM_PREFIX}${issueId}`;
}

export function getIssueId(roomId: string) {
  return roomId.split(ROOM_PREFIX)[1];
}

export type Metadata = {
  issueId: string;
  title: string;
  progress: IssueProgressId;
  priority: IssuePriorityId;
  assignedTo: string | "none";
  labels: string[];
};

export type RoomWithMetadata = RoomData & { metadata: Metadata };
