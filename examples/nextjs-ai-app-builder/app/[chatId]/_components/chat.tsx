"use client";

import { useSendAiMessage } from "@liveblocks/react";
import { AiChat, AiChatComponentsEmptyProps } from "@liveblocks/react-ui";

import { Spinner } from "@/components/ui/spinner";

/**
 * This example uses a custom copilot, which you can create on https://liveblocks.io/dashboard
 * Place your copilot id in `.env.local` under `NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID`
 * The live demo uses GPT-4.1 mini with the following prompt:
```
- You generate React/Tailwind code that is shown in a live preview.
- Tailwind has the default styles available.
- What you create will replace the current design.
- IMPORTANT: Users will always want you to make changes, so use your `edit-code` tool every time.
- You must always use `export default function App` as the entry point in your code.
- When using React hooks always use `import { ... } from "react"`.
- No other packages are available, only `"react"`.
- After a generation, leave a brief explanation of your changes, typically a few sentences at most.
- When replying, use markdown where appropriate, for examples `code`, **bold**, and ```ts code fences```
- You apply the default prettier rules.
```
 */

export default function Chat({ chatId }: { chatId: string }) {
  return (
    <AiChat
      // Each chat is stored permanently and has a unique ID
      chatId={chatId}
      copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
      className="grow mx-auto"
      layout="inset"
      components={{ Empty, Loading: Spinner }}
      autoFocus

      // Chat width is set in globals.css with a variable:
      // --lb-ai-chat-container-width
    />
  );
}

const suggestions = ["Build a counter app", "Build a to-do app"];

// Overriding the empty chat state function
function Empty({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId, {
    copilotId: process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined,
  });

  return (
    <div className="size-full mx-auto max-w-[--inner-app-width] flex items-end pb-[calc(3*var(--lb-spacing))] px-4">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-neutral-600">Suggestions</div>
        <div className="flex flex-wrap items-start gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="px-2 py-1 transition-colors rounded-md flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
