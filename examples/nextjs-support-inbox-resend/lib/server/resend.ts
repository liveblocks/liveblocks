import { Resend, type InboxMessage, type InboxSelector } from "resend";
import {
  feedIdForThread,
  messageIdForEmail,
  previewOf,
  type ConversationMetadata,
  type EmailMessageData,
} from "@/lib/conversation";
import { htmlToText, parseAddress } from "@/lib/email";
import { getLiveblocks } from "./liveblocks";

// Server-only. Resend Inboxes is the source of truth for external email;
// Liveblocks Feeds is the collaborative, realtime representation the agents
// work in. This module bridges the two.

export type ResendConfig = {
  apiKey: string;
  // The Resend inbox id (`inb_…`) or its email address, e.g. support@acme.com.
  inbox: string;
  webhookSecret: string | null;
};

export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.RESEND_INBOX_ID || process.env.RESEND_INBOX_EMAIL;
  if (!apiKey || !inbox) {
    return null;
  }
  return {
    apiKey,
    inbox,
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET || null,
  };
}

export function getResend(config: ResendConfig) {
  return new Resend(config.apiKey);
}

// Resend's `InboxSelector` accepts either an inbox id or its email address.
export function inboxSelector(inbox: string): InboxSelector {
  return inbox.includes("@") ? { emailAddress: inbox } : { inboxId: inbox };
}

export function emailBodyText(email: Pick<InboxMessage, "text" | "html">) {
  if (email.text && email.text.trim()) {
    return email.text.replace(/\r\n?/g, "\n").trim();
  }
  if (email.html) {
    return htmlToText(email.html);
  }
  return "";
}

/**
 * Mirrors one Resend inbox email into the Liveblocks feed of its thread,
 * creating the feed if this is the first email we see for the thread. The
 * operation is idempotent: feed and message ids are derived from the Resend
 * thread and email ids, and we skip emails that are already in the feed, so
 * webhook retries never produce duplicates.
 */
export async function syncEmailToFeed({
  roomId,
  inboxId,
  threadId,
  subject,
  email,
  authorId = "",
}: {
  roomId: string;
  inboxId: string;
  threadId: string;
  subject: string | null;
  email: InboxMessage;
  // Agent who sent an outbound email from this app, if known.
  authorId?: string;
}) {
  const liveblocks = getLiveblocks();
  const feedId = feedIdForThread(threadId);
  const messageId = messageIdForEmail(email.id);
  const receivedAt = Date.parse(email.received_at) || Date.now();
  const text = emailBodyText(email);
  const inbound = email.direction === "inbound";

  // The customer is whoever is on the other end of the thread.
  const customer = inbound
    ? parseAddress(email.from)
    : parseAddress(email.to[0] ?? email.from);

  // The webhook may fire before any agent has opened the inbox.
  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: ["room:write"],
  });

  const feed = await getFeedOrNull(liveblocks, roomId, feedId);
  let metadata: ConversationMetadata;

  if (feed) {
    metadata = feed.metadata;
  } else {
    metadata = {
      source: "resend",
      resendThreadId: threadId,
      resendInboxId: inboxId,
      lastInboundEmailId: inbound ? email.id : "",
      subject: subject || email.subject || "(no subject)",
      preview: previewOf(text),
      customerName: customer.name,
      customerEmail: customer.email,
      customerCompany: companyFromEmail(customer.email),
      category: "",
      status: inbound ? "needs-response" : "waiting",
      priority: "normal",
      assigneeId: "",
      lastActivityAt: new Date(receivedAt).toISOString(),
      mentionedUserIds: [],
    };
    try {
      await liveblocks.createFeed({
        roomId,
        feedId,
        metadata,
        createdAt: receivedAt,
      });
    } catch {
      // Lost a race with a concurrent webhook delivery; the feed now exists.
    }
  }

  // Dedupe: skip if this email has already been synced.
  const { data: existing } = await liveblocks.getFeedMessages({
    roomId,
    feedId,
  });
  if (existing.some((message) => message.id === messageId)) {
    return { feedId, messageId, created: false };
  }

  const data: EmailMessageData = {
    kind: "email",
    direction: email.direction,
    status: "sent",
    resendEmailId: email.id,
    from: parseAddress(email.from),
    to: email.to.map((address) => parseAddress(address).email),
    cc: email.cc.map((address) => parseAddress(address).email),
    subject: email.subject ?? subject ?? "",
    text,
    attachments: email.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename ?? "attachment",
      size: attachment.size,
    })),
    authorId,
    simulated: false,
  };

  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    id: messageId,
    createdAt: receivedAt,
    data,
  });

  // Keep the list-level summary in sync. A new customer email puts the ball
  // back in the team's court (reopening a resolved conversation); a reply
  // hands it to the customer. Metadata is written as a whole object, so merge
  // onto what the feed already has.
  await liveblocks.updateFeed({
    roomId,
    feedId,
    metadata: {
      ...metadata,
      preview: previewOf(text),
      lastActivityAt: new Date(receivedAt).toISOString(),
      ...(inbound
        ? { lastInboundEmailId: email.id, status: "needs-response" }
        : metadata.status !== "resolved"
          ? { status: "waiting" }
          : {}),
    },
  });

  return { feedId, messageId, created: true };
}

