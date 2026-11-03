import type { ChatMessage } from "@/lib/feeds";
import { formatDayLabel } from "@/lib/time";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageListItem =
  | { type: "divider"; label: string; key: string }
  | {
      type: "message";
      message: ChatMessage;
      showHeader: boolean;
      key: string;
    };

export function buildMessageListItems(
  messages: ChatMessage[],
  options: { dayDividers?: boolean } = {}
): MessageListItem[] {
  const { dayDividers = true } = options;
  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);
  const items: MessageListItem[] = [];
  let lastDay: string | null = null;
  let previous: ChatMessage | null = null;

  for (const message of sorted) {
    const dayLabel = formatDayLabel(message.createdAt);
    if (dayDividers && dayLabel !== lastDay) {
      items.push({
        type: "divider",
        label: dayLabel,
        key: `divider-${dayLabel}-${message.createdAt}`,
      });
      lastDay = dayLabel;
      previous = null;
    }

    const showHeader =
      !previous ||
      previous.data.userId !== message.data.userId ||
      message.createdAt - previous.createdAt > GROUP_WINDOW_MS;

    items.push({
      type: "message",
      message,
      showHeader,
      key: message.id,
    });
    previous = message;
  }

  return items;
}
