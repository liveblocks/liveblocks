export const LABELS = [
  { id: "engineering", text: "Engineering" },
  { id: "design", text: "Design" },
  { id: "product", text: "Product" },
] as const;

export const PRIORITY_STATES = [
  { id: "urgent", text: "Urgent" },
  { id: "high", text: "High" },
  { id: "medium", text: "Medium" },
  { id: "low", text: "Low" },
] as const;

export const PROGRESS_STATES = [
  { id: "todo", text: "Todo" },
  { id: "progress", text: "In Progress" },
  { id: "review", text: "In Review" },
  { id: "done", text: "Done" },
] as const;

export type ProgressState = (typeof PROGRESS_STATES)[number]["id"];
export type PriorityState = (typeof PRIORITY_STATES)[number]["id"];
export type Label = (typeof LABELS)[number]["id"];
