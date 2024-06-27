import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useState } from "react";
import { CoreMessage } from "ai";
import { useSelection } from "./hooks";
import { continueConversation } from "../actions/ai";
import { readStreamableValue } from "ai/rsc";
import { $getSelection } from "lexical";
import * as React from "react";
import { Command } from "cmdk";

type OptionChild = { text: string; prompt: string; children?: never };
type OptionParent = { text: string; children: OptionChild[]; prompt?: never };
type Option = OptionChild | OptionParent;

const options: Option[] = [
  {
    text: "Shorten",
    prompt: "Make the text shorter",
  },
  {
    text: "Translate",
    children: [
      {
        text: "French",
        prompt: "Translate the text into French",
      },
      {
        text: "Spanish",
        prompt: "Translate the text into Spanish",
      },
    ],
  },
  {
    text: "Change style",
    children: [
      {
        text: "Formal",
        prompt: "Change the text into a formal style",
      },
      {
        text: "Friendly",
        prompt: "Change the text into a friendly style",
      },
    ],
  },
];

export function AIToolbar({
  state,
  setState,
}: {
  state: "default" | "ai";
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

  //const [open, setOpen] = useState(true);

  const ref = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [pages, setPages] = React.useState<string[]>([]);
  const page = pages[pages.length - 1];
  const selectedOption =
    options.filter((option) => page === option.text)?.[0] || null;

  const submitPrompt = useCallback(async (prompt: string) => {
    const systemMessage = `Do not add quote marks around your changes, unless requested. The user is selecting this text: 
            
"""
${textContent || ""}
"""
`;

    const newMessages: CoreMessage[] = [
      ...messages,
      { content: systemMessage, role: "system" },
      { content: prompt, role: "user" },
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
  }, []);

  return (
    <>
      {lastAiMessage?.content ? (
        <div className="whitespace-pre-wrap">{lastAiMessage.content}</div>
      ) : null}
      {/*<Command.Input value={search} onValueChange={setSearch} />*/}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          submitPrompt(input);
        }}
        className="w-full"
      >
        <input
          className="block w-full p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.target.value)}
        />
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
      <Command
        autoFocus={true}
        onKeyDown={(e) => {
          // Escape goes to previous page
          // Backspace goes to previous page when search is empty
          if (e.key === "Escape" || (e.key === "Backspace" && !search)) {
            e.preventDefault();
            setPages((pages) => pages.slice(0, -1));
          }
        }}
      >
        <Command.List>
          {!page &&
            options.map((option) =>
              option.prompt ? (
                <Command.Item onSelect={() => submitPrompt(option.prompt)}>
                  {option.text}
                </Command.Item>
              ) : (
                <Command.Item
                  onSelect={() => setPages([...pages, option.text])}
                >
                  {option.text}
                </Command.Item>
              )
            )}

          {selectedOption?.children
            ? selectedOption.children.map((option) => (
                <Command.Item onSelect={() => submitPrompt(option.prompt)}>
                  {option.text}
                </Command.Item>
              ))
            : null}

          {!page && (
            <>
              <Command.Item onSelect={() => setPages([...pages, "projects"])}>
                Search projects…
              </Command.Item>
              <Command.Item onSelect={() => setPages([...pages, "teams"])}>
                Join a team…
              </Command.Item>
            </>
          )}

          {page === "projects" && (
            <>
              <Command.Item>Project A</Command.Item>
              <Command.Item>Project B</Command.Item>
            </>
          )}

          {page === "teams" && (
            <>
              <Command.Item>Team 1</Command.Item>
              <Command.Item>Team 2</Command.Item>
            </>
          )}
        </Command.List>
      </Command>
    </>
  );

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
