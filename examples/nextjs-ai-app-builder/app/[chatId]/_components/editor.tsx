"use client";

import { useRef, useCallback, ComponentProps } from "react";

import { defineAiTool } from "@liveblocks/client";
import {
  RegisterAiKnowledge,
  RegisterAiTool,
  useMutation,
  useStorage,
  useAiChatStatus,
} from "@liveblocks/react";
import { AiTool } from "@liveblocks/react-ui";

import MonacoEditor from "@monaco-editor/react";

import estree from "prettier/plugins/estree";
import html from "prettier/plugins/html";
import typescript from "prettier/plugins/typescript";
import prettier from "prettier/standalone";

import { Spinner } from "@/components/ui/spinner";

export function Editor({ chatId }: { chatId: string }) {
  const { status, toolName } = useAiChatStatus(chatId);
  const isGeneratingCode = status === "generating" && toolName === "edit-code";

  const code = useStorage((root) => root.code);
  const editorRef = useRef<any>(null);
  const highlightDecorationsRef = useRef<any>(null);

  const setCode = useMutation(({ storage }, newCode) => {
    storage.set("code", newCode);
  }, []);

  // Highlight each line as its generated in
  const highlightGeneratedLine = useCallback(
    (lineNumber: number, characterPosition?: number) => {
      if (!editorRef.current || lineNumber <= 0) return;

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

      const decorations = [
        {
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: endColumn,
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

  const handleMonacoMount = useCallback((editor: any, monaco: any) => {
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
              if (typeof partialArgs.code === "string" && code) {
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
                  title={`Generating your ${partialArgs?.description || "code"}…`}
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
                  title={`Generating your ${args.description}…`}
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
        className="h-full absolute inset-0 data-[generating]:cursor-not-allowed"
        data-generating={isGeneratingCode || undefined}
      >
        {code == null ? (
          <Spinner />
        ) : (
          <MonacoEditor
            value={code || ""}
            language={"javascript"}
            theme="light"
            options={{
              readOnly: isGeneratingCode,
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

const onMonacoMount = (editor: any, monaco: any) => {
  // Define a custom theme
  monaco.editor.defineTheme("custom-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editorLineNumber.foreground": "#d0d0d0", // Light gray for all line numbers
      "editorLineNumber.activeForeground": "#333333", // Darker for the active line number
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
