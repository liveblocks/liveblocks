"use server";

/**
 * Get AI Config
 *
 * Tells the client which optional AI features are configured through
 * environment variables, so the UI can hide what isn't available.
 */
export async function getAiConfig() {
  return {
    // AI chat/prompting for spreadsheet, flowchart, and slideshow documents,
    // powered by the Vercel AI Gateway.
    chatAiEnabled: Boolean(process.env.AI_GATEWAY_API_KEY),
    // AI replies when @mentioning the AI assistant in comments (spreadsheet
    // and flowchart documents), powered by Liveblocks webhooks.
    commentAiEnabled: Boolean(process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY),
  };
}
