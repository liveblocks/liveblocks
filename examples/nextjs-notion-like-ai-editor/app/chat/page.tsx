"use client";

import { useChat } from "ai/react";
import { createRoomWithLexicalDocument } from "../actions/liveblocks";
import { getPageUrl } from "../config";
import Markdown from "markdown-to-jsx";
import { SparklesIcon } from "../icons/SparklesIcon";
import * as React from "react";
import { Message } from "ai";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CreateIcon } from "../icons/CreateIcon";
import { ClientSideSuspense } from "@liveblocks/react";
import { StopIcon } from "../icons/StopIcon";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function Page() {
  return (
    <ClientSideSuspense fallback={null}>
      <Chat />
    </ClientSideSuspense>
  );
}

function Chat() {
  // Check `app/api/chat/route.ts` for the back-end
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } =
    useChat({
      keepLastMessageOnError: true,
    });

  return (
    <div className="relative w-full mx-auto h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[740px] mx-auto flex-1 px-8 py-4 flex flex-col gap-2">
          {messages.map((message) => (
            <MessageLine key={message.id} message={message} />
          ))}
        </div>
      </div>

      {/* Submit queries to Vercel AI */}
      <form
        onSubmit={handleSubmit}
        className="max-w-[740px] mx-auto w-full flex-0 my-0 relative"
      >
        {messages.length === 0 ? (
          <div className="mx-8 m-4 text-sm">
            Hi there! Try asking me to write a draft.
          </div>
        ) : null}
        <div className="mx-8 m-4 relative">
          <input
            placeholder={isLoading ? "Generating…" : "Create a draft about…"}
            className="border block w-full p-2 pl-3 rounded-lg outline-none transition-all focus:outline-indigo-500 disabled:bg-gray-50 disabled:outline-none"
            name="prompt"
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            autoFocus={true}
          />
          <button
            className="absolute right-0 px-2 top-0 bottom-0 transition-colors rounded-r-lg border border-transparent hover:border-gray-200 hover:disabled:border-transparent hover:bg-gray-100 hover:disabled:bg-transparent"
            onClick={isLoading ? stop : undefined}
            disabled={!isLoading && !input}
          >
            {isLoading ? (
              <StopIcon className="h-4 text-red-500  pointer-events-none" />
            ) : (
              <SparklesIcon
                style={isLoading || !input ? { opacity: 0.6 } : {}}
                className="h-4 text-indigo-500  pointer-events-none"
              />
            )}
          </button>
        </div>
      </form>

      <LiveblocksBadge />
    </div>
  );
}

function MessageLine({ message }: { message: Message }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(message.content);
  const [loading, setLoading] = useState(false);

  // If the message starts with an H1 heading (#), extract it as the title
  useEffect(() => {
    const match = message.content.match(/^#\s(.+)/);
    if (match) {
      setTitle(match[1]);
      setContent(message.content.replace(/^#\s.+/, "").trim());
    } else {
      setTitle("");
      setContent(message.content);
    }
  }, [message.content]);

  // Create new document with content/title and redirect
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const room = await createRoomWithLexicalDocument(
        content,
        title || "Untitled document"
      );
      router.push(getPageUrl(room.id));
    },
    [content, title]
  );

  return (
    <div key={message.id}>
      {message.role === "user" ? (
        // Your messages
        <div className="flex justify-end">
          <div className="bg-gray-100 rounded-full py-1.5 px-3">{content}</div>
        </div>
      ) : (
        // AI messages
        <div className="flex flex-col gap-2">
          <div className="border rounded-2xl shadow-sm">
            {title ? (
              <div className="font-semibold border-b px-4 py-2 pr-2 text-sm flex justify-start items-center gap-1.5">
                <span>{title}</span>
                <form onSubmit={handleSubmit}>
                  <button
                    disabled={loading}
                    className="font-normal text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:hover:text-gray-500 disabled:hover:bg-transparent transition-colors rounded-lg py-1 px-1.5 flex gap-1 items-center disabled:opacity-70"
                  >
                    <CreateIcon className="w-3 h-3 opacity-70" />
                    {loading ? "Creating…" : "Create"}
                  </button>
                </form>
              </div>
            ) : null}

            {/*Render markdown message as HTML */}
            <div className="px-4">
              <Markdown options={{ forceBlock: true }}>{content}</Markdown>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <button
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 transition-colors rounded-full py-1.5 px-3 flex gap-1.5 items-center disabled:opacity-70 hover:disabled:bg-gray-100"
            >
              <CreateIcon className="w-4 h-4 opacity-70" />
              {loading ? "Creating…" : "Create document"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function LiveblocksBadge() {
  return (
    <a
      className="fixed top-4 right-4"
      href="https://liveblocks.io"
      rel="noreferrer"
      target="_blank"
    >
      <picture>
        <source
          srcSet="https://liveblocks.io/badge-dark.svg"
          media="(prefers-color-scheme: dark)"
        />
        <img
          src="https://liveblocks.io/badge-light.svg"
          alt="Made with Liveblocks"
          className=""
        />
      </picture>
    </a>
  );
}
