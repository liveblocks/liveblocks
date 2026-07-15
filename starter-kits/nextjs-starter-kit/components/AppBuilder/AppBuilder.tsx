"use client";

import { SandpackLayout, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { defineAiTool } from "@liveblocks/client";
import {
  RegisterAiKnowledge,
  RegisterAiTool,
  useAiChats,
  useAiChatStatus,
  useCreateAiChat,
  useDeleteAiChat,
  useMutation,
  useSelf,
  useSendAiMessage,
  useStorage,
} from "@liveblocks/react";
import { AiChat, AiChatComponentsEmptyProps, AiTool } from "@liveblocks/react-ui";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { nanoid } from "nanoid";
import estree from "prettier/plugins/estree";
import html from "prettier/plugins/html";
import typescript from "prettier/plugins/typescript";
import prettier from "prettier/standalone";
import {
  ComponentProps,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
import { useInitialDocument } from "@/lib/hooks";
import { Spinner } from "@/primitives/Spinner";
import "./app-builder.css";

const COPILOT_ID = process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined;

type Panel = "preview" | "editor";

type SidebarChat = {
  id: string;
  title: string;
  createdAt?: string;
  lastMessageAt?: string;
};

/**
 * This example uses a custom copilot, which you can create on https://liveblocks.io/dashboard
 * Place your copilot id in `.env.local` under `NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID`
 * Configure the copilot with an `edit-code` tool matching the one registered below.
 * The live demo uses GPT-4.1 mini with the following prompt:
```
- You generate React/Tailwind code that is shown in a live preview.
- Tailwind has the default styles available.
- What you create will replace the current design.
- IMPORTANT: Users will always want you to make changes, so use your `edit-code` tool every time.
- You must always use `export default function App` as the entry point in your code.
- When using React hooks always use `import { ... } from "react"`.
- No other packages are available, only `"react"`.
- After a generation, leave a brief explanation of your changes, typically a few sentences at most.
- When replying, use markdown where appropriate, for examples `code`, **bold**, and ```ts code fences```
- You apply the default prettier rules.
```
 */

export function AppBuilder() {
  const initialDocument = useInitialDocument();
  const documentId = initialDocument.id;
  const createAiChat = useCreateAiChat();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("preview");
  const handleCreateChat = useCallback(() => {
    const chatId = createChatId(documentId);
    createAiChat({
      id: chatId,
      metadata: { documentId },
    });
    setSelectedChatId(chatId);
  }, [createAiChat, documentId]);

  return (
    <div className="tw app-builder flex h-full min-h-0 w-full overflow-hidden bg-neutral-100 text-neutral-900">
      <ChatSidebar
        documentId={documentId}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
      />
      <div className="flex min-w-0 grow flex-col gap-2.5 p-2.5 pl-0">
        {selectedChatId ? (
          <AppWorkbench
            chatId={selectedChatId}
            panel={panel}
            setPanel={setPanel}
          />
        ) : (
          <EmptyWorkbench onCreateChat={handleCreateChat} />
        )}
      </div>
    </div>
  );
}

function ChatSidebar({
  documentId,
  selectedChatId,
  onSelectChat,
}: {
  documentId: string;
  selectedChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
}) {
  const createAiChat = useCreateAiChat();
  const deleteAiChat = useDeleteAiChat();
  const result = useAiChats({ query: { metadata: { documentId } } });

  const chats = useMemo<SidebarChat[]>(() => {
    if (result.isLoading || result.error) {
      return [];
    }

    return result.chats.map((chat) => ({
      id: chat.id,
      title: chat.title || "Untitled chat",
      createdAt: chat.createdAt,
      lastMessageAt: chat.lastMessageAt,
    }));
  }, [result]);

  const displayedChats = useMemo<SidebarChat[]>(() => {
    if (!selectedChatId || chats.some((chat) => chat.id === selectedChatId)) {
      return chats;
    }

    return [
      {
        id: selectedChatId,
        title: "New chat",
      },
      ...chats,
    ];
  }, [chats, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId && chats.length > 0) {
      onSelectChat(chats[0].id);
    }
  }, [chats, onSelectChat, selectedChatId]);

  const handleCreateChat = useCallback(() => {
    const chatId = createChatId(documentId);
    createAiChat({
      id: chatId,
      metadata: { documentId },
    });
    onSelectChat(chatId);
  }, [createAiChat, documentId, onSelectChat]);

  const handleDeleteChat = useCallback(
    (event: MouseEvent<HTMLElement>, chatId: string) => {
      event.stopPropagation();
      deleteAiChat(chatId);

      if (selectedChatId === chatId) {
        const nextChat = displayedChats.find((chat) => chat.id !== chatId);
        onSelectChat(nextChat?.id ?? null);
      }
    },
    [deleteAiChat, displayedChats, onSelectChat, selectedChatId]
  );

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">AI chats</h2>
          <p className="text-xs text-neutral-500">Private to you in this app</p>
        </div>
        <button
          type="button"
          onClick={handleCreateChat}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-neutral-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
        >
          <PlusIcon className="size-3.5" />
          New chat
        </button>
      </div>

      <div className="min-h-0 grow overflow-y-auto p-2">
        {result.isLoading ? (
          <div className="flex h-24 items-center justify-center text-neutral-400">
            <Spinner size={18} />
          </div>
        ) : result.error ? (
          <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Problem loading chats.
          </div>
        ) : displayedChats.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-white p-6 text-center">
            <SparklesIcon className="mb-3 size-8 text-neutral-300" />
            <h3 className="text-sm font-medium text-neutral-900">
              Start your first chat
            </h3>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Create a chat to ask the copilot to build or edit this app.
            </p>
            <button
              type="button"
              onClick={handleCreateChat}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-sm bg-neutral-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
            >
              <PlusIcon className="size-3.5" />
              New chat
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {displayedChats.map((chat) => (
              <div
                key={chat.id}
                data-selected={chat.id === selectedChatId || undefined}
                className="group flex items-start justify-between gap-2 rounded-sm transition-colors hover:bg-white data-[selected]:bg-white data-[selected]:shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => onSelectChat(chat.id)}
                  className="min-w-0 grow px-2.5 py-2 text-left"
                >
                  <span className="block truncate text-sm font-medium text-neutral-800">
                    {chat.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-400">
                    {formatChatDate(chat.lastMessageAt ?? chat.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="mr-2 mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 group-data-[selected]:opacity-100"
                  aria-label={`Delete ${chat.title}`}
                  onClick={(event) => handleDeleteChat(event, chat.id)}
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            ))}

            {!result.hasFetchedAll && (
              <button
                type="button"
                onClick={result.fetchMore}
                disabled={result.isFetchingMore}
                className="mt-2 rounded-sm border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {result.isFetchingMore ? "Loading..." : "Load more chats"}
              </button>
            )}
          </div>
        )}
      </div>

      {!COPILOT_ID && <CopilotMissingNotice compact />}
    </aside>
  );
}

function AppWorkbench({
  chatId,
  panel,
  setPanel,
}: {
  chatId: string;
  panel: Panel;
  setPanel: (panel: Panel) => void;
}) {
  const { status, toolName } = useAiChatStatus(chatId);
  const isGeneratingCode = status === "generating" && toolName === "edit-code";

  return (
    <main className="flex min-h-0 grow gap-2.5">
      <section className="flex w-[380px] shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        {COPILOT_ID ? <ChatPanel chatId={chatId} /> : <CopilotMissingNotice />}
      </section>

      <section className="relative flex min-w-0 grow flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 pr-4">
          <div className="flex items-center gap-1.5 p-2.5">
            <PanelButton
              selected={panel === "preview"}
              onClick={() => setPanel("preview")}
            >
              Preview
            </PanelButton>
            <PanelButton
              selected={panel === "editor"}
              onClick={() => setPanel("editor")}
            >
              Editor
            </PanelButton>
          </div>
          {isGeneratingCode ? (
            <div className="text-sm text-neutral-600 animate-pulse">
              Generating...
            </div>
          ) : (
            <div className="text-sm text-neutral-300">Completed</div>
          )}
        </div>

        <div className="relative grow">
          <div
            className="absolute inset-0"
            style={{ display: panel === "preview" ? "block" : "none" }}
          >
            <Preview chatId={chatId} />
          </div>
          <div
            className="absolute inset-0"
            style={{ display: panel === "editor" ? "block" : "none" }}
          >
            <Editor chatId={chatId} />
          </div>
        </div>
      </section>
    </main>
  );
}

function EmptyWorkbench({ onCreateChat }: { onCreateChat: () => void }) {
  return (
    <main className="flex min-h-0 grow items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-white">
      <div className="max-w-sm p-8 text-center">
        <SparklesIcon className="mx-auto mb-4 size-10 text-neutral-300" />
        <h2 className="text-base font-semibold text-neutral-900">
          Choose or create a chat
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          App code is shared in Liveblocks Storage. Start a chat to ask the
          copilot to generate the first version.
        </p>
        <button
          type="button"
          onClick={onCreateChat}
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-sm bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          <PlusIcon className="size-4" />
          New chat
        </button>
      </div>
    </main>
  );
}

function PanelButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-sm px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 data-[selected]:bg-neutral-100 data-[selected]:text-neutral-900"
      data-selected={selected || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ChatPanel({ chatId }: { chatId: string }) {
  return (
    <AiChat
      // Each chat is stored permanently and has a unique ID
      chatId={chatId}
      copilotId={COPILOT_ID}
      className="mx-auto grow"
      layout="inset"
      components={{ Empty, Loading: ChatLoading }}
      autoFocus

      // Chat width is set in app-builder.css with a variable:
      // --lb-ai-chat-container-width
    />
  );
}

const suggestions = ["Build a counter app", "Build a to-do app"];

// Overriding the empty chat state function
function Empty({ chatId, copilotId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId, { copilotId });

  return (
    <div className="mx-auto flex size-full max-w-[--inner-app-width] items-end px-4 pb-[calc(3*var(--lb-spacing))]">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-neutral-600">Suggestions</div>
        <div className="flex flex-wrap items-start gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm font-medium shadow-xs transition-colors hover:bg-neutral-50"
              onClick={() => sendMessage(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="flex size-full items-center justify-center text-neutral-400">
      <Spinner size={18} />
    </div>
  );
}

function CopilotMissingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "border-t border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
          : "flex size-full items-center justify-center bg-amber-50 p-6 text-center text-amber-900"
      }
    >
      <div>
        <div className="font-semibold">AI copilot not configured</div>
        <p className={compact ? "mt-1" : "mt-2 text-sm leading-6"}>
          Create a copilot at{" "}
          <a
            className="underline underline-offset-2"
            href="https://liveblocks.io/dashboard/copilots"
            rel="noreferrer"
            target="_blank"
          >
            liveblocks.io/dashboard/copilots
          </a>{" "}
          and set its id as{" "}
          <code className="rounded-xs bg-amber-100 px-1 py-0.5">
            NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID
          </code>{" "}
          in <code className="rounded-xs bg-amber-100 px-1 py-0.5">.env.local</code>.
        </p>
      </div>
    </div>
  );
}

function Editor({ chatId }: { chatId: string }) {
  const { status, toolName } = useAiChatStatus(chatId);
  const isGeneratingCode = status === "generating" && toolName === "edit-code";
  const canWrite = useSelf((me) => me.canWrite);

  const code = useStorage((root) => root.code);
  const editorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(
    null
  );
  const highlightDecorationsRef =
    useRef<MonacoEditorNamespace.IEditorDecorationsCollection | null>(null);

  const setCode = useMutation(({ storage, self }, newCode: string) => {
    if (!self.canWrite) {
      return;
    }

    storage.set("code", newCode);
  }, []);

  // Highlight each line as its generated in
  const highlightGeneratedLine = useCallback(
    (lineNumber: number, characterPosition?: number) => {
      if (!editorRef.current || lineNumber <= 0) {
        return;
      }

      // Clear previous highlight
      if (highlightDecorationsRef.current) {
        highlightDecorationsRef.current.clear();
      }

      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      const totalLines = model.getLineCount();
      if (lineNumber > totalLines) {
        return;
      }

      const lineContent = model.getLineContent(lineNumber);
      const endColumn = lineContent.length + 1;

      const decorations: MonacoEditorNamespace.IModelDeltaDecoration[] = [
        {
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn,
          },
          options: {
            isWholeLine: true,
            className: "generated-line-highlight",
          },
        },
      ];

      // Add character-level highlight if characterPosition is provided
      if (characterPosition !== undefined && characterPosition > 0) {
        const charColumn = Math.min(characterPosition + 1, endColumn);
        decorations.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: charColumn,
            endLineNumber: lineNumber,
            endColumn: charColumn + 1,
          },
          options: {
            className: "generated-character-highlight",
            isWholeLine: false,
          },
        });
      }

      highlightDecorationsRef.current =
        editorRef.current.createDecorationsCollection(decorations);
    },
    []
  );

  const clearHighlight = useCallback(() => {
    if (highlightDecorationsRef.current) {
      highlightDecorationsRef.current.clear();
      highlightDecorationsRef.current = null;
    }
  }, []);

  const handleMonacoMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    onMonacoMount(editor, monaco);
  }, []);

  return (
    <>
      <RegisterAiKnowledge
        description="The code editor content for the current app."
        value={code === null ? "Loading..." : code}
      />

      <RegisterAiTool
        name="edit-code"
        tool={defineAiTool()({
          description:
            "Edit the code editor content. Use this to build apps and components.",
          parameters: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description:
                  "A 1-3 word description of what you're generating. IMPORTANT: THREE WORDS MAXIMUM. Examples: 'dashboard', 'counter', 'login page'. It will be placed after 'Generating your '. e.g. 'Generating your dashboard'. Make sure it will fit here. ",
              },
              code: {
                type: "string",
                description: "The full code in the editor",
              },
            },
            required: ["description", "code"],
            additionalProperties: false,
          },
          execute: () => {},
          render: ({ stage, partialArgs, args, respond }) => {
            if (stage === "receiving") {
              if (typeof partialArgs.code === "string" && code !== null) {
                // Merge this string with the current code as it streams in
                const lines = partialArgs.code.split("\n");
                const lineCount = lines.length;
                const characterCount = lines[lines.length - 1].length;

                const [currentExtraLine, ...extraLines] = code
                  .split("\n")
                  .slice(lineCount - 1);

                let additionOnLastLine = "";

                // On the last line, fill in characters from previous code
                if (currentExtraLine?.length > lines[lines.length - 1].length) {
                  additionOnLastLine = currentExtraLine.slice(
                    lines[lines.length - 1].length
                  );
                }

                const mergedLines =
                  partialArgs.code +
                  additionOnLastLine +
                  (extraLines.length ? "\n" + extraLines.join("\n") : "");

                setCode(mergedLines);

                // Highlight the current generated line and character
                highlightGeneratedLine(lineCount, characterCount);
              }

              return (
                <AiTool
                  title={`Generating your ${partialArgs?.description || "code"}...`}
                  icon={<GeneratingIcon />}
                  variant="minimal"
                />
              );
            }

            if (stage === "executing") {
              setCode(args.code);

              // Clear highlight when generation is complete
              clearHighlight();
              return (
                <AiTool
                  title={`Generating your ${args.description}...`}
                  icon={<GeneratingIcon />}
                  variant="minimal"
                />
              );
            }

            respond({
              data: {},
              description:
                "You've generated code. Write a very short description.",
            });

            // Clear highlight when fully done
            clearHighlight();

            return (
              <AiTool
                title={`${args.description.charAt(0).toUpperCase() + args.description.slice(1)} generated.`}
                icon={<GeneratingIcon />}
                variant="minimal"
              />
            );
          },
        })}
      />

      <div
        className="absolute inset-0 h-full data-[generating]:cursor-not-allowed"
        data-generating={isGeneratingCode || undefined}
      >
        {code == null ? (
          <ChatLoading />
        ) : (
          <MonacoEditor
            value={code}
            language="javascript"
            theme="light"
            options={{
              readOnly: isGeneratingCode || !canWrite,
              fontSize: 13,
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              contextmenu: false,
              bracketPairColorization: { enabled: false },
              matchBrackets: "never",
              selectionHighlight: false,
              occurrencesHighlight: "off",
            }}
            onChange={(value) => setCode(value ?? "")}
            onMount={handleMonacoMount}
          />
        )}
      </div>
    </>
  );
}

