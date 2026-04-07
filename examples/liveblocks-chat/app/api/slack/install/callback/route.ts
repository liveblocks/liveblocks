import { bot } from "@/app/bot";

export async function GET(request: Request) {
  const adapter = bot.getAdapter("slack");

  if (!adapter) {
    return new Response("Slack adapter is not configured", { status: 500 });
  }

  try {
    await bot.initialize();
    const { teamId } = await adapter.handleOAuthCallback(request);
    return new Response(`Slack app installed for team ${teamId}!`);
  } catch (error) {
    console.error("[slack/install/callback] OAuth error:", error);
    return new Response("OAuth installation failed", { status: 500 });
  }
}
