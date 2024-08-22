export enum HistoryVersionType {
  YJS = "YJS",
  STORAGE = "STORAGE",
}

export type HistoryVersion = {
  createdAt: Date;
  id: string;
  type: HistoryVersionType;
  authors: string[];
};