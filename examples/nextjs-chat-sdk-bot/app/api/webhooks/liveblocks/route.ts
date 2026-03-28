import { bot } from "@/app/bot";

export async function POST(request: Request) {
  // Use your runtime's waitUntil for background processing (e.g. Vercel waitUntil)
  return bot.webhooks.liveblocks(request, {
    waitUntil: (p) => void p,
  });
}
