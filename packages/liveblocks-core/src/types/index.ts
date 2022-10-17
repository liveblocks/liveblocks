export type AuthorizeResponse = {
  token: string;
};

export type Authentication =
  | {
      type: "public";
      publicApiKey: string;
      url: string;
    }
  | {
      type: "private";
      url: string;
    }
  | {
      type: "custom";
      callback: (room: string) => Promise<AuthorizeResponse>;
    };
