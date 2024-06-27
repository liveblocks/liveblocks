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
import { useSelection } from "../hooks";
import { continueConversation } from "../actions/ai";
import { readStreamableValue } from "ai/rsc";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from "lexical";
import * as React from "react";
import { Command } from "cmdk";
import { TranslateIcon } from "../icons/TranslateIcon";
import { SpellcheckIcon } from "../icons/SpellcheckIcon";
import { WandIcon } from "../icons/WandIcon";
import { ShortenIcon } from "../icons/ShortenIcon";
import { LengthenIcon } from "../icons/LengthenIcon";
import { StyleIcon } from "../icons/StyleIcon";
import { ReplaceIcon } from "../icons/ReplaceIcon";
import { InsertInlineIcon } from "../icons/InsertInlineIcon";
import { BackIcon } from "../icons/BackIcon";
import { RestartIcon } from "../icons/RestartIcon";
import { OptionsIcon } from "../icons/OptionsIcon";
import {
  RESTORE_SELECTION_COMMAND,
  SAVE_SELECTION_COMMAND,
} from "./PreserveSelection";
import { RubbishIcon } from "../icons/RubbishIcon";
import { InsertParagraphIcon } from "../icons/InsertParagraphIcon";

type OptionChild = {
  text: string;
  prompt: string;
  icon: ReactNode;
  children?: never;
};

type OptionParent = {
  text: string;
  children: OptionChild[];
  icon: ReactNode;
  prompt?: never;
};

type OptionGroup = {
  text: string;
  options: (OptionChild | OptionParent)[];
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
        icon: <WandIcon className="h-3.5" />,
      },
      {
        text: "Fix mistakes",
        prompt: "Fix any typos or general errors in the text",
        icon: <SpellcheckIcon className="h-full" />,
      },
      {
        text: "Shorten",
        prompt: "Shorten the text",
        icon: <ShortenIcon className="h-full" />,
      },
      {
        text: "Lengthen",
        prompt: "Lengthen the text, going into more detail",
        icon: <LengthenIcon className="h-full" />,
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
        icon: <TranslateIcon className="h-full" />,
      },
      {
        text: "Change style…",
        children: styles.map((style) => ({
          text: style,
          prompt: `Change text into ${style} style`,
        })),
        icon: <StyleIcon className="h-full" />,
      },
    ],
  },
];

