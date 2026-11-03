const MENTION_PATTERN = /<@([^>]+)>/g;

export function getMentionedUserIds(content: string): string[] {
  return [...new Set([...content.matchAll(MENTION_PATTERN)].map((m) => m[1]))];
}

export function mentionToken(userId: string): string {
  return `<@${userId}>`;
}

export function hasMention(content: string, userId: string): boolean {
  return content.includes(mentionToken(userId));
}
