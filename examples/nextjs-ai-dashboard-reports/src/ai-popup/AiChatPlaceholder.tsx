import { useSendAiMessage } from "@liveblocks/react";
import { AiChatComponentsEmptyProps } from "@liveblocks/react-ui";

// Clickable suggestions in the placeholder
const SUGGESTIONS = [
  {
    text: "Send invoice reminders",
    prompt: "Send invoice reminders to all companies with overdue invoices",
  },
  {
    text: "Which merchants bought last year?",
    prompt: "List all merchants from the previous year",
  },
  {
    text: "How many seats do I have?",
    prompt: "How many seats do I have?",
  },
  { text: "Take me to billing", prompt: "Navigate to the billing page" },
  {
    text: "Invite a member",
    prompt: "Invite a member to the team",
  },
];

// Placeholder that's displayed when there's no messages in the chat
export function AiChatPlaceholder({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId, {
    copilotId: process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined,
  });

  return (
    <div className="flex h-full flex-col justify-end gap-5 p-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold tracking-[-0.01em]">
          How can I help you?
        </h3>
        <p className="text-balance text-neutral-500">
          Ask me anything about reports or transactions. I can answer questions
          and help you work.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {SUGGESTIONS.map(({ text, prompt }) => (
          <button
            key={text}
            className="flex items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ease-out hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            onClick={() => sendMessage(prompt)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
