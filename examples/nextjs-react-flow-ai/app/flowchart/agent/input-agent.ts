"use server";

import { runFlowchartAgent } from "./agent";

type FlowchartAgentActionState = { ok: true } | null;

export async function submitFlowchartAgentAction(
  _: FlowchartAgentActionState,
  formData: FormData
): Promise<FlowchartAgentActionState> {
  if (!process.env.LIVEBLOCKS_SECRET_KEY || !process.env.OPENAI_API_KEY) {
    return null;
  }

  const roomId = String(formData.get("roomId") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (roomId === "" || prompt === "") {
    return null;
  }

  try {
    await runFlowchartAgent(roomId, prompt);

    return { ok: true };
  } catch (error) {
    console.error(error);

    return null;
  }
}
