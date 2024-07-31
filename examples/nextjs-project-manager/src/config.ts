import { RoomData } from "@liveblocks/node";

export const LABELS = [
  { id: "engineering", text: "Engineering" },
  { id: "design", text: "Design" },
  { id: "product", text: "Product" },
] as const;

export const PRIORITY_STATES = [
  { id: "none", text: "No priority" },
  { id: "urgent", text: "Urgent" },
  { id: "high", text: "High" },
  { id: "medium", text: "Medium" },
  { id: "low", text: "Low" },
] as const;

export const PROGRESS_STATES = [
  { id: "none", text: "No progress" },
  { id: "todo", text: "Todo" },
  { id: "progress", text: "In Progress" },
  { id: "review", text: "In Review" },
  { id: "done", text: "Done" },
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
