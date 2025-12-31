import { DocumentType } from "./types";

export const MARKETING_URL = "/";

export const DASHBOARD_URL = "/dashboard";

export const DOCUMENT_URL = (type: DocumentType, id: string) =>
  `/${type}/${id}`;

export const ANONYMOUS_USER_ID = "anonymous";
