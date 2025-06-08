import { AiChat } from "@liveblocks/react-ui";
import { useSendAiMessage } from "@liveblocks/react";

export type SharedAiChatProps = {
  title: string;
  description: string;
  suggestions: string[];
  theme: "light" | "dark";
  copilotId?: string;
  accentColor?: string;
  chatId?: string;
  className?: string;
};

export function SharedAiChat({
  title,
  description,
  suggestions,
  theme,
  copilotId,
  accentColor,
  chatId = "preview-chat",
  className = "h-full",
}: SharedAiChatProps) {
  const aiChatProps: any = {
    layout: "compact" as const,
    chatId,
    ...(copilotId ? { copilotId } : {}),
  };

  return (
    <div className="h-full">
      <AiChat
        {...aiChatProps}
        style={
          accentColor
            ? ({ "--lb-accent": accentColor } as React.CSSProperties)
            : undefined
        }
        components={{
          Empty: ({ chatId }) => {
            const sendMessage = useSendAiMessage(chatId);
            return (
              <div className="p-[var(--spacing)] h-full flex flex-col gap-5 justify-end">
                <div>
                  <h3 className="text-neutral-900 dark:text-neutral-100">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 border text-sm font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            );
          },
        }}
        className={className}
      />
    </div>
  );
}
