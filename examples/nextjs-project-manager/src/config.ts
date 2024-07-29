export const labels = {
  engineering: {
    text: "Engineering",
  },
  design: {
    text: "Design",
  },
  product: {
    text: "Product",
  },
};

export const priorityStates = {
  urgent: {
    text: "Urgent",
  },
  high: {
    text: "High",
  },
  medium: {
    text: "Medium",
  },
  low: {
    text: "Low",
  },
};

export const progressStates = {
  todo: {
    text: "Todo",
  },
  progress: {
    text: "In progress",
  },
  review: {
    text: "In review",
  },
  done: {
    text: "Done",
  },
};

export type ProgressStates = keyof typeof progressStates;
export type PriorityStates = keyof typeof priorityStates;
export type Labels = keyof typeof labels;
