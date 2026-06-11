import type { DocRoom } from "./room-ids";

export const DOCS_PAGE_SIZE = 20;

export type DocsPage = {
  docs: DocRoom[];
  nextCursor: string | null;
};
