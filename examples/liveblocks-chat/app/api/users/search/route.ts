import { NextRequest, NextResponse } from "next/server";
import { getBotDisplayName, getBotUserId } from "@/app/lib/users";

/**
 * Mention suggestions for the comment composer (@).
 * Always surface the bot so @Acme AI / @bot works.
 */
export async function GET(request: NextRequest) {
  const text = (new URL(request.url).searchParams.get("text") ?? "").trim();
  const botId = getBotUserId();
  const name = getBotDisplayName().toLowerCase();
  const q = text.toLowerCase();
  const nameWords = name.split(/\s+/).filter(Boolean);

  const matchesBot =
    q.length === 0 ||
    name.includes(q) ||
    nameWords.some((w) => w.startsWith(q)) ||
    "bot".startsWith(q) ||
    botId.toLowerCase().includes(q) ||
    q === "ai" ||
    "acme".startsWith(q);

  const ids = matchesBot ? [botId] : [];

  return NextResponse.json(ids);
}
