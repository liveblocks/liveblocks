export type Authentication =
  | {
      type: "public";
      publicApiKey: string;
    }
  | {
      type: "private";
      url: string;
    }
  | {
      type: "custom";
      callback: (room: string) => Promise<{ token: string }>;
    };
