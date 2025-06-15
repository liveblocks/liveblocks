import { useSendAiMessage } from "@liveblocks/react"
import { AiChatComponentsEmptyProps } from "@liveblocks/react-ui"

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
]

export function AiChatPlaceholder({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId)

  return (
    <div className="flex h-full flex-col justify-end gap-5 p-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-medium">How can I help you?</h3>
        <p className="text-neutral-500">
          Ask me anything about reports or transactions. I can answer questions
          and help you work.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {SUGGESTIONS.map(({ text, prompt }) => (
          <button
            key={text}
            className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            onClick={() => sendMessage(prompt)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
