export const labels = [
  { id: "engineering", text: "Engineering" },
  { id: "design", text: "Design" },
  { id: "product", text: "Product" },
] as const;

export const priorityStates = [
  { id: "urgent", text: "Urgent" },
  { id: "high", text: "High" },
  { id: "medium", text: "Medium" },
  { id: "low", text: "Low" },
] as const;

export const progressStates = [
  { id: "todo", text: "Todo" },
  { id: "progress", text: "In Progress" },
  { id: "review", text: "In Review" },
  { id: "done", text: "Done" },
] as const;

export type ProgressState = (typeof progressStates)[number]["id"];
export type PriorityState = (typeof priorityStates)[number]["id"];
export type Label = (typeof labels)[number]["id"];
