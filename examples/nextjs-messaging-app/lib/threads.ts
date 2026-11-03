import { getMentionedUserIds } from "@/lib/mentions";

export function getThreadParticipantIds(
  messages: { userId: string; content: string }[]
): string[] {
  const ids = new Set<string>();
  for (const message of messages) {
    ids.add(message.userId);
    for (const userId of getMentionedUserIds(message.content)) {
      ids.add(userId);
    }
  }
  return [...ids];
}
