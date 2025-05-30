import { AiChat, AiTool } from "@liveblocks/react-ui";
import { defineAiTool } from "@liveblocks/client";
import { Editor } from "@tiptap/core";
import DOMPurify from "dompurify";
import { useRoom } from "@liveblocks/react";

export function AiChatPanel({ editor }: { editor: Editor | null }) {
  const room = useRoom();

  return (
    <AiChat
      chatId={room.id + "-3"}
      layout="compact"
      knowledge={[
        {
          description: "The Tiptap editor's JSON state",
          value: editor?.getJSON() || "Loading...",
        },
      ]}
      tools={{
        "move-block": defineAiTool()({
          description: `Moves a block of content from one range to a new position.
          
          ${positionGuidance}`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              targetPosition: { type: "number" },
              line: { type: "number" },
            },
            required: ["from", "to", "targetPosition", "line"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Move block to line ${args?.line}`}>
              <p>
                Move block from {args?.from}–{args?.to} to{" "}
                {args?.targetPosition}?
              </p>
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to, targetPosition }) => {
                  console.log("🔧 AI Tool Confirm Triggered");
                  console.log({ from, to, targetPosition });

                  if (!editor) {
                    console.error("❌ Editor is undefined");
                    return { ok: false, message: "Editor not available" };
                  }

                  const { state, view } = editor;

                  if (!state || !view) {
                    console.error("❌ Editor state or view is missing");
                    return { ok: false, message: "Invalid editor instance" };
                  }

                  const docSize = state.doc.content.size;
                  console.log("📄 Document size:", docSize);

                  if (
                    typeof from !== "number" ||
                    typeof to !== "number" ||
                    typeof targetPosition !== "number" ||
                    from < 0 ||
                    to > docSize ||
                    targetPosition > docSize ||
                    from >= to
                  ) {
                    console.warn("⚠️ Invalid positions", {
                      from,
                      to,
                      targetPosition,
                    });
                    return {
                      ok: false,
                      message: "Invalid range or target position",
                    };
                  }

                  try {
                    const slice = state.doc.slice(from, to);
                    console.log(
                      "📦 Slice content JSON:",
                      slice.content.toJSON()
                    );

                    const tr = state.tr
                      .delete(from, to)
                      .insert(targetPosition, slice.content);

                    if (!tr.docChanged) {
                      console.warn(
                        "⚠️ Transaction did not change the document"
                      );
                      return {
                        ok: false,
                        message: "No changes made (empty or invalid slice?)",
                      };
                    }

                    console.log("✅ Dispatching transaction");
                    view.dispatch(tr);

                    return {
                      ok: true,
                      message: "Block moved successfully",
                      line: getLineAtPosition(editor, targetPosition),
                    };
                  } catch (error) {
                    console.error("💥 Error during move-block:", error);
                    return {
                      ok: false,
                      message: "An error occurred. See console.",
                    };
                  }
                }}
                cancel={() => ({ ok: false, message: "Move cancelled" })}
              />
            </AiTool>
          ),
        }),

        "insert-after-heading": defineAiTool()({
          description: `Inserts HTML content after the first heading that matches given text.`,
          parameters: {
            type: "object",
            properties: {
              headingText: { type: "string" },
              html: { type: "string" },
            },
            required: ["headingText", "html"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Insert after heading: ${args?.headingText}`}>
              <div
                className="lb-prose"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(args?.html || ""),
                }}
              />
              <AiTool.Confirmation<typeof $types>
                confirm={({ headingText, html }) => {
                  if (!editor) return null;
                  const pos = findPositionAfterHeading(editor, headingText);
                  if (pos === null)
                    return { ok: false, message: "Heading not found" };
                  editor.commands.insertContentAt(pos, html);
                  return {
                    ok: true,
                    message: "Inserted after heading",
                    line: getLineAtPosition(editor, pos),
                  };
                }}
                cancel={() => ({ ok: false, message: "Insertion cancelled" })}
              />
            </AiTool>
          ),
        }),

        "normalize-formatting": defineAiTool()({
          description: `Normalizes content formatting to consistent HTML tags (e.g., <b> → <strong>).`,
          parameters: {
            type: "object",
            properties: {},
          },
          render: ({ $types }) => (
            <AiTool title={`Normalize formatting`}>
              <p>Apply consistent semantic formatting to the document?</p>
              <AiTool.Confirmation<typeof $types>
                confirm={() => {
                  if (!editor) return null;
                  normalizeFormatting(editor); // Custom function needed
                  return {
                    ok: true,
                    message: "Formatting normalized",
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Cancelled normalization",
                })}
              />
            </AiTool>
          ),
        }),

        "convert-to-list": defineAiTool()({
          description: `Converts selected text into a list.`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              listType: { type: "string", enum: ["ul", "ol"] },
            },
            required: ["from", "to", "listType"],
          },
          render: ({ $types, args }) => (
            <AiTool
              title={`Convert to ${args?.listType === "ol" ? "numbered" : "bullet"} list`}
            >
              <p>Convert text into a list?</p>
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to, listType }) => {
                  if (!editor) return null;
                  const content = editor.state.doc.textBetween(from, to, "\n");
                  const lines = content.trim().split(/\n+/);
                  const items = lines
                    .map((line) => `<li>${line.trim()}</li>`)
                    .join("\n");
                  const html = `<${listType}>${items}</${listType}>`;
                  editor.commands.insertContentAt({ from, to }, html);
                  return {
                    ok: true,
                    message: "Converted to list",
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Cancelled list conversion",
                })}
              />
            </AiTool>
          ),
        }),

        "reword-selection": defineAiTool()({
          description: `Rewrites content to be clearer, shorter, or more formal/informal.`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              style: {
                type: "string",
                enum: ["clear", "short", "formal", "casual"],
              },
            },
            required: ["from", "to", "style"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Reword (${args?.style})`}>
              <p>
                Rewrite selection to be more <strong>{args?.style}</strong>?
              </p>
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to, style }) => {
                  if (!editor) return null;
                  const content = editor.state.doc.textBetween(
                    from,
                    to,
                    "",
                    " "
                  );
                  const reworded = rewordContent(content, style); // Your AI logic
                  editor.commands.insertContentAt({ from, to }, reworded);
                  return {
                    ok: true,
                    message: "Text reworded",
                    line: getLineAtPosition(editor, from),
                  };
                }}
                cancel={() => ({ ok: false, message: "Cancelled rewording" })}
              />
            </AiTool>
          ),
        }),

        "highlight-changes": defineAiTool()({
          description: `Visually marks content as changed using <mark> tags.`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              html: { type: "string" },
            },
            required: ["from", "to", "html"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Highlight change`}>
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to, html }) => {
                  if (!editor) return null;
                  const marked = `<mark>${html}</mark>`;
                  editor.commands.insertContentAt({ from, to }, marked);
                  return {
                    ok: true,
                    message: "Change highlighted",
                    line: getLineAtPosition(editor, from),
                  };
                }}
                cancel={() => ({ ok: false, message: "Cancelled highlight" })}
              />
            </AiTool>
          ),
        }),
        "delete-content-range": defineAiTool()({
          description: `Deletes content between two positions in the editor.`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              line: { type: "number" },
            },
            required: ["from", "to", "line"],
          },
          render: ({ $types, args, result }) => (
            <AiTool
              title={`Delete content on line ${result?.line || args?.line || 0}`}
            >
              <p>
                Delete content from position {args?.from} to {args?.to}?
              </p>
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to }) => {
                  if (!editor) return null;
                  editor.commands.insertContentAt({ from, to }, "");
                  return {
                    ok: true,
                    message: "Content deleted",
                    line: getLineAtPosition(editor, from),
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Cancelled deletion",
                })}
              />
            </AiTool>
          ),
        }),
        "wrap-range-in-tag": defineAiTool()({
          description: `Wraps content between two positions in a specified HTML tag.`,
          parameters: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              tag: {
                type: "string",
                enum: ["strong", "em", "code", "blockquote", "span"],
              },
              line: { type: "number" },
            },
            required: ["from", "to", "tag", "line"],
          },
          render: ({ $types, args, result }) => (
            <AiTool
              title={`Wrap with <${args?.tag}> on line ${result?.line || args?.line || 0}`}
            >
              <p>
                Wrap range with <code>{`<${args?.tag}>`}</code> tag?
              </p>
              <AiTool.Confirmation<typeof $types>
                confirm={({ from, to, tag }) => {
                  if (!editor) return null;
                  const content = editor.state.doc.textBetween(
                    from,
                    to,
                    "",
                    ""
                  );
                  const html = `<${tag}>${content}</${tag}>`;
                  editor.commands.insertContentAt({ from, to }, html);
                  return {
                    ok: true,
                    message: `Wrapped with <${tag}>`,
                    line: getLineAtPosition(editor, from),
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Wrapping cancelled",
                })}
              />
            </AiTool>
          ),
        }),
        "append-content": defineAiTool()({
          description: `Appends HTML content to the end of the document.`,
          parameters: {
            type: "object",
            properties: {
              html: { type: "string" },
            },
            required: ["html"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Append content`}>
              <div
                className="lb-prose"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(args?.html || ""),
                }}
              />
              <AiTool.Confirmation<typeof $types>
                confirm={({ html }) => {
                  if (!editor) return null;
                  const end = editor.state.doc.content.size;
                  editor.commands.insertContentAt(end, html);
                  return {
                    ok: true,
                    message: "Content appended",
                    line: getLineAtPosition(editor, end),
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Append cancelled",
                })}
              />
            </AiTool>
          ),
        }),
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

const positionGuidance = `
📌 How to use \`from\` and \`to\` positions in Tiptap (ProseMirror):

- \`from\` and \`to\` define the start and end of a range of content.
- They are numeric positions inside the document — like character offsets.
- This is not related to HTML
- \`from\` must be **less than** \`to\` (i.e., \`to - from > 0\`)
- Both must be within bounds of the document (0 <= from < to <= docSize)
- The range should cover meaningful content (e.g., a sentence, paragraph, node)
- Empty selections (where \`from === to\`) will not trigger any changes.

Examples:

✅ Move a full paragraph:
- from: 20
- to: 58

✅ Replace a heading:
- from: 0
- to: 15

✅ Wrap a sentence:
- from: 100
- to: 112

❌ Invalid (empty range):
- from: 30
- to: 30

Tips:
- You can use \`editor.state.doc.textBetween(from, to)\` to inspect what’s in the range.
- If it’s empty or just whitespace, don’t proceed.
- Prefer selecting complete nodes (like paragraphs or headings), not partial HTML tags.

`;
