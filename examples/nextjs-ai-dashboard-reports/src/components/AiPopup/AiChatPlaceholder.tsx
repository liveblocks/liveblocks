import { useSendAiMessage } from "@liveblocks/react";
import { AiChatComponentsEmptyProps } from "@liveblocks/react-ui";

const SUGGESTIONS = [
  { text: "Take me to the users page", prompt: "Navigate to the users page" },
  {
    text: "Invite a member",
    prompt: "Invite a member to the team",
  },
  { text: "Explain quantum computing", prompt: "Explain quantum computing" },
  { text: "Plan weekly meals", prompt: "Plan weekly meals" },
];

export function AiChatPlaceholder({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="p-4 h-full flex flex-col gap-5 justify-end">
      <h3>How can I help you?</h3>
      <div className="flex flex-wrap items-start gap-2">
        {SUGGESTIONS.map(({ text, prompt }) => (
          <button
            key={text}
            className="px-3.5 py-1.5 rounded-full flex items-center gap-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 border text-sm font-medium shadow-xs hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => sendMessage(prompt)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
