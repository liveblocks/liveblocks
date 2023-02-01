export type ExampleEnvironmentVariable = {
  name: string;
  type: "public" | "secret";
};

// This file should match liveblocks/liveblocks/packages/create-liveblocks-app/bin/templates/types.ts

// These are kept short because they need to be sent through encoded URL params
export enum IntegrationOrigin {
  NEXTJS_STARTER_KIT_FROM_VERCEL_TEMPLATE_MARKETPLACE = "NSK_VTM",
  NEXTJS_STARTER_KIT_FROM_CREATE_LIVEBLOCKS_APP_VERCEL_INTEGRATION = "NSK_CVI",
  NEXTJS_STARTER_KIT_FROM_CREATE_LIVEBLOCKS_APP_GENERAL_INTEGRATION = "NSK_CGI",
  NEXTJS_STARTER_KIT_FROM_VERCEL_DEPLOY_BUTTON = "NSK_VDB",
  EXAMPLE_FROM_CREATE_LIVEBLOCKS_APP_VERCEL_INTEGRATION = "EXA_CVI",
  EXAMPLE_FROM_CREATE_LIVEBLOCKS_APP_GENERAL_INTEGRATION = "EXA_CGI",
  EXAMPLE_FROM_VERCEL_DEPLOY_BUTTON = "EXA_VDB",
}

export interface GeneralIntegrationData {
  env: ExampleEnvironmentVariable[];
  callbackUrls?: string[];
  exampleNames?: string[];
  origin: IntegrationOrigin;
}

export interface VercelIntegrationData extends GeneralIntegrationData {
  envReady: { name: string; value: string | null }[];
}

export type IntegrationCallback = { url: string; data: any };

export interface GeneralIntegrationCallback {
  env: Record<string, string>;
}

export interface VercelIntegrationCallback extends GeneralIntegrationCallback {
  env: Record<string, string>;
  repo: { type: string; location: string };
}
