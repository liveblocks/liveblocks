import { NextRequest, NextResponse } from "next/server";
import type { WebhookEventPayload } from "resend";
import { BASE_ROOM_ID } from "@/lib/conversation";
import { isLiveblocksConfigured } from "@/lib/server/liveblocks";
import {
  confirmSentEmail,
  getResend,
  getResendConfig,
  inboxSelector,
  syncEmailToFeed,
} from "@/lib/server/resend";

/**
 * Resend Inboxes webhook. Point a Resend webhook at
 * `https://<your-domain>/api/webhooks/resend` and subscribe it to the
 * `inbox.email.received` and `inbox.email.sent` events.
 *
 * Flow for every delivery:
 *   1. verify the signature with the webhook signing secret,
 *   2. for emails sent by this app, confirm the pending reply as "sent",
 *   3. otherwise fetch the full email (and its thread) from Resend,
 *   4. find or create the Liveblocks feed for the thread,
 *   5. append the email as a feed message, skipping it if it's already there.
 *
 * Returning a non-2xx status makes Resend retry the delivery, which is safe
 * because steps 2 and 5 are idempotent.
 */
export async function POST(request: NextRequest) {
  const config = getResendConfig();
  if (!config || !isLiveblocksConfigured()) {
    return new NextResponse("Resend or Liveblocks is not configured", {
      status: 503,
    });
  }
  if (!config.webhookSecret) {
    return new NextResponse("Missing RESEND_WEBHOOK_SECRET", { status: 503 });
  }

  const resend = getResend(config);

  // Verify the signature against the raw body before trusting anything.
  const payload = await request.text();
  let event: WebhookEventPayload;
  try {
    event = resend.webhooks.verify({
      payload,
      webhookSecret: config.webhookSecret,
      headers: {
        id: header(request, "svix-id", "webhook-id"),
        timestamp: header(request, "svix-timestamp", "webhook-timestamp"),
        signature: header(request, "svix-signature", "webhook-signature"),
      },
    });
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 401 });
  }

  if (
    event.type !== "inbox.email.received" &&
    event.type !== "inbox.email.sent"
  ) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const { inbox_id: inboxId, thread_id: threadId, email_id: emailId } =
    event.data;

  // Only mirror the inbox this deployment is connected to.
  if (!config.inbox.includes("@") && inboxId !== config.inbox) {
    return NextResponse.json({ ok: true, ignored: "other-inbox" });
  }

  // Replies sent from this app are already in the feed as a "sending" (or,
  // by now, "sent") message: this event is Resend's confirmation that the
  // email left. If the reply route hasn't recorded the email id yet, leave it
  // to the route rather than mirroring the email a second time.
  if (event.type === "inbox.email.sent" && event.data.source === "api") {
    const confirmed = await confirmSentEmail({
      roomId: BASE_ROOM_ID,
      threadId,
      emailId,
    });
    return NextResponse.json({ ok: true, confirmed });
  }

  const inbox = inboxSelector(inboxId);

  // The event only carries ids and headers; fetch the body and attachments.
  const [email, thread] = await Promise.all([
    resend.inboxes.threads.emails.get({ ...inbox, threadId, emailId }),
    resend.inboxes.threads.get({ ...inbox, threadId }),
  ]);

  if (email.error || !email.data) {
    // Resend will retry the delivery.
    return new NextResponse(
      `Could not fetch email: ${email.error?.message ?? "unknown error"}`,
      { status: 502 }
    );
  }

  const result = await syncEmailToFeed({
    roomId: BASE_ROOM_ID,
    inboxId,
    threadId,
    subject: thread.data?.subject ?? email.data.subject,
    email: email.data,
  });

  return NextResponse.json({ ok: true, ...result });
}

function header(request: NextRequest, ...names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) {
      return value;
    }
  }
  return "";
}
