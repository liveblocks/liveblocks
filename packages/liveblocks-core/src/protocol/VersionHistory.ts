export type HistoryYjsVersion = {
  type: "version";
  document: "yjs";
  createdAt: Date;
  id: string;
  authors: string[];
};

// export type HistoryStorageVersion = {
//   type: "version";
//   document: "storage";
//   createdAt: Date;
//   id: string;
//   authors: string[];
// };

export type HistoryVersion = HistoryYjsVersion;

// export type HistoryVersion = HistoryYjsVersion | HistoryStorageVersion;
