"use server";

import { checkDocumentAccess } from "@/lib/ai/documentAccess";
import { runFlowchartAgent } from "./agent";

export type FlowchartAgentActionState =
  | { ok: true; error?: never }
  | { ok?: never; error: string }
  | null;

export async function submitFlowchartAgentAction(
  _: FlowchartAgentActionState,
  formData: FormData
): Promise<FlowchartAgentActionState> {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return { error: "Liveblocks is not configured." };
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return { error: "AI prompting is not configured." };
  }

  const roomId = String(formData.get("roomId") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (roomId === "" || prompt === "") {
    return { error: "Enter a prompt to edit the flowchart." };
  }

  const access = await checkDocumentAccess(roomId, "write");

  if (access.error) {
    return { error: access.error.message };
  }

  try {
    await runFlowchartAgent(roomId, prompt);

    return { ok: true };
  } catch (error) {
    console.error(error);

    return { error: "Unable to edit the flowchart with AI." };
  }
}
