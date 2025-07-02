"use client";

import { defineAiTool } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RegisterAiTool,
  useAiChatMessages,
  useSendAiMessage,
} from "@liveblocks/react";
import { AiChat, AiTool } from "@liveblocks/react-ui";
import Link from "next/link";
import { ComponentProps, useState } from "react";
import { useChatId } from "./useChatId";

export default function Page() {
  const { chatId, createNewChat } = useChatId();
  const [showEmailForm, setShowEmailForm] = useState(false);

  return (
    <main className="max-w-screen-md w-full min-h-full mx-auto border border-neutral-200 flex-grow">
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
                  Create a new support ticket for our team to answer? This
                  chat’s history will be included.
                </div>
                <div className="flex justify-end">
                  <button
                    className="px-3 py-1.5 transition-colors rounded-sm flex items-center gap-2 bg-[--accent] text-white text-[13px] font-medium shadow-xs hover:bg-neutral-100"
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
      {/* <RegisterAiTool
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
              <div className="p-4 bg-[--lb-background-foreground-faint] rounded-[calc((1lh+var(--lb-spacing))/2)] flex flex-col gap-2 items-start justify-self-start">
                <div className="text-base font-semibold">
                  Would you like to create a support ticket?
                </div>
                <button
                  className="px-3 py-1.5 transition-colors rounded flex items-center gap-2 bg-[--accent] text-white text-sm font-medium shadow-xs hover:bg-neutral-100"
                  onClick={() => {
                    respond({
                      data: {},
                      description: "Showing the email form",
                    });
                    setShowEmailForm(true);
                  }}
                >
                  Create ticket
                </button>
              </div>
            );
          },
        })}
      /> */}
      {/* <RegisterAiTool
        name="show-create-ticket-form"
        tool={defineAiTool()({
          description:
            "Show a button that takes users to an email form where they can create a support ticket",
          parameters: {
            type: "object",
            additionalItems: false,
            properties: {},
          },
          render: ({ respond }) => {
            return (
              <AiTool title="Support ticket">
                <AiTool.Confirmation
                  overrides={{ AI_TOOL_CONFIRMATION_CONFIRM: "Create" }}
                  confirm={() => {
                    setShowEmailForm(true);
                    return { data: {}, description: "Showing the email form" };
                  }}
                  cancel={() => {
                    return { data: {}, description: "Cancelled" };
                  }}
                >
                  Create a new support ticket with this chat's history
                </AiTool.Confirmation>
              </AiTool>
            );
          },
        })}
      /> */}
      <div className="p-10 flex flex-col gap-0.5 border-b pb-10 border-neutral-200">
        <h1 className="text-3xl font-semibold">Chat with support</h1>
        <div className="text-neutral-500">
          Describe your problem to get help or create a support ticket.
        </div>
      </div>
      {showEmailForm ? (
        <div className="px-10 py-10">
          <EmailForm chatId={chatId} />
        </div>
      ) : (
        <div className="px-10 py-10 bg-white">
          <ClientSideSuspense fallback={null}>
            <Chat chatId={chatId} />
          </ClientSideSuspense>
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

function Chat({ chatId }: { chatId: string }) {
  return (
    <AiChat
      className="min-h-0 h-full flex-shrink flex-grow overflow-x-hidden"
      chatId={chatId}
      copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
      components={{
        Empty,
        Anchor: (props) => (
          <Link href={props.href || ""}>{props.children}</Link>
        ),
      }}
    />
  );
}

// Shown when the chat is empty
function Empty({ chatId }: { chatId: string }) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="pb-8 h-full flex flex-col gap-5 justify-end">
      <h3>How can I help you?</h3>
      <div className="flex flex-wrap items-start gap-2">
        <button
          className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
          onClick={() => sendMessage("Write a story about a brave knight")}
        >
          Write a story
        </button>
        <button
          className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
          onClick={() => sendMessage("Teach me React")}
        >
          Teach me React
        </button>
        <button
          className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
          onClick={() => sendMessage("Explain quantum computing")}
        >
          Explain quantum computing
        </button>
        <button
          className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
          onClick={() => sendMessage("Plan weekly meals")}
        >
          Plan weekly meals
        </button>
      </div>
    </div>
  );
}

function EmailForm({ chatId }: { chatId: string }) {
  // Get the messages from the chat
  const { messages } = useAiChatMessages(chatId);

  return (
    <form
      className="flex flex-col gap-6 max-w-md text-sm mx-auto"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const description = formData.get("description") as string;

        // Submit your form
        console.log({ name, email, description, messages });
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
        className="px-4 py-2 bg-[--accent] text-white rounded font-semibold transition-colors"
      >
        Submit
      </button>
    </form>
  );
}

// Creating a new chat every hour
function getDefaultChatId() {
  return new Date().toISOString().slice(0, 13);
}

function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
