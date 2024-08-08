import { RoomData } from "@liveblocks/node";

export const LABELS = [
  { id: "feature", text: "Feature" },
  { id: "bug", text: "Bug" },
  { id: "engineering", text: "Engineering" },
  { id: "design", text: "Design" },
  { id: "product", text: "Product" },
] as const;

export const PRIORITY_STATES = [
  { id: "none", text: "No priority", jsx: <div>No priority</div> },
  { id: "urgent", text: "Urgent", jsx: <div>Urgent</div> },
  { id: "high", text: "High", jsx: <div>High</div> },
  { id: "medium", text: "Medium", jsx: <div>Medium</div> },
  { id: "low", text: "Low", jsx: <div>Low</div> },
] as const;

export const PROGRESS_STATES = [
  { id: "none", text: "No progress", jsx: <div>No progress</div> },
  { id: "todo", text: "Todo", jsx: <div>Todo</div> },
  { id: "progress", text: "In Progress", jsx: <div>In Progress</div> },
  { id: "review", text: "In Review", jsx: <div>In Review</div> },
  { id: "done", text: "Done", jsx: <div>Done</div> },
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
