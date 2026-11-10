// Shared, framework-agnostic helpers for the conversation model. Safe to
// import from both server routes and client components.

// Shapes returned by `useFeeds()` / `useFeedMessages()`, narrowed to this
// app's metadata and message data.
type Feed<FM> = {
  feedId: string;
  metadata: FM;
  createdAt: number;
  updatedAt: number;
};
type FeedMessage<FMD> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: FMD;
};

export const EXAMPLE_NAME = "nextjs-support-inbox-resend";

// One Liveblocks room per shared inbox. The room id of the configured Resend
// inbox; gallery deployments append an `exampleId` suffix on the client.
export const BASE_ROOM_ID = `liveblocks:examples:${EXAMPLE_NAME}`;

export function isExampleRoomId(roomId: string) {
  return roomId === BASE_ROOM_ID || roomId.startsWith(`${BASE_ROOM_ID}-`);
}

export type ConversationMetadata = Liveblocks["FeedMetadata"];
export type Conversation = Feed<ConversationMetadata>;
export type ConversationMessage = FeedMessage<Liveblocks["FeedMessageData"]>;
export type EmailMessageData = Extract<
  Liveblocks["FeedMessageData"],
  { kind: "email" }
>;
export type NoteMessageData = Extract<
  Liveblocks["FeedMessageData"],
  { kind: "note" }
>;

export type Status = ConversationMetadata["status"];

export const STATUSES: Status[] = ["needs-response", "waiting", "resolved"];

export const STATUS_LABEL: Record<Status, string> = {
  "needs-response": "Needs response",
  waiting: "Waiting on customer",
  resolved: "Resolved",
};

export function isOpen(status: Status) {
  return status !== "resolved";
}
export type Priority = ConversationMetadata["priority"];
export type Category = Exclude<ConversationMetadata["category"], "">;

export const PRIORITIES: Priority[] = ["urgent", "high", "normal", "low"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const CATEGORY_LABEL: Record<Category, string> = {
  billing: "Billing",
  "feature-request": "Feature request",
  account: "Account access",
  feedback: "Product feedback",
  technical: "Technical issue",
};

// Feed ids are derived from the Resend thread id so a webhook retry (or a
// second webhook for the same thread) always resolves to the same feed.
export function feedIdForThread(resendThreadId: string) {
  return `thread_${resendThreadId}`;
}

// Likewise, message ids are derived from the Resend email id so re-delivered
// webhooks never create duplicate messages.
export function messageIdForEmail(resendEmailId: string) {
  return `email_${resendEmailId}`;
}

export function previewOf(text: string, max = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function isEmail(
  message: ConversationMessage
): message is FeedMessage<EmailMessageData> {
  return message.data.kind === "email";
}

export function isNote(
  message: ConversationMessage
): message is FeedMessage<NoteMessageData> {
  return message.data.kind === "note";
}

export function sortByCreatedAt<T extends { createdAt: number }>(items: T[]) {
  return [...items].sort((a, b) => a.createdAt - b.createdAt);
}

// Mentions are written as "@Full Name" in notes. We match them against the
// known agents so the "Mentions" view can filter conversations per agent.
export function extractMentionedUserIds(
  text: string,
  agents: { id: string; name: string }[]
) {
  const ids = new Set<string>();
  for (const agent of agents) {
    if (text.includes(`@${agent.name}`)) {
      ids.add(agent.id);
    }
  }
  return [...ids];
}
