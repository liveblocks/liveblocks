declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key. Users are
    // the support agents of the "Relay" workspace (see `app/database.ts`).
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
        title: string;
      };
    };

    // Realtime presence, shared with everyone in the room (= the shared
    // inbox). Holds the id of the conversation (feed) the agent is currently
    // reading, so teammates see live avatars on the thread they're viewing.
    Presence: {
      viewingFeedId: string | null;
    };

    // One feed per email conversation. Feed metadata can only hold strings
    // (or string arrays), so every field below is a string. Absent values are
    // stored as empty strings.
    FeedMetadata: {
      // "resend" conversations are backed by a real Resend Inboxes thread;
      // "demo" conversations are seeded sample data and replies to them are
      // simulated (never sent through Resend).
      source: "resend" | "demo";
      // Stable mapping to the Resend thread this feed mirrors.
      resendThreadId: string;
      resendInboxId: string;
      // The id of the latest inbound email, used as the `emailId` to reply to
      // with the Resend Inboxes reply API (preserves email threading).
      lastInboundEmailId: string;
      subject: string;
      // Short snippet of the latest email, shown in the conversation list.
      preview: string;
      customerName: string;
      customerEmail: string;
      customerCompany: string;
      category: "billing" | "feature-request" | "account" | "feedback" | "technical" | "";
      status: "open" | "resolved";
      priority: "low" | "normal" | "high" | "urgent";
      // Id of the assigned agent, or "" when unassigned.
      assigneeId: string;
      // Whether the conversation has unread customer emails (shared state of
      // the inbox, like a real shared mailbox).
      unread: "true" | "false";
      // ISO timestamp of the latest email or internal note.
      lastActivityAt: string;
      // Agents @-mentioned in internal notes on this conversation.
      mentionedUserIds: string[];
    };

    // One feed message per email or internal note.
    FeedMessageData:
      | {
          kind: "email";
          direction: "inbound" | "outbound";
          // Delivery state of an outbound reply. The client writes the
          // message as "sending" the moment the agent hits send, so everyone
          // sees it instantly; it becomes "sent" once Resend accepts the email
          // (and the `inbox.email.sent` webhook confirms it), or "failed" with
          // a reason. Inbound emails are always "sent".
          status: "sending" | "sent" | "failed";
          failureReason: string;
          // Resend email id, or "" until the email is sent (and always "" for
          // simulated demo emails).
          resendEmailId: string;
          from: { name: string; email: string };
          to: string[];
          cc: string[];
          subject: string;
          // Plain-text body (HTML emails are converted server-side).
          text: string;
          attachments: { id: string; filename: string; size: number | null }[];
          // Id of the agent who sent an outbound email, "" for inbound ones.
          authorId: string;
          // True when the email was not actually sent (demo mode).
          simulated: boolean;
        }
      | {
          kind: "note";
          authorId: string;
          text: string;
          mentionedUserIds: string[];
        };
  }
}

export {};
