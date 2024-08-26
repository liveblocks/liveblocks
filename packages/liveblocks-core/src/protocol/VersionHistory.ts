export type YjsVersion = {
  type: "version";
  kind: "yjs";
  createdAt: Date;
  id: string;
  authors: {
    id: string;
  }[];
};

// export type StorageVersion = {
//   type: "version";
//   kind: "storage";
//   createdAt: Date;
//   id: string;
//   authors: string[];
// };

export type Version = YjsVersion;

// export type Version = YjsVersion | StorageVersion;
