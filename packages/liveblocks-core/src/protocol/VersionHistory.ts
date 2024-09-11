export type HistoryVersion = {
  type: "historyVersion";
  kind: "yjs";
  createdAt: Date;
  id: string;
  authors: {
    id: string;
  }[];
};
