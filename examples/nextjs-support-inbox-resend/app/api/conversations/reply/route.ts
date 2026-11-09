import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/database";
import { isExampleRoomId, type EmailMessageData } from "@/lib/conversation";
import type { ReplyRequest, ReplyResponse } from "@/lib/api";
import { parseAddress, textToHtml } from "@/lib/email";
import { getLiveblocks, isLiveblocksConfigured } from "@/lib/server/liveblocks";
import {
  getResend,
  getResendConfig,
  inboxSelector,
  isNotFound,
  settleReply,
} from "@/lib/server/resend";

const MAX_REPLY_LENGTH = 20_000;

/**
 * Sends an agent's reply to the customer.
 *
 * By the time this route is called, the client has already added the reply
 * to the conversation's feed as a "sending" message, so every agent sees it
 * instantly. This route emails it through the Resend Inboxes reply API (which
 * keeps it in the customer's thread) and then settles that same message:
 * "sent" with Resend's email id once Resend accepts it, or "failed" with the
 * reason so the agent can retry or discard. The `inbox.email.sent` webhook
 * confirms the send a second time, idempotently.
 *
 * Conversations that aren't backed by a Resend thread (the seeded demo data),
 * or deployments without Resend credentials, get a clearly-marked simulated
 * reply instead — no email is sent.
 */
export async function POST(request: NextRequest) {
  if (!isLiveblocksConfigured()) {
    return fail("Missing LIVEBLOCKS_SECRET_KEY", 403);
  }

  const body = (await request.json().catch(() => null)) as ReplyRequest | null;
  const roomId = body?.roomId;
  const feedId = body?.feedId;
  const messageId = body?.messageId;
  const text = body?.text?.trim();
  const agent = body?.userId ? getUser(body.userId) : undefined;

  if (!roomId || !isExampleRoomId(roomId) || !feedId || !messageId) {
    return fail("Invalid room or conversation", 400);
  }
  if (!agent) {
    return fail("Unknown agent", 403);
  }
  if (!text) {
    return fail("Reply can't be empty", 400);
  }
  if (text.length > MAX_REPLY_LENGTH) {
    return fail("Reply is too long", 413);
  }

  const liveblocks = getLiveblocks();

  let conversation;
  try {
    conversation = await liveblocks.getFeed({ roomId, feedId });
  } catch (error) {
    if (isNotFound(error)) {
      return fail("Conversation not found", 404);
    }
    throw error;
  }
  const metadata = conversation.metadata;
  const resend = getResendConfig();

  // Simulated reply: recorded in the feed for the team, never emailed.
  if (metadata.source !== "resend" || !resend) {
    const from = { name: agent.info.name, email: "support@relay.example" };
    const sentAt = new Date().toISOString();
    await settleReply({
      roomId,
      feedId,
      messageId,
      data: outboundEmail({
        metadata,
        agent,
        text,
        from,
        resendEmailId: "",
        status: "sent",
        simulated: true,
      }),
    });
    return NextResponse.json<ReplyResponse>({
      ok: true,
      simulated: true,
      resendEmailId: "",
      from,
      sentAt,
    });
  }

  // Real email, through Resend Inboxes.
  const client = getResend(resend);
  const inbox = metadata.resendInboxId
    ? inboxSelector(metadata.resendInboxId)
    : inboxSelector(resend.inbox);
  const from = { name: agent.info.name, email: resend.inbox };

  const settleFailure = async (reason: string, status: number) => {
    await settleReply({
      roomId,
      feedId,
      messageId,
      data: outboundEmail({
        metadata,
        agent,
        text,
        from,
        resendEmailId: "",
        status: "failed",
        failureReason: reason,
        simulated: false,
      }),
    });
    return fail(reason, status);
  };

  if (!metadata.lastInboundEmailId) {
    return settleFailure("There is no customer email to reply to yet", 409);
  }

  const sent = await client.inboxes.threads.emails.reply({
    ...inbox,
    threadId: metadata.resendThreadId,
    emailId: metadata.lastInboundEmailId,
    text,
    html: textToHtml(text),
  });

  if (sent.error) {
    return settleFailure(sent.error.message || "Resend rejected the email", 502);
  }

  // Prefer Resend's record of the sent email (exact sender and timestamp);
  // fall back to what we know if it isn't readable yet.
  const fetched = await client.inboxes.threads.emails.get({
    ...inbox,
    threadId: metadata.resendThreadId,
    emailId: sent.data.id,
  });
  const recordedFrom = fetched.data ? parseAddress(fetched.data.from) : from;
  const sentAt = fetched.data?.received_at ?? new Date().toISOString();

  await settleReply({
    roomId,
    feedId,
    messageId,
    data: outboundEmail({
      metadata,
      agent,
      text,
      from: recordedFrom,
      resendEmailId: sent.data.id,
      status: "sent",
      simulated: false,
    }),
  });

  return NextResponse.json<ReplyResponse>({
    ok: true,
    simulated: false,
    resendEmailId: sent.data.id,
    from: recordedFrom,
    sentAt,
  });
}

function outboundEmail({
  metadata,
  agent,
  text,
  from,
  resendEmailId,
  status,
  failureReason = "",
  simulated,
}: {
  metadata: Liveblocks["FeedMetadata"];
  agent: Liveblocks["UserMeta"];
  text: string;
  from: { name: string; email: string };
  resendEmailId: string;
  status: EmailMessageData["status"];
  failureReason?: string;
  simulated: boolean;
}): EmailMessageData {
  return {
    kind: "email",
    direction: "outbound",
    status,
    failureReason,
    resendEmailId,
    from,
    to: [metadata.customerEmail],
    cc: [],
    subject: metadata.subject,
    text,
    attachments: [],
    authorId: agent.id,
    simulated,
  };
}

function fail(error: string, status: number) {
  return NextResponse.json<ReplyResponse>({ ok: false, error }, { status });
}
