import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useState } from "react";
import { CoreMessage } from "ai";
import { useSelection } from "./hooks";
import { continueConversation } from "../actions/ai";
import { readStreamableValue } from "ai/rsc";
import { $getSelection } from "lexical";
import * as React from "react";

export function AIToolbar({
  setState,
}: {
  setState: (state: "default" | "ai") => void;
}) {
  const [editor] = useLexicalComposerContext();

  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState("");

  const lastAiMessage = messages
    .filter((m) => m.role === "assistant")
    .slice(-1)[0];

  const { selection, textContent } = useSelection();
  // console.log("selection: ", textContent);
  // console.log("ai:", lastAiMessage);

  return (
    <div>
      <div>
        {lastAiMessage?.content ? (
          <div className="whitespace-pre-wrap">{lastAiMessage.content}</div>
        ) : null}
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            const systemMessage = `The user is selecting this text: 
            
            """
            ${textContent || ""}
            """
            `;

            const newMessages: CoreMessage[] = [
              ...messages,
              { content: systemMessage, role: "system" },
              { content: input, role: "user" },
            ];

            setMessages(newMessages);
            setInput("");

            const result = await continueConversation(newMessages);

            for await (const content of readStreamableValue(result)) {
              setMessages([
                ...newMessages,
                {
                  role: "assistant",
                  content: content as string,
                },
              ]);
            }
          }}
          className="w-24"
        >
          <div>
            <input
              className="w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
              value={input}
              placeholder="Say something..."
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <div>
            <button
              onClick={() => {
                if (!lastAiMessage?.content) {
                  return;
                }
                editor.update(() => {
                  const selection = $getSelection();
                  selection?.insertRawText(lastAiMessage.content);
                });
              }}
              // disabled={!lastAiMessage?.content}
            >
              Go
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
