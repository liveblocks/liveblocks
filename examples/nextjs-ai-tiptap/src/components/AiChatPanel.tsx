import { AiChat, AiTool } from "@liveblocks/react-ui";
import { defineAiTool } from "@liveblocks/client";
import { Editor } from "@tiptap/core";
import DOMPurify from "dompurify";
import { useRoom } from "@liveblocks/react";

export function AiChatPanel({ editor }: { editor: Editor | null }) {
  const room = useRoom();

  return (
    <AiChat
      chatId={room.id + "-21"}
      layout="compact"
      knowledge={[
        {
          description: "The Tiptap editor's JSON state",
          value: editor?.getJSON() || "Loading...",
        },
      ]}
      tools={{
        "insert-content-with-html": defineAiTool()({
          description: `Tiptap's \`insertContentAt\` function using HTML input.
\`position\` refer to the JSON position, and this will insert content. 
Don't use a position that's too large.

Example of what this does:

\`\`\`js
editor.commands.insertContentAt(position, html);
\`\`\`

The \'line\' is just for display.`,
          parameters: {
            type: "object",
            properties: {
              position: { type: "number" },
              html: { type: "string" },
              line: { type: "number" },
            },
            required: ["position", "html", "line"],
          },
          render: ({ $types, args, result }) => (
            <AiTool
              // title={`Insert into line ${getLineAtPosition(editor, args?.from || 0)}`}
              title={`Insert into line ${result?.line || args?.line || 0}`}
            >
              <div
                className="lb-prose"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(args?.html || ""),
                }}
              />
              <AiTool.Confirmation<typeof $types>
                confirm={({ position, html }) => {
                  if (!editor) {
                    return null;
                  }

                  editor.commands.insertContentAt(position, html);

                  return {
                    ok: true,
                    message: "Text has been added",
                    line: getLineAtPosition(editor, args?.position || 0),
                  };
                }}
                cancel={() => {
                  return {
                    ok: false,
                    message: "The user has cancelled adding text",
                  };
                }}
              ></AiTool.Confirmation>
            </AiTool>
          ),
        }),
        "replace-content-with-html": defineAiTool()({
          description: `Tiptap's \`insertContentAt\` function using HTML input.
\`from\` and \`to\` refer to the JSON positions, and this will replace content. 
Don't use a range that's too large.

Example of what this does:

\`\`\`js
editor.commands.insertContentAt({ from, to }, html);
\`\`\`

The \'line\' is just for display.`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              html: { type: "string" },
              line: { type: "number" },
            },
            required: ["from", "to", "html", "line"],
          },
          render: ({ $types, args }) => (
            <AiTool
              // title={`Insert into line ${getLineAtPosition(editor, args?.from || 0)}`}
              title={`Insert into line ${args?.line || 0}`}
            >
              <div
                className="lb-prose"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(args?.html || ""),
                }}
              />
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to, html }) => {
                  if (!editor) {
                    return null;
                  }

                  editor.commands.insertContentAt({ from, to }, html);

                  return { ok: true, message: "Text has been added" };
                }}
                cancel={() => {
                  return {
                    ok: false,
                    message: "The user has cancelled adding text",
                  };
                }}
              ></AiTool.Confirmation>
            </AiTool>
          ),
        }),
      }}
    />
  );
}

function getLineTextAtPosition(editor: Editor | null, position: number) {
  if (!editor) {
    return null;
  }
  const resolvedPos = editor.state.doc.resolve(position);
  const blockNode = resolvedPos.node(resolvedPos.depth); // usually the paragraph or block element
  return blockNode;
}

function getSurroundingText(
  editor: Editor,
  position: number,
  contextLength = 100
) {
  if (!editor) {
    return null;
  }
  const start = Math.max(0, position - contextLength);
  const end = Math.min(editor.state.doc.content.size, position + contextLength);
  return editor.state.doc.textBetween(start, end, " ");
}

function getLineAtPosition(editor: Editor | null, position: number) {
  if (!editor) {
    return null;
  }
  let line = 0;
  let currentPos = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.isBlock) {
      line++;
      // Check if the position is inside this block
      if (pos <= position && position < pos + node.nodeSize) {
        return false; // stop traversal
      }
    }
    return true;
  });

  return line;
}
