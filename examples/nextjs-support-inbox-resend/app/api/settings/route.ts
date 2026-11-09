import { NextResponse } from "next/server";
import { getResend, getResendConfig } from "@/lib/server/resend";
import type { InboxSettings } from "@/lib/api";

/**
 * Tells the client whether the app is connected to a real Resend inbox. Only
 * non-sensitive information leaves the server.
 */
export async function GET() {
  const config = getResendConfig();

  if (!config) {
    const settings: InboxSettings = {
      mode: "demo",
      inboxAddress: null,
      webhookConfigured: false,
    };
    return NextResponse.json(settings);
  }

  let inboxAddress = config.inbox.includes("@") ? config.inbox : null;
  if (!inboxAddress) {
    const { data } = await getResend(config).inboxes.get(config.inbox);
    inboxAddress = data?.email_address ?? null;
  }

  const settings: InboxSettings = {
    mode: "resend",
    inboxAddress,
    webhookConfigured: config.webhookSecret !== null,
  };
  return NextResponse.json(settings);
}