const onMonacoMount: OnMount = (editor, monaco) => {
  // Define a custom theme
  monaco.editor.defineTheme("custom-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editorLineNumber.foreground": "#d0d0d0",
      "editorLineNumber.activeForeground": "#333333",
    },
  });

  // Set the custom theme
  monaco.editor.setTheme("custom-light");

  // `cmd/ctrl + s` runs prettier
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const selection = editor.getSelection();
    const formatted = await prettify(model.getValue());

    // Apply edits
    editor.executeEdits("format", [
      {
        range: model.getFullModelRange(),
        text: formatted,
        forceMoveMarkers: true,
      },
    ]);

    // Restore cursor location
    if (selection) {
      editor.setSelection(selection);
    }
  });
};

async function prettify(code: string) {
  return await prettier
    .format(code, {
      parser: "typescript",
      plugins: [estree, typescript, html],
    })
    .catch((error) => {
      console.error(error);
      return code;
    });
}

function Preview({ chatId }: { chatId: string }) {
  const code = useStorage((root) => root.code);
  const { status, toolName } = useAiChatStatus(chatId);
  const generatingCode = status === "generating" && toolName === "edit-code";

  if (code === null) {
    return <ChatLoading />;
  }

  return (
    <SandpackProvider
      template="react-ts"
      files={{ "/App.js": code }}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
        recompileMode: generatingCode ? "delayed" : "immediate",
      }}
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      <SandpackLayout
        style={{ height: "100%", width: "100%", borderRadius: 0, border: 0 }}
      >
        <SandpackPreview
          style={{ height: "100%", width: "100%", borderRadius: 0 }}
          showNavigator={true}
          showOpenNewtab={false}
          showOpenInCodeSandbox={false}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

