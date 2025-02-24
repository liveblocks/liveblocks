import type { Relax } from "../lib/Relax";

export type CustomAuthenticationResult = Relax<
  | { token: string }
  | { error: "forbidden"; reason: string } // Will stop retrying and disconnect
  | { error: string; reason: string } // Will log the error and keep retrying
>;

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
      callback: (room?: string) => Promise<CustomAuthenticationResult>;
    };
