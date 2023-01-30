// This file should match liveblocks/liveblocks.io/src/app/pages/integrations/types.ts

export type ExampleEnvironmentVariable = {
  name: string;
  type: "public" | "secret";
};

export interface GeneralIntegrationCallback {
  env: Record<string, string>;
}

export interface VercelIntegrationCallback extends GeneralIntegrationCallback {
  env: Record<string, string>;
  repo: { type: string; location: string };
}

export interface GeneralIntegrationData {
  env: ExampleEnvironmentVariable[];
  callbackUrls?: string[];
  exampleNames?: string[];
}

export interface VercelIntegrationData extends GeneralIntegrationData {
  envReady: { name: string; value: string | null }[];
}

export type IntegrationCallback = { url: string; data: any };
