import { useSendAiMessage } from "@liveblocks/react";
import { AiChatComponentsEmptyProps } from "@liveblocks/react-ui";

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

export function AiChatPlaceholder({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="p-4 h-full flex flex-col gap-5 justify-end">
      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-medium">How can I help you?</h3>
        <p className="text-gray-500">
          Ask me anything about reports or transactions. I can answer questions
          and help you work.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {SUGGESTIONS.map(({ text, prompt }) => (
          <button
            key={text}
            className="px-3.5 py-1.5 rounded-full flex items-center gap-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 border text-sm font-medium shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => sendMessage(prompt)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