export function AIToolbar({
  state,
  setState,
  onClose,
}: {
  state: "default" | "ai" | "closed";
  setState: (state: "default" | "ai" | "closed") => void;
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState("");

  const [aiState, setAiState] = useState<"initial" | "loading" | "complete">(
    "initial"
  );
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

  const [previousPrompt, setPreviousPrompt] = useState("");

  // Send prompt to AI
  const submitPrompt = useCallback(
    async (prompt: string) => {
      setAiState("loading");
      setInput("");
      setPreviousPrompt(prompt);

      // Send on the user's text
      const systemMessage = `Do not surround your answer in quote marks. Only return the answer, nothing else. The user is selecting this text: 
            
"""
${textContent || ""}
"""
`;

      // Create new messages with selected text and prompt from user or command panel
      const newMessages: CoreMessage[] = [
        ...messages,
        { content: systemMessage, role: "system" },
        { content: prompt, role: "user" },
      ];
      setMessages(newMessages);

      // Stream in results
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
      setAiState("complete");
    },
    [textContent, setAiState]
  );

  // Focus command panel on load
  const commandRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state === "ai" && commandRef.current) {
      commandRef.current.focus();
    }
  }, [state, aiState, page]);

  return (
    <>
      <div className="rounded-lg border shadow-2xl border-border/80 bg-card pointer-events-auto">
        {lastAiMessage?.content ? (
          // If the AI has streamed in content, show it
          <div className="whitespace-pre-wrap p-2">{lastAiMessage.content}</div>
        ) : null}

        <form
          onSubmit={async (e) => {
            // Submit a custom prompt typed into the input
            e.preventDefault();
            submitPrompt(input);
          }}
          className="w-full"
        >
          <input
            className="block w-full p-2 border border-gray-300 rounded shadow-xl"
            value={input}
            placeholder="Prompt AI…"
            onChange={(e) => setInput(e.target.value)}
            onMouseDown={(e) => {
              editor.dispatchCommand(SAVE_SELECTION_COMMAND, null);
              e.preventDefault();
              editor.dispatchCommand(RESTORE_SELECTION_COMMAND, null);
            }}
            onMouseUp={() => {
              // editor.dispatchCommand(RESTORE_SELECTION_COMMAND, null);
            }}
          />
        </form>
      </div>

      {aiState !== "loading" ? (
        // Don't show command panel when a result is streaming in
        <Command
          ref={commandRef}
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Backspace") {
              e.preventDefault();

              if (page) {
                // Escape and backspace go back to previous page
                setPages((pages) => pages.slice(0, -1));
              } else {
                // or exit if at top level
                setPages([]);
                setState("default");
                onClose();
              }
            }
          }}
          className="mt-1 rounded-lg border shadow-2xl border-border/80 bg-card max-w-[210px] max-h-[290px] overflow-y-auto pointer-events-auto"
        >
          <Command.List>
            {lastAiMessage?.content && !page ? (
              <>
                <CommandItem
                  icon={<ReplaceIcon className="h-full" />}
                  onSelect={() => {
                    if (!lastAiMessage?.content) {
                      return;
                    }

                    // Replace currently selected text
                    editor.update(() => {
                      const selection = $getSelection();
                      selection?.insertRawText(lastAiMessage.content);
                    });

                    setPages([]);
                    setState("default");
                    onClose();
                  }}
                >
                  Replace selection
                </CommandItem>
                <CommandItem
                  icon={<InsertInlineIcon className="h-full" />}
                  onSelect={() => {
                    if (!lastAiMessage?.content) {
                      return;
                    }

                    // Insert directly after the current text, inline
                    editor.update(() => {
                      const selection = $getSelection();
                      if ($isRangeSelection(selection)) {
                        const node = selection.focus.getNode();
                        const offset = selection.focus.offset;

                        if (node instanceof TextNode) {
                          const textContent = node.getTextContent();
                          const newText = `${textContent.slice(0, offset)} ${lastAiMessage.content} ${textContent.slice(offset)}`;
                          node.replace(new TextNode(newText));
                        }
                      }
                    });

                    setPages([]);
                    setState("default");
                    onClose();
                  }}
                >
                  Add text inline
                </CommandItem>
                <CommandItem
                  icon={<InsertParagraphIcon className="h-full" />}
                  onSelect={() => {
                    if (!lastAiMessage?.content) {
                      return;
                    }

                    // Insert into a new paragraph after the current one
                    editor.update(() => {
                      const selection = $getSelection();
                      if ($isRangeSelection(selection)) {
                        const focus = selection.focus;
                        const focusNode = focus.getNode();
                        const textNode = $createTextNode(lastAiMessage.content);
                        const paragraphNode = $createParagraphNode();
                        paragraphNode.append(textNode);
                        focusNode.insertAfter(paragraphNode);
                      }
                    });

                    setPages([]);
                    setState("default");
                    setAiState("initial");
                    onClose();
                  }}
                >
                  Add new paragraph
                </CommandItem>
                {aiState === "complete" ? (
                  <>
                    <Command.Separator />
                    <Command.Group heading="Modify">
                      <CommandItem
                        icon={<RestartIcon className="h-full" />}
                        onSelect={() => {
                          submitPrompt(previousPrompt);
                        }}
                      >
                        Regenerate
                      </CommandItem>
                      <CommandItem
                        icon={<OptionsIcon className="h-full" />}
                        onSelect={() => {
                          setAiState("initial");
                        }}
                      >
                        Other options
                      </CommandItem>
                    </Command.Group>
                    <Command.Separator />
                    <CommandItem
                      icon={<RubbishIcon className="h-full text-gray-600" />}
                      onSelect={() => {
                        onClose();
                      }}
                    >
                      Discard
                    </CommandItem>
                  </>
                ) : null}
              </>
            ) : null}

            {aiState === "initial" ? (
              // Show AI options in initial state
              <>
                {page ? (
                  <CommandItem
                    icon={<BackIcon className="h-full" />}
                    onSelect={() => setPages([])}
                  >
                    Back
                  </CommandItem>
                ) : (
                  optionsGroups.map((optionGroup, index) => (
                    <Fragment key={optionGroup.text}>
                      {index !== 0 ? <Command.Separator /> : null}
                      <Command.Group heading={optionGroup.text}>
                        {optionGroup.options.map((option) =>
                          option.prompt ? (
                            // An item with a prompt
                            <CommandItem
                              key={option.text}
                              icon={option.icon}
                              onSelect={() => {
                                submitPrompt(option.prompt);
                                setPages([]);
                              }}
                            >
                              {option.text}
                            </CommandItem>
                          ) : (
                            // An item that opens another page
                            <CommandItem
                              key={option.text}
                              icon={option.icon}
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
                      // The items in the current page
                      <CommandItem
                        key={option.text}
                        icon={option.icon}
                        onSelect={() => {
                          submitPrompt(option.prompt);
                          setPages([]);
                        }}
                      >
                        {option.text}
                      </CommandItem>
                    ))
                  : null}
              </>
            ) : null}
          </Command.List>
        </Command>
      ) : null}
    </>
  );
}

function CommandItem({
  children,
  icon,
  onSelect,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect: ((value: string) => void) | undefined;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      onMouseDown={(e) => {
        // Preserve text editor selection
        e.preventDefault();
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          {icon ? (
            <div className="w-5 h-[16px] text-indigo-500 flex items-center justify-center -ml-1">
              {icon}
            </div>
          ) : null}
          {children}
        </div>
        <div></div>
      </div>
    </Command.Item>
  );
}
