import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CoreMessage } from "ai";
import { useSelection } from "./hooks";
import { continueConversation } from "../actions/ai";
import { readStreamableValue } from "ai/rsc";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from "lexical";
import * as React from "react";
import { Command } from "cmdk";
import {
  RESTORE_SELECTION_COMMAND,
  SAVE_SELECTION_COMMAND,
} from "./preserve-selection";

type OptionChild = { text: string; prompt: string; children?: never };
type OptionParent = { text: string; children: OptionChild[]; prompt?: never };
type Option = OptionChild | OptionParent;
type OptionGroup = {
  text: string;
  options: Option[];
};

const languages = [
  //"Arabic",
  //"Bengali",
  //"Chinese",
  "Dutch",
  "English",
  "French",
  //"German",
  //"Hindi",
  //"Japanese",
  //"Korean",
  "Nepali",
  //"Portuguese",
  "Spanish",
];

const styles = ["Formal", "Friendly", "Pirate", "Poetic"];

const optionsGroups: OptionGroup[] = [
  {
    text: "Modify selection",
    options: [
      {
        text: "Improve writing",
        prompt: "Improve the quality of the text",
      },
      {
        text: "Fix mistakes",
        prompt: "Fix any typos or general errors in the text",
      },
      {
        text: "Shorten",
        prompt: "Shorten the text",
      },
      {
        text: "Lengthen",
        prompt: "Lengthen the text, going into more detail",
      },
    ],
  },
  {
    text: "Generate",
    options: [
      {
        text: "Translate into…",
        children: languages.map((lang) => ({
          text: lang,
          prompt: `Translate text into the ${lang} language`,
        })),
      },
      {
        text: "Change style…",
        children: styles.map((style) => ({
          text: style,
          prompt: `Change text into ${style} style`,
        })),
      },
    ],
  },
];

export function AIToolbar({
  state,
  setState,
  onClose,
}: {
  state: "default" | "ai";
  setState: (state: "default" | "ai") => void;
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const lastAiMessage = messages.filter((m) => m.role === "assistant")[0];

  const { selection, textContent } = useSelection();
  // console.log("selection: ", textContent);
  // console.log("ai:", lastAiMessage);

  const [pages, setPages] = React.useState<string[]>([]);
  const page = pages[pages.length - 1];
  const selectedOption = optionsGroups
    .flatMap((group) => group.options)
    .flatMap((option) =>
      option.children ? [option, ...option.children] : [option]
    )
    .find((option) => option.text === page);

  const submitPrompt = useCallback(
    async (prompt: string) => {
      setLoading(true);
      const systemMessage = `Do not surround your answer in quote marks. Only return the answer, nothing else. The user is selecting this text: 
            
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
      setLoading(false);
    },
    [textContent, setLoading]
  );

  // Focus command panel on load
  const commandRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state === "ai" && commandRef.current) {
      commandRef.current.focus();
    }
  }, [state, loading, page]);

  return (
    <>
      <div className="rounded-lg border shadow-2xl border-border/80 bg-card pointer-events-auto">
        {lastAiMessage?.content ? (
          <div className="whitespace-pre-wrap p-2">{lastAiMessage.content}</div>
        ) : null}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            submitPrompt(input);
          }}
          className="w-full"
        >
          <input
            className="block w-full p-2 border border-gray-300 rounded shadow-xl"
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.target.value)}
          />
        </form>
      </div>
      {!loading ? (
        <Command
          ref={commandRef}
          shouldFilter={false}
          onKeyDown={(e) => {
            // Escape and backspace go back to previous page or exit
            if (e.key === "Escape" || e.key === "Backspace") {
              e.preventDefault();

              if (page) {
                setPages((pages) => pages.slice(0, -1));
              } else {
                setPages([]);
                setState("default");
                onClose();
              }
            }
          }}
          className="mt-1 rounded-lg border shadow-2xl border-border/80 bg-card max-w-xs pointer-events-auto"
        >
          <Command.List>
            {lastAiMessage?.content && !page ? (
              <>
                <CommandItem
                  onSelect={() => {
                    if (!lastAiMessage?.content) {
                      return;
                    }
                    editor.update(() => {
                      const selection = $getSelection();
                      selection?.insertRawText(lastAiMessage.content);
                    });
                  }}
                >
                  Replace selection
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    if (!lastAiMessage?.content) {
                      return;
                    }
                    editor.update(() => {
                      const selection = $getSelection();
                      if ($isRangeSelection(selection)) {
                        const node = selection.focus.getNode();
                        const offset = selection.focus.offset;

                        if (node instanceof TextNode) {
                          const textContent = node.getTextContent();
                          const beforeText = textContent.slice(0, offset);
                          const afterText = textContent.slice(offset);

                          const newText = `${beforeText} ${lastAiMessage.content}${afterText}`;
                          node.replace(new TextNode(newText));
                        }
                      }
                    });
                  }}
                >
                  Insert after
                </CommandItem>
                <Command.Separator />
              </>
            ) : null}

            {page ? (
              <CommandItem onSelect={() => setPages([])}>← Back</CommandItem>
            ) : (
              optionsGroups.map((optionGroup, index) => (
                <Fragment key={optionGroup.text}>
                  {index !== 0 ? <Command.Separator /> : null}
                  <Command.Group heading={optionGroup.text}>
                    {optionGroup.options.map((option) =>
                      option.prompt ? (
                        // Final prompt
                        <CommandItem
                          key={option.text}
                          onSelect={() => {
                            submitPrompt(option.prompt);
                            setPages([]);
                          }}
                        >
                          {option.text}
                        </CommandItem>
                      ) : (
                        // Open another page
                        <CommandItem
                          key={option.text}
                          onSelect={() => {
                            setPages([...pages, option.text]);
                          }}
                        >
                          {option.text}
                        </CommandItem>
                      )
                    )}
                  </Command.Group>
                </Fragment>
              ))
            )}

            {selectedOption?.children
              ? selectedOption.children.map((option) => (
                  <CommandItem
                    key={option.text}
                    onSelect={() => {
                      submitPrompt(option.prompt);
                      setPages([]);
                    }}
                  >
                    {option.text}
                  </CommandItem>
                ))
              : null}
          </Command.List>
        </Command>
      ) : null}
    </>
  );
}

function CommandItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: ((value: string) => void) | undefined;
}) {
  return (
    <Command.Item onSelect={onSelect} onMouseDown={(e) => e.preventDefault()}>
      {children}
    </Command.Item>
  );
}
