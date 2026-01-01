import { DocumentType } from "./types";

export const MARKETING_URL = "/";

export const DASHBOARD_URL = "/dashboard";

export const DOCUMENT_URL = (type: DocumentType, id: string) =>
  `/${type}/${id}`;

export const DASHBOARD_PRIVATE_URL = "/dashboard/private";

export const DASHBOARD_ORGANIZATION_URL = "/dashboard/organization";

export const DASHBOARD_PUBLIC_URL = "/dashboard/public";

export const ANONYMOUS_USER_ID = "anonymous";