/**
 * Writes the final state of a reply the client already added to the feed as
 * a "sending" message. Replacing the whole message (rather than patching it)
 * keeps this idempotent, so the reply route and the `inbox.email.sent`
 * webhook can both settle the same message safely.
 */
export async function settleReply({
  roomId,
  feedId,
  messageId,
  data,
}: {
  roomId: string;
  feedId: string;
  messageId: string;
  data: EmailMessageData;
}) {
  const liveblocks = getLiveblocks();
  try {
    await liveblocks.updateFeedMessage({ roomId, feedId, messageId, data });
  } catch (error) {
    // The client's write hasn't landed (or was discarded); keep the record.
    if (!isNotFound(error)) throw error;
    await liveblocks.createFeedMessage({ roomId, feedId, id: messageId, data });
  }
}

/**
 * Removes a pending ("sending") reply that could not be sent, so it doesn't
 * linger in the thread if the agent's tab is gone. Best effort: the client
 * removes it too, and the message may already be gone.
 */
export async function discardPendingReply({
  roomId,
  feedId,
  messageId,
}: {
  roomId: string;
  feedId: string;
  messageId: string;
}) {
  const liveblocks = getLiveblocks();
  try {
    await liveblocks.deleteFeedMessage({ roomId, feedId, messageId });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

/**
 * Handles an `inbox.email.sent` webhook for an email this app sent: finds the
 * pending reply by its Resend email id and marks it "sent". Returns false
 * when no such reply exists in the feed.
 */
export async function confirmSentEmail({
  roomId,
  threadId,
  emailId,
}: {
  roomId: string;
  threadId: string;
  emailId: string;
}) {
  const liveblocks = getLiveblocks();
  const feedId = feedIdForThread(threadId);
  const feed = await getFeedOrNull(liveblocks, roomId, feedId);
  if (!feed) return false;

  const { data: messages } = await liveblocks.getFeedMessages({
    roomId,
    feedId,
  });
  const pending = messages.find(
    (message) =>
      message.data.kind === "email" &&
      message.data.resendEmailId === emailId
  );
  if (!pending || pending.data.kind !== "email") return false;

  if (pending.data.status !== "sent") {
    await settleReply({
      roomId,
      feedId,
      messageId: pending.id,
      data: { ...pending.data, status: "sent" },
    });
  }
  return true;
}

async function getFeedOrNull(
  liveblocks: ReturnType<typeof getLiveblocks>,
  roomId: string,
  feedId: string
) {
  try {
    return await liveblocks.getFeed({ roomId, feedId });
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

// "priya@northwindanalytics.com" → "northwindanalytics.com"; generic mail
// providers don't tell us anything about the company.
const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "resend.dev",
]);

export function companyFromEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || GENERIC_DOMAINS.has(domain)) {
    return "";
  }
  return domain;
}
