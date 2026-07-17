/**
 * One version of an HTML component, stored as a Liveblocks feed message.
 * The full feed is the component's version history.
 */
export type HtmlVersionData = {
  prompt: string;
  html: string;
  status: "generating" | "complete" | "error";
  source: "ai" | "edit" | "restore";
  error?: string;
};
