export type ExampleEnvironmentVariable = {
  name: string;
  type: "public" | "secret";
};

export interface DecodedEnvsAndCallbacks {
  env: ExampleEnvironmentVariable[];
  callbackUrls?: string[];
}

export interface GeneralCallbackFormat {
  env: Record<string, string>;
}

export type RepoLocation = { type: string; location: string };

export interface VercelCallbackFormat extends GeneralCallbackFormat {
  env: Record<string, string>;
  repo: RepoLocation;
}
