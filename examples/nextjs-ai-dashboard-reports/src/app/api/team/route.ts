import type { AiChatProps } from "@liveblocks/react-ui";
import { getDashboardTeamKnowledge } from "@/lib/dashboard-ai-knowledge";

export async function GET() {
  const aiKnowledge: AiChatProps["knowledge"] = getDashboardTeamKnowledge();

  return Response.json(aiKnowledge, { status: 200 });
}
