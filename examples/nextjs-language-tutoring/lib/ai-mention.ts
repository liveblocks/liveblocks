// Typing "@AI Assistant" anywhere in a chat message asks the assistant for
// help. Shared by the composer (popover and trigger) and the message list
// (highlighting).
export const AI_NAME = "AI Assistant";
export const AI_MENTION = `@${AI_NAME}`;

const MENTION_PATTERN = /(^|[^\w@])(@AI Assistant)(?![\w-])/i;

export function mentionsAi(text: string) {
  return MENTION_PATTERN.test(text);
}

export function matchesAiMention(query: string) {
  return AI_NAME.toLowerCase().startsWith(query.toLowerCase());
}

// Splits a message into plain text and mention parts, for rendering
export function splitAiMentions(text: string) {
  const parts: { text: string; mention: boolean }[] = [];
  const pattern = new RegExp(MENTION_PATTERN.source, "gi");
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index + match[1].length;
    if (start > last) {
      parts.push({ text: text.slice(last, start), mention: false });
    }
    parts.push({ text: match[2], mention: true });
    last = start + match[2].length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), mention: false });
  }
  return parts;
}
