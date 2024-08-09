import { RoomData } from "@liveblocks/node";
import { Tally4 } from "@/icons/Tally4";
import { Tally3 } from "@/icons/Tally3";
import { Tally2 } from "@/icons/Tally2";
import { Tally5 } from "@/icons/Tally5";
import { Dash } from "@/icons/Dash";
import { Todo } from "@/icons/Todo";
import { Progress } from "@/icons/Progress";
import { Review } from "@/icons/Review";
import { Done } from "@/icons/Done";

export const LABELS = [
  { id: "feature", text: "Feature" },
  { id: "bug", text: "Bug" },
  { id: "engineering", text: "Engineering" },
  { id: "design", text: "Design" },
  { id: "product", text: "Product" },
] as const;

export const PRIORITY_STATES = [
  {
    id: "none",
    icon: <Dash className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center text-neutral-600">
        {/*<Dash className="w-4 h-4 text-neutral-600" />*/}
        No priority
      </div>
    ),
  },
  {
    id: "urgent",
    icon: <Tally5 className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <Tally5 className="w-4 h-4 text-neutral-600" />
        Urgent
      </div>
    ),
  },
  {
    id: "high",
    icon: <Tally4 className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <Tally4 className="w-4 h-4 text-neutral-600" />
        High
      </div>
    ),
  },
  {
    id: "medium",
    icon: <Tally3 className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <Tally3 className="w-4 h-4 text-neutral-600" />
        Medium
      </div>
    ),
  },
  {
    id: "low",
    icon: <Tally2 className="w-4 h-4 text-neutral-600" />,
    jsx: (
      <div className="flex gap-2 items-center">
        <Tally2 className="w-4 h-4 text-neutral-600" />
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
        {/*<Dash className="w-4 h-4 text-neutral-600" />*/}
        No progress
      </div>
    ),
  },
  {
    id: "todo",
    jsx: (
      <div className="flex gap-2 items-center">
        <Todo className="w-4 h-4 text-neutral-600" />
        Todo
      </div>
    ),
  },
  {
    id: "progress",
    jsx: (
      <div className="flex gap-2 items-center">
        <Progress className="w-4 h-4 text-yellow-600" />
        In Progress
      </div>
    ),
  },
  {
    id: "review",
    jsx: (
      <div className="flex gap-2 items-center">
        <Review className="w-4 h-4 text-emerald-600" />
        In Review
      </div>
    ),
  },
  {
    id: "done",
    jsx: (
      <div className="flex gap-2 items-center">
        <Done className="w-4 h-4 text-blue-600" />
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
