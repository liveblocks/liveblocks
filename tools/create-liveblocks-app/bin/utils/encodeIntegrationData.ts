import { GeneralIntegrationData, VercelIntegrationData } from "../types";

export function encodeIntegrationData(
  data: VercelIntegrationData | GeneralIntegrationData
) {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}
