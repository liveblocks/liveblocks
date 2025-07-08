"use client";

import { defineAiTool } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RegisterAiKnowledge,
  RegisterAiTool,
  useAiChatMessages,
  useSendAiMessage,
} from "@liveblocks/react/suspense";
import { AiChat, AiTool } from "@liveblocks/react-ui";
import Link from "next/link";
import { useState } from "react";
import { useChatId } from "./useChatId";
import { toast } from "sonner";

// Answers to these are defined in the Liveblocks dashboard, in the copilot's knowledge
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
    <main className="max-w-screen-md w-full min-h-full mx-auto border border-neutral-200 flex-grow rounded-lg">
      <RegisterAiKnowledge
        description="Billing history for the current user"
        value={[
          {
            date: "2025-07-01",
            amount: 4.5,
            description: "Advanced Plan monthly subscription",
          },
          {
            date: "2025-06-01",
            amount: 4.5,
            description: "Advanced Plan monthly subscription",
          },
          {
            date: "2025-05-01",
            amount: 0,
            description: "Free trial",
          },
        ]}
      />

      <RegisterAiKnowledge
        description="the user's current plan"
        value="Advanced Plan monthly subscription"
      />

      <RegisterAiKnowledge
        description="Pages you can link users to"
        value={["#billing", "#dashboard", "#docs"]}
      />

      {/* Defines a tool that the AI can choose to use. Shows a button that displays an email form on click. */}
      <RegisterAiTool
        name="create-support-ticket-button"
        tool={defineAiTool()({
          description:
            "Shows a button that displays an email contact form where users can create a support ticket. Name and email are pre-filled, the description box must be filled. The chat’s history is included in the ticket.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          execute: () => {
            return {
              data: {},
              description:
                "The user can click the button to write a ticket. Let the user know what to put in the description.",
            };
          },
          render: ({ respond }) => {
            return (
              <AiTool title="Support ticket">
                <div className="text-sm text-neutral-500 mb-2">
                  Create a new support ticket for our team? This chat’s history
                  will be included.
                </div>
                <div className="flex justify-end">
                  <button
                    className="px-3 py-1.5 transition-colors rounded flex items-center gap-2 bg-[--accent] text-white text-[13px] font-medium shadow-xs hover:bg-[--accent-hover]"
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

      {/* Defines a tool that shows a guide on how to change email */}
      <RegisterAiTool
        name="how-to-change-email"
        tool={defineAiTool()({
          description:
            "A visual guide on how to change the email address in the account settings.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          execute: () => {
            return {
              data: {},
              description: "Showing the how to change email guide",
            };
          },
          render: () => {
            return (
              <AiTool title="How to change email">
                <ChangeEmailGuide />
              </AiTool>
            );
          },
        })}
      />

      <div className="px-10 py-8 flex flex-col gap-0.5 border-b pb-10 border-neutral-200">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">
          Chat with support
        </h1>
        <div className="text-neutral-500">
          Describe your problem to get help or create a support ticket.
        </div>
      </div>

      <div className="px-10 py-10 bg-white min-h-[282px]">
        <div className="flex flex-col gap-3">
          <div>How can I assist you today?</div>
          <ClientSideSuspense fallback={<Fallback />}>
            <Chat chatId={chatId} />
          </ClientSideSuspense>
        </div>
      </div>

      {/* Modal overlay */}
      {showEmailForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <EmailForm
            chatId={chatId}
            onClose={() => setShowEmailForm(false)}
            onSubmitSuccess={() => {
              setShowEmailForm(false);
              toast.success("Ticket created successfully", {
                duration: 5000,
              });
              createNewChat();
            }}
          />
        </div>
      )}
      <div className="px-10 py-4 flex gap-0.5 border-t border-neutral-200 justify-end items-center">
        <button
          className="px-3 py-1.5 transition-colors rounded flex items-center gap-2 bg-black text-sm font-medium shadow-xs hover:bg-neutral-900 text-white"
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

const copilotId = process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined;

// The actual chat component
function Chat({ chatId }: { chatId: string }) {
  // Triggers ClientSideSuspense for the whole chat
  const { messages } = useAiChatMessages(chatId);

  return (
    <AiChat
      className="min-h-0 h-full flex-shrink flex-grow overflow-x-hidden"
      chatId={chatId}
      // Create a custom copilot in the dashboard with your chosen AI provider/prompt/settings
      copilotId={copilotId}
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
  const sendMessage = useSendAiMessage(chatId, {
    copilotId: copilotId,
  });

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
      <div className="flex flex-wrap items-start gap-2 mb-8 select-none">
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

function EmailForm({
  chatId,
  onClose,
  onSubmitSuccess,
}: {
  chatId: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}) {
  // Get the messages from this chat, ready to submit to your backend
  const { messages } = useAiChatMessages(chatId);

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-neutral-200">
        <h2 className="text-lg font-semibold">Create support ticket</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full hover:bg-neutral-100 p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
          aria-label="Close form"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <form
        className="p-6 flex flex-col gap-6 text-sm"
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
          onSubmitSuccess();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            name="name"
            value="Quinn Elton"
            readOnly
            className="border border-neutral-200 rounded px-3 py-2 bg-neutral-50 text-neutral-500 cursor-not-allowed focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            value="quinn.elton@example.com"
            readOnly
            className="border border-neutral-200 rounded px-3 py-2 bg-neutral-50 text-neutral-500 cursor-not-allowed focus:outline-none"
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
    </div>
  );
}

function ChangeEmailGuide() {
  return (
    <ol
      className="relative -ml-7 mr-4 !mt-4 !list-none"
      style={{ counterReset: "step 0" }}
    >
      <li
        className="relative !pl-14 pb-6 before:absolute before:left-0 before:flex before:h-8 before:w-8 before:items-center before:justify-center before:border before:bg-white before:text-xs before:font-medium before:text-product-subtle after:absolute after:-bottom-4 after:left-[15px] after:top-8 after:w-px after:bg-gray-200 before:rounded-md before:content-[counter(step)]"
        style={{ counterIncrement: "step 1" }}
      >
        <h3 className="pt-1 text-base font-medium leading-normal text-product">
          Navigate to dashboard settings{" "}
        </h3>
        <div className="markdown markdown-sm markdown-stripped mt-3">
          <p>
            To get started, first navigate to your{" "}
            <a href="#dashboard" className="underline font-medium">
              dashboard
            </a>
            , then click on “Settings”.
          </p>
        </div>
      </li>
      <li
        className="relative !pl-14 pb-0 before:absolute before:left-0 before:flex before:h-8 before:w-8 before:items-center before:justify-center before:border before:bg-white before:bg-product-surface-base before:text-xs before:font-medium before:text-product-subtle before:rounded-md before:content-[counter(step)]"
        style={{ counterIncrement: "step 1" }}
      >
        <h3 className="pt-1 text-base font-medium leading-normal text-product">
          Enter new email and submit{" "}
        </h3>
        <div className="markdown markdown-sm markdown-stripped mt-3">
          <p>
            On the settings page, enter your email into the “New email” field
            and submit the form.
          </p>
          <div className="relative flex mt-5 rounded-sm border overflow-hidden">
            <ChangeEmailIllustration />{" "}
          </div>
        </div>
      </li>
    </ol>
  );
}

function ChangeEmailIllustration() {
  return (
    <div className="relative flex w-full">
      <div className="block absolute inset-0 bg-gradient-to-l from-black via-transparent to-transparent opacity-[1%]"></div>
      <div className="block absolute inset-0 bg-gradient-to-bl from-black via-transparent to-transparent opacity-[1%]"></div>
      <div className="block absolute inset-0 bg-gradient-to-br from-black via-transparent to-transparent opacity-[2%]"></div>
      <div className="block absolute inset-0 bg-gradient-to-tr from-black via-transparent to-transparent opacity-[2%]"></div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-100 via-gray-100/20 opacity-50"></div>{" "}
      <div className="block absolute inset-0 bg-gradient-to-tl from-black/50 via-transparent to-transparent opacity-[2%]"></div>
      <svg
        className="pointer-events-none absolute left-[-19%] top-0 h-auto w-[145%] rotate-3 text-white opacity-50"
        width="1021"
        height="1021"
        viewBox="0 0 1021 1021"
        fill="none"
      >
        <g clipPath="url(#clip)">
          <path
            d="M-471.628 659.947L-42.4998 1019C-42.4998 1019 305 866.5 422 425C539 -16.5 496.5 -483.5 496.5 -483.5L273.5 -598.5L-471.628 659.947Z"
            fill="url(#paint)"
          ></path>
        </g>
        <defs>
          <linearGradient
            id="paint"
            x1="167.5"
            y1="595"
            x2="322.335"
            y2="-68.7304"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="currentColor" stop-opacity="0"></stop>
            <stop offset="1" stop-color="currentColor"></stop>
          </linearGradient>
          <clipPath id="clip">
            <rect width="1021" height="1021" fill="currentColor"></rect>
          </clipPath>
        </defs>
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 300"
        className="w-full h-auto !m-0 !p-0"
      >
        {/* Background */}
        <rect width="400" height="300" fill="#fafafa" />

        {/* Sidebar */}
        <rect x="0" y="0" width="70" height="300" fill="#f5f5f5" />

        {/* Sidebar items */}
        <rect x="10" y="20" width="50" height="6" rx="3" fill="#e5e5e5" />
        <rect x="10" y="35" width="35" height="6" rx="3" fill="#e5e5e5" />
        <rect x="10" y="50" width="40" height="6" rx="3" fill="#d4d4d8" />
        <rect x="10" y="65" width="30" height="6" rx="3" fill="#e5e5e5" />
        <rect x="10" y="80" width="45" height="6" rx="3" fill="#e5e5e5" />

        {/* Top bar */}
        <rect x="70" y="0" width="330" height="35" fill="#ffffff" />

        {/* Search */}
        <rect x="85" y="10" width="80" height="15" rx="7" fill="#f5f5f5" />

        {/* Avatar */}
        <circle cx="370" cy="17" r="7" fill="#e5e5e5" />

        {/* Main content area */}
        <rect x="85" y="50" width="300" height="235" fill="#ffffff" />

        {/* Metric cards row */}
        <rect x="95" y="65" width="85" height="45" rx="4" fill="#f9f9f9" />
        <rect x="190" y="65" width="85" height="45" rx="4" fill="#f9f9f9" />
        <rect x="285" y="65" width="85" height="45" rx="4" fill="#f9f9f9" />

        {/* Small metric indicators */}
        <rect x="105" y="75" width="25" height="4" rx="2" fill="#e5e5e5" />
        <rect x="105" y="85" width="40" height="8" rx="2" fill="#d4d4d8" />

        <rect x="200" y="75" width="30" height="4" rx="2" fill="#e5e5e5" />
        <rect x="200" y="85" width="35" height="8" rx="2" fill="#d4d4d8" />

        <rect x="295" y="75" width="20" height="4" rx="2" fill="#e5e5e5" />
        <rect x="295" y="85" width="45" height="8" rx="2" fill="#d4d4d8" />

        {/* Chart area */}
        <rect x="95" y="125" width="180" height="90" rx="4" fill="#f9f9f9" />

        {/* Simple chart lines */}
        <polyline
          points="110,190 130,175 150,185 170,165 190,170 210,155 230,160 250,145"
          stroke="#d4d4d8"
          strokeWidth="2"
          fill="none"
        />

        {/* Side panel */}
        <rect x="285" y="125" width="85" height="90" rx="4" fill="#f9f9f9" />

        {/* List items in side panel */}
        <rect x="295" y="140" width="65" height="4" rx="2" fill="#e5e5e5" />
        <rect x="295" y="150" width="45" height="4" rx="2" fill="#e5e5e5" />
        <rect x="295" y="160" width="55" height="4" rx="2" fill="#e5e5e5" />
        <rect x="295" y="170" width="40" height="4" rx="2" fill="#e5e5e5" />
        <rect x="295" y="180" width="50" height="4" rx="2" fill="#e5e5e5" />

        {/* Bottom section */}
        <rect x="95" y="230" width="275" height="40" rx="4" fill="#f9f9f9" />
        <rect x="105" y="240" width="60" height="6" rx="3" fill="#e5e5e5" />
        <rect x="105" y="250" width="100" height="4" rx="2" fill="#e5e5e5" />
      </svg>
    </div>
  );
}
