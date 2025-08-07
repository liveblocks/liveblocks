"use client";

import { defineAiTool } from "@liveblocks/core";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  useSendAiMessage,
} from "@liveblocks/react/suspense";
import {
  AiChat,
  AiChatComponentsEmptyProps,
  AiTool,
} from "@liveblocks/react-ui";

export default function HtmlStreamingPage() {
  return (
    <main className="h-screen w-full">
      <LiveblocksProvider
        authEndpoint="/api/auth/liveblocks"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <ClientSideSuspense fallback={null}>
          <AiChat
            chatId="html-streaming"
            components={{
              Empty: AiChatEmptyComponent,
            }}
            tools={{
              displayHtml: defineAiTool()({
                description: "Display HTML content in a preview pane",
                parameters: {
                  type: "object",
                  properties: {
                    author: {
                      type: "string",
                      description: "Author of the content",
                    },
                    title: {
                      type: "string",
                      description: "Suggested title for the page",
                    },
                    rawHTML: {
                      type: "string",
                      description: "The HTML content to display",
                    },
                  },
                  required: ["author", "title", "rawHTML"],
                  additionalProperties: false,
                },
                execute: () => {
                  return { data: { success: true } };
                },
                render: () => {
                  return (
                    <AiTool>
                      <AiTool.Inspector />
                    </AiTool>
                  );
                },
              }),
            }}
            className="h-screen"
          />
        </ClientSideSuspense>
      </LiveblocksProvider>
    </main>
  );
}

const CHAT_SUGGESTIONS = [
  {
    label: "Simple marketing page",
    message: "Create a simple marketing page for a SaaS product",
  },
  {
    label: "Landing page with hero",
    message:
      "Generate a landing page with a hero section, features, and footer",
  },
  {
    label: "Product showcase",
    message:
      "Create an HTML page showcasing a new product with images and descriptions",
  },
  {
    label: "Contact page",
    message: "Build a contact page with a form and company information",
  },
];

function AiChatEmptyComponent({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="justify-end h-full flex flex-col gap-4 px-6 pb-4">
      <h2 className="text-xl font-semibold">HTML Streaming Test</h2>
      <p className="text-sm text-gray-600">
        Ask me to generate HTML and watch it stream in real-time!
      </p>

      {/* Suggestion Tags */}
      <div className="flex flex-wrap gap-2">
        {CHAT_SUGGESTIONS.map(({ label, message }) => (
          <button
            key={label}
            onClick={() => sendMessage(message)}
            className="text-sm rounded-full border border-[var(--lb-foreground-subtle)] px-4 py-2 font-medium"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
