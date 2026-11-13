// Request/response shapes shared between the API routes and the client.

// `GET /api/settings`: tells the client how the deployment is wired
// up, without exposing any secrets.
export type InboxSettings = {
  // "resend" when a Resend inbox is configured, "demo" otherwise (replies are
  // simulated and nothing is sent).
  mode: "resend" | "demo";
  // Email address of the connected inbox, when known.
  inboxAddress: string | null;
  webhookConfigured: boolean;
};

// `POST /api/conversations/reply`. The client has already written the reply
// into the feed as a "sending" message with this `messageId`; the route sends
// the email and flips that message to "sent", or removes it and reports why
// sending failed.
export type ReplyRequest = {
  roomId: string;
  feedId: string;
  messageId: string;
  userId: string;
  text: string;
};

export type ReplyResponse =
  | {
      ok: true;
      // True when nothing was emailed (demo conversation or no Resend keys).
      simulated: boolean;
      resendEmailId: string;
      // Sender address the customer sees, as recorded by Resend.
      from: { name: string; email: string };
      sentAt: string;
    }
  | { ok: false; error: string };
