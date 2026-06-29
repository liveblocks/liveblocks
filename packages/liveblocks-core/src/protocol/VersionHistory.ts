export type HistoryVersion = {
  id: `vh_${string}`;
  createdAt: Date;
  authors: { id: string }[];
};
