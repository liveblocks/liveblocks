export type AiReplyRequest = {
  roomId: string;
  feedId: string;
  messages: { userId: string; content: string }[];
};

export const AI_HISTORY_LIMIT = 24;

export function requestAiReply(request: AiReplyRequest): Promise<Response> {
  return fetch("/api/ai-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}
