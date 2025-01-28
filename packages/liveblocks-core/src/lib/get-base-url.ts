import { DEFAULT_BASE_URL } from "../constants";
import { getBaseUrlFromEnvVar } from "./environment";

export function getBaseUrl(baseUrl?: string | undefined): string {
  const targetBaseUrl = baseUrl ?? getBaseUrlFromEnvVar();

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
