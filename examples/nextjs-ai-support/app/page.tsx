"use client";

import { defineAiTool } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RegisterAiTool,
  useAiChatMessages,
  useSendAiMessage,
} from "@liveblocks/react/suspense";
import { AiChat, AiTool } from "@liveblocks/react-ui";
import Link from "next/link";
import { useState } from "react";
import { useChatId } from "./useChatId";

const INITIAL_SUGGESTIONS = [
  "I can’t log in",
  "How do I change my email?",
  "Is there a free trial?",
  "Why was I charged?",
];

export default function Page() {
  const { chatId, createNewChat } = useChatId();
  const [showEmailForm, setShowEmailForm] = useState(false);

  return (
    <main className="max-w-screen-md w-full min-h-full mx-auto border border-neutral-200 flex-grow">
      {/* Defines a tool that the AI can choose to use. Shows a button that displays an email form on click. */}
      <RegisterAiTool
        name="show-create-ticket-form"
        tool={defineAiTool()({
          description:
            "Show a button that takes users to an email form where they can create a support ticket",
          parameters: {
            type: "object",
            additionalItems: false,
            properties: {},
          },
          execute: () => {},
          render: ({ respond }) => {
            return (
              <AiTool title="Support ticket">
                <div className="text-sm text-neutral-500 mb-2">
                  Create a new support ticket for our team? This chat’s history
                  will be included.
                </div>
                <div className="flex justify-end">
                  <button
                    className="px-3 py-1.5 transition-colors rounded-sm flex items-center gap-2 bg-[--accent] text-white text-[13px] font-medium shadow-xs hover:bg-[--accent-hover]"
                    onClick={() => {
                      respond({
                        data: {},
                        description: "Showing the email form",
                      });
                      setShowEmailForm(true);
                    }}
                  >
                    New ticket
                  </button>
                </div>
              </AiTool>
            );
          },
        })}
      />

      <div className="p-10 flex flex-col gap-0.5 border-b pb-10 border-neutral-200">
        <h1 className="text-3xl font-semibold">Chat with support</h1>
        <div className="text-neutral-500">
          Describe your problem to get help or create a support ticket.
        </div>
      </div>

      {showEmailForm ? (
        <EmailForm chatId={chatId} />
      ) : (
        <div className="px-10 py-10 bg-white min-h-[282px]">
          <div className="flex flex-col gap-3">
            <div>How can I assist you today?</div>
            <ClientSideSuspense fallback={<Fallback />}>
              <Chat chatId={chatId} />
            </ClientSideSuspense>
          </div>
        </div>
      )}
      <div className="px-10 py-4 flex gap-0.5 border-t border-neutral-200 justify-end items-center">
        <button
          className="px-3 py-1.5 transition-colors rounded flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-100"
          onClick={() => {
            createNewChat();
            setShowEmailForm(false);
          }}
        >
          Start new chat
        </button>
      </div>
    </main>
  );
}

// The actual chat component
function Chat({ chatId }: { chatId: string }) {
  // Triggers ClientSideSuspense for all chat
  const { messages } = useAiChatMessages(chatId);

  return (
    <AiChat
      className="min-h-0 h-full flex-shrink flex-grow overflow-x-hidden"
      chatId={chatId}
      // Create a custom copilot in the dashboard with your chosen AI provider/prompt/settings
      copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
      components={{
        // Placeholder when there's no messages
        Empty,

        // In Next.js, the AI should use <Link> instead of <a>
        Anchor: (props) => (
          <Link href={props.href || ""}>{props.children}</Link>
        ),
      }}
    />
  );
}

// Shown when the chat is empty
function Empty({ chatId }: { chatId: string }) {
  // Start a chat with this when the user clicks a button
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="pb-8 h-full flex flex-col gap-5 justify-end">
      <div className="flex flex-wrap items-start gap-2">
        {INITIAL_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
            onClick={() => sendMessage(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// Shown when chat is loading
function Fallback() {
  return (
    <div>
      <div className="flex flex-wrap items-start gap-2 mb-8">
        {INITIAL_SUGGESTIONS.map((suggestion) => (
          <div
            key={suggestion}
            className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-neutral-50 border text-transparent border-neutral-50 animate-pulse text-sm font-medium -transparent"
          >
            {suggestion}
          </div>
        ))}
      </div>
      <div className="rounded h-[100px] w-full bg-neutral-50 animate-pulse border border-neutral-50"></div>
    </div>
  );
}

function EmailForm({ chatId }: { chatId: string }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Get the messages from this chat, ready to submit to your backend
  const { messages } = useAiChatMessages(chatId);

  if (isSubmitted) {
    return (
      <div className="px-10 py-6 bg-green-50 flex flex-col gap-0.5 mx-auto">
        <div className="text-base font-semibold text-green-900">
          Message sent
        </div>
        <div className="text-green-800 text-sm">
          Thanks for getting in touch, we’ll get back to you as soon as we can.
        </div>
      </div>
    );
  }

  return (
    <form
      className="px-10 py-16 flex flex-col gap-6 max-w-md text-sm mx-auto"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const description = formData.get("description") as string;

        // Submit the form data to your backend
        // ...

        console.log("Form submitted:", {
          name,
          email,
          description,
          messages,
        });
        setIsSubmitted(true);
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          name="name"
          value="Quinn Elton"
          readOnly
          className="border border-neutral-200 rounded px-3 py-2 bg-neutral-100 text-neutral-500 cursor-not-allowed focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          name="email"
          value="quinn.elton@example.com"
          readOnly
          className="border border-neutral-200 rounded px-3 py-2 bg-neutral-100 text-neutral-500 cursor-not-allowed focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Description
          <div className="flex flex-col gap-2 font-normal text-neutral-500 text-xs mt-1">
            Your chat history will be included in the ticket
          </div>
        </span>
        <textarea
          name="description"
          className="border border-neutral-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[80px]"
          placeholder="Describe your issue or question"
          required
        />
      </label>

      <button
        type="submit"
        className="px-4 py-2 bg-[--accent] text-white rounded font-medium transition-colors hover:bg-[--accent-hover]"
      >
        Submit
      </button>
    </form>
  );
}
