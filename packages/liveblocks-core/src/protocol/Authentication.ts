export type CustomAuthenticationResult =
  | { token: string; error?: never }
  | { token?: never; error: "forbidden"; reason: string } // Will stop retrying and disconnect
  | { token?: never; error: string; reason: string }; // Will log the error and keep retrying

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
      callback: (room: string) => Promise<CustomAuthenticationResult>;
    };
