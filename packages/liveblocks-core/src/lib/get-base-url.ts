import { DEFAULT_BASE_URL } from "../constants";

const safeGet = (fn: () => string | undefined): string | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

const getFromEnvVar = (): string | undefined => {
  return (
    safeGet(() => process.env.LIVEBLOCKS_BASE_URL) ??
    safeGet(() => process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL) ??
    safeGet(
      () =>
        (
          import.meta as ImportMeta & {
            env: Record<string, string | undefined>;
          }
        ).env.VITE_LIVEBLOCKS_BASE_URL
    )
  );
};

export function getBaseUrl(baseUrl?: string | undefined): string {
  const targetBaseUrl = baseUrl ?? getFromEnvVar();

  if (
    typeof targetBaseUrl === "string" &&
    // Check on the value `undefined` because of our tsup config
    targetBaseUrl !== "undefined" &&
    targetBaseUrl.startsWith("http") // Must be http or https URL
  ) {
    return targetBaseUrl;
  } else {
    return DEFAULT_BASE_URL;
  }
}
