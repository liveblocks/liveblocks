import { RoomData } from "@liveblocks/node";
import { PriorityHighIcon } from "@/icons/PriorityHighIcon";
import { PriorityMediumIcon } from "@/icons/PriorityMediumIcon";
import { PriorityLowIcon } from "@/icons/PriorityLowIcon";
import { PriorityUrgentIcon } from "@/icons/PriorityUrgentIcon";
import { DashIcon } from "@/icons/DashIcon";
import { ProgressTodoIcon } from "@/icons/ProgressTodoIcon";
import { ProgressInProgressIcon } from "@/icons/ProgressInProgressIcon";
import { ProgressInReviewIcon } from "@/icons/ProgressInReviewIcon";
import { ProgressDoneIcon } from "@/icons/ProgressDoneIcon";

export const LABELS = [
  { id: "feature", text: "Feature", jsx: <>Feature</> },
  { id: "bug", text: "Bug", jsx: <>Bug</> },
  { id: "engineering", text: "Engineering", jsx: <>Engineering</> },
  { id: "design", text: "Design", jsx: <>Design</> },
  { id: "product", text: "Product", jsx: <>Product</> },
] as const;

export const PRIORITY_STATES = [
  {
    id: "none",
    icon: <DashIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center text-neutral-600">
        No priority
      </div>
    ),
  },
  {
    id: "urgent",
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
    icon: <PriorityLowIcon className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <PriorityLowIcon className="w-4 h-4 text-neutral-600" />
        Low
      </div>
    ),
  },
] as const;

export const PROGRESS_STATES = [
  {
    id: "none",
    jsx: (
      <div className="flex gap-2 items-center text-neutral-600">
        No progress
      </div>
    ),
  },
  {
    id: "todo",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressTodoIcon className="w-4 h-4 text-neutral-500" />
        Todo
      </div>
    ),
  },
  {
    id: "progress",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressInProgressIcon className="w-4 h-4 text-yellow-500" />
        In Progress
      </div>
    ),
  },
  {
    id: "review",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressInReviewIcon className="w-4 h-4 text-emerald-500" />
        In Review
      </div>
    ),
  },
  {
    id: "done",
    jsx: (
      <div className="flex gap-2 items-center">
        <ProgressDoneIcon className="w-4 h-4 text-indigo-500" />
        Done
      </div>
    ),
  },
] as const;

export type ProgressState = (typeof PROGRESS_STATES)[number]["id"];
export type PriorityState = (typeof PRIORITY_STATES)[number]["id"];
export type Label = (typeof LABELS)[number]["id"];

export function getRoomId(issueId: string) {
  return `liveblocks:examples:nextjs-project-manager-${issueId}`;
}

export type Metadata = {
  issueId: string;
  title: string;
  progress: ProgressState;
  priority: PriorityState;
  assignedTo: string | "none";
  labels: string[];
};

export type RoomWithMetadata = RoomData & { metadata: Metadata };
