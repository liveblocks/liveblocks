"use client";

import { useChat } from "ai/react";
import { createRoomWithLexicalDocument } from "../actions/liveblocks";
import { redirect } from "next/navigation";
import { getPageUrl } from "../config";
import Markdown from "markdown-to-jsx";
import { SparklesIcon } from "../icons/SparklesIcon";
import * as React from "react";
import { Message } from "ai";
import { useEffect, useState } from "react";
import { CreateIcon } from "../icons/CreateIcon";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      keepLastMessageOnError: true,
    });

  return (
    <div className="relative w-full mx-auto  h-full flex flex-col gap-4">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[740px] mx-auto flex-1 px-8 py-4 flex flex-col gap-2">
          {messages.map((message) => (
            <MessageLine key={message.id} message={message} />
          ))}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="max-w-[740px] mx-auto w-full flex-0 my-0 relative overflow-hidden rounded-lg"
      >
        <div className="mx-8 m-4 relative">
          <input
            placeholder="Create a draft about…"
            className="border block w-full p-2 pl-3 rounded-lg outline-none disabled:transition-colors focus:outline outline-indigo-500 disabled:bg-gray-50 disabled:outline-gray-400"
            name="prompt"
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            className="absolute right-0 px-2 top-0 bottom-0 disabled:opacity-50 hover:enabled:bg-gray-100 disabled:transition-opacity"
            disabled={isLoading || !input}
          >
            <SparklesIcon
              style={isLoading || !input ? { opacity: 0.6 } : {}}
              className="h-4 text-indigo-500  pointer-events-none disabled:transition-opacity"
            />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageLine({ message }: { message: Message }) {
  const [title, setTitle] = useState("null");
  const [content, setContent] = useState(message.content);

  useEffect(() => {
    const match = message.content.match(/^#\s(.+)/); // Check if string starts with "# "
    if (match) {
      setTitle(match[1]);
      setContent(message.content.replace(/^#\s.+/, "").trim()); // Remove the title from the string
    } else {
      setTitle("");
      setContent(message.content);
    }
  }, [message.content]);

  return (
    <div key={message.id}>
      {message.role === "user" ? (
        <div className="flex justify-end">
          <div className="bg-gray-100 rounded-full py-1.5 px-3">{content}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="border rounded-2xl shadow-sm">
            {title ? (
              <div className="font-semibold border-b px-4 py-2 pr-2 text-sm flex justify-start items-center gap-1.5">
                <span>{title}</span>
                <form
                  action={async () => {
                    const room = await createRoomWithLexicalDocument(
                      content,
                      title
                    );
                    redirect(getPageUrl(room.id));
                  }}
                >
                  <button className="font-normal text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors rounded-lg py-1 px-1.5 flex gap-1 items-center">
                    <CreateIcon className="w-3 h-3 opacity-70" />
                    Create
                  </button>
                </form>
              </div>
            ) : null}
            <Markdown options={{ forceBlock: true }} className="px-4">
              {content}
            </Markdown>
          </div>
          <form
            action={async () => {
              const room = await createRoomWithLexicalDocument(content, title);
              redirect(getPageUrl(room.id));
            }}
          >
            <button className="bg-gray-100 hover:bg-gray-200 transition-colors rounded-full py-1.5 px-3 flex gap-1.5 items-center">
              <CreateIcon className="w-4 h-4 opacity-70" />
              Create document
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