function createChatId(documentId: string) {
  return `${documentId}:${nanoid()}`;
}

function formatChatDate(date: string | undefined) {
  if (!date) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function GeneratingIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="size-4"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M5 4a.75.75 0 01.738.616l.252 1.388A1.25 1.25 0 006.996 7.01l1.388.252a.75.75 0 010 1.476l-1.388.252A1.25 1.25 0 005.99 9.996l-.252 1.388a.75.75 0 01-1.476 0L4.01 9.996A1.25 1.25 0 003.004 8.99l-1.388-.252a.75.75 0 010-1.476l1.388-.252A1.25 1.25 0 004.01 6.004l.252-1.388A.75.75 0 015 4zm7-3a.75.75 0 01.721.544l.195.682c.118.415.443.74.858.858l.682.195a.75.75 0 010 1.442l-.682.195a1.25 1.25 0 00-.858.858l-.195.682a.75.75 0 01-1.442 0l-.195-.682a1.25 1.25 0 00-.858-.858l-.682-.195a.75.75 0 010-1.442l.682-.195a1.25 1.25 0 00.858-.858l.195-.682A.75.75 0 0112 1zm-2 10a.75.75 0 01.728.568.968.968 0 00.704.704.75.75 0 010 1.456.968.968 0 00-.704.704.75.75 0 01-1.456 0 .968.968 0 00-.704-.704.75.75 0 010-1.456.968.968 0 00.704-.704A.75.75 0 0110 11z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 4.5h10" />
      <path d="M6.5 2.5h3l.5 2h-4l.5-2Z" />
      <path d="M5 6.5v6M8 6.5v6M11 6.5v6" />
      <path d="M4.5 4.5 5 14h6l.5-9.5" />
    </svg>
  );
}

function SparklesIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.75a1 1 0 0 1 .96.72l.9 3.1a5 5 0 0 0 3.4 3.4l3.1.9a1 1 0 0 1 0 1.92l-3.1.9a5 5 0 0 0-3.4 3.4l-.9 3.1a1 1 0 0 1-1.92 0l-.9-3.1a5 5 0 0 0-3.4-3.4l-3.1-.9a1 1 0 0 1 0-1.92l3.1-.9a5 5 0 0 0 3.4-3.4l.9-3.1a1 1 0 0 1 .96-.72Zm0 4.48a7 7 0 0 1-4.6 4.6 7 7 0 0 1 4.6 4.6 7 7 0 0 1 4.6-4.6A7 7 0 0 1 12 7.23Z" />
    </svg>
  );
}
