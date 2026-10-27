import { AiChat, AiTool } from "@liveblocks/react-ui";
import { defineAiTool } from "@liveblocks/client";
import { Editor } from "@tiptap/core";
import { useRoom } from "@liveblocks/react";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { diffWords } from "diff";

// Cancel should not add a message after. Or option to not do this.
// AI will keep repeating

export function AiChatPanel({ editor }: { editor: Editor | null }) {
  const room = useRoom();

  const [html, setHtml] = useState("");
  const [json, setJson] = useState({});

  useEffect(() => {
    if (!editor) return;

    const updateHandler = ({ editor }: { editor: Editor }) => {
      setHtml(editor.getHTML());
      setJson(editor.getJSON());
    };

    editor.on("update", updateHandler);
    updateHandler({ editor });

    return () => {
      editor.off("update", updateHandler);
    };
  }, [editor]);

  console.log({ json, html });

  return (
    <AiChat
      chatId={room.id + "-12"}
      // Open AI
      // copilotId="co_A8popM5c8htZ49tMwMgtE"

      //Claude
      copilotId="co_0RYsR9kFoQd91sRI8Apwd"
      layout="compact"
      knowledge={[
        {
          description: "The Tiptap editor's JSON state",
          value: json || "Loading...",
        },
        {
          description: "The Tiptap editor's HTML state",
          value: html || "Loading...",
        },
        // {
        //   description: "The Tiptap editor's text state",
        //   value: editor?.getText() || "Loading...",
        // },
        // {
        //   description: "How to get `to` and `from` values",
        //   value: positionGuidance,
        // },
      ]}
      tools={{
        "insert-at-top": defineAiTool()({
          description: `Inserts HTML content at the very beginning of the document.`,
          parameters: {
            type: "object",
            properties: {
              html: { type: "string" },
            },
            required: ["html"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Insert at top`}>
              <div>
                <div
                  className="lb-prose"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(args?.html || ""),
                  }}
                />
              </div>
              <AiTool.Confirmation<typeof $types>
                confirm={({ html }) => {
                  if (!editor) return null;
                  editor.commands.focus("start");
                  editor.commands.insertContent(html);
                  return {
                    ok: true,
                    message: "Content inserted at top",
                    line: 1,
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Cancelled insert at top",
                })}
              />
            </AiTool>
          ),
        }),
        "insert-at-bottom": defineAiTool()({
          description: `Inserts HTML content at the very end of the document.`,
          parameters: {
            type: "object",
            properties: {
              html: { type: "string" },
            },
            required: ["html"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Insert at bottom`}>
              <div
                className="lb-prose"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(args?.html || ""),
                }}
              />
              <AiTool.Confirmation<typeof $types>
                confirm={({ html }) => {
                  if (!editor) return null;
                  editor.commands.focus("end");
                  editor.commands.insertContent(html);
                  const pos = editor.state.doc.content.size;
                  return {
                    ok: true,
                    message: "Content inserted at bottom",
                    line: getLineAtPosition(editor, pos),
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Cancelled insert at bottom",
                })}
              />
            </AiTool>
          ),
        }),
        "replace-entire-document": defineAiTool()({
          description: `Replaces the entire document with the provided HTML content.`,
          parameters: {
            type: "object",
            properties: {
              html: { type: "string" },
            },
            required: ["html"],
          },
          render: ({ $types, args, status }) => {
            let diff = "";

            if (status !== "executed" && editor && args?.html) {
              const diffHtml = getDiffSnippet(editor.getHTML(), args.html);
              diff = DOMPurify.sanitize(diffHtml, {
                ALLOWED_TAGS: [
                  "p",
                  "br",
                  "ins",
                  "del",
                  "strong",
                  "em",
                  "u",
                  "code",
                  "pre",
                  "blockquote",
                  "ul",
                  "ol",
                  "li",
                  "span",
                ],
                ALLOWED_ATTR: ["style"],
              });
              console.log(diff);
            }

            return (
              <AiTool title={`Replace entire document`}>
                {status !== "executed" ? (
                  <div
                    className="lb-prose"
                    dangerouslySetInnerHTML={{
                      // __html: DOMPurify.sanitize(args?.html || ""),
                      __html: diff,
                    }}
                  />
                ) : null}
                <AiTool.Confirmation<typeof $types>
                  confirm={({ html }) => {
                    if (!editor) return null;
                    editor.commands.setContent(html);
                    return {
                      ok: true,
                      message: "Document replaced",
                      line: 1,
                    };
                  }}
                  cancel={() => ({
                    ok: false,
                    message: "Cancelled document replacement",
                  })}
                />
              </AiTool>
            );
          },
        }),
        "insert-at-position": defineAiTool()({
          description: `Inserts HTML content at a specific JSON position in the document.`,
          parameters: {
            type: "object",
            properties: {
              position: { type: "number" },
              html: { type: "string" },
            },
            required: ["position", "html"],
          },
          render: ({ $types, args }) => (
            <AiTool title={`Insert at position ${args?.position}`}>
              <div
                className="lb-prose"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(args?.html || ""),
                }}
              />
              <AiTool.Confirmation<typeof $types>
                confirm={({ position, html }) => {
                  if (!editor) {
                    return {
                      ok: false,
                      message: "Editor not available",
                    };
                  }

                  const docSize = editor.state.doc.content.size;

                  if (position < 0 || position > docSize) {
                    return {
                      ok: false,
                      message: `Invalid position: ${position} (doc size = ${docSize})`,
                    };
                  }

                  editor.commands.insertContentAt(position, html);

                  return {
                    ok: true,
                    message: "Content inserted",
                    line: getLineAtPosition(editor, position),
                  };
                }}
                cancel={() => ({
                  ok: false,
                  message: "Insertion cancelled",
                })}
              />
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

import { diffWordsWithSpace } from "diff";

export function getDiffSnippet(
  oldHtml: string,
  newHtml: string,
  charContext = 70
): string {
  const diffs = diffWordsWithSpace(oldHtml, newHtml);

  let fullHtml = "";
  let changeRanges: { start: number; end: number }[] = [];

  diffs.forEach((part) => {
    const before = fullHtml.length;
    const html = part.added
      ? `<ins style="background:#d4fcbc;">${part.value}</ins>`
      : part.removed
        ? `<del style="background:#fbb6c2;">${part.value}</del>`
        : part.value;

    fullHtml += html;

    if (part.added || part.removed) {
      changeRanges.push({ start: before, end: fullHtml.length });
    }
  });

  if (changeRanges.length === 0) return "";

  // Merge nearby changes into ranges with context
  const merged: { start: number; end: number }[] = [];
  for (const range of changeRanges) {
    const start = Math.max(0, range.start - charContext);
    const end = Math.min(fullHtml.length, range.end + charContext);

    if (merged.length && start <= merged[merged.length - 1].end + charContext) {
      // Merge with previous
      merged[merged.length - 1].end = Math.max(
        end,
        merged[merged.length - 1].end
      );
    } else {
      merged.push({ start, end });
    }
  }

  // Assemble result
  const snippets: string[] = [];
  for (let i = 0; i < merged.length; i++) {
    const { start, end } = merged[i];
    const snippet = fullHtml.slice(start, end).trim();
    snippets.push(snippet);

    // Add vertical gap if there's a gap before the next
    const next = merged[i + 1];
    if (next && next.start - end > charContext * 2) {
      snippets.push("...<br><br>...");
    }
  }

  // Add ellipses if needed at start/end
  if (merged[0].start > 0) {
    snippets.unshift("...");
  }
  if (merged[merged.length - 1].end < fullHtml.length) {
    snippets.push("...");
  }

  return snippets.join("");
}

function getDiffHtml(oldHtml: string, newHtml: string): string {
  const oldText = DOMPurify.sanitize(oldHtml, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "ins",
      "del",
      "strong",
      "em",
      "u",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "span",
    ],
    ALLOWED_ATTR: ["style"],
  });
  const newText = DOMPurify.sanitize(newHtml, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "ins",
      "del",
      "strong",
      "em",
      "u",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "span",
    ],
    ALLOWED_ATTR: ["style"],
  });

  const diffs = diffWords(oldText, newText);

  return diffs
    .map((part) => {
      if (part.added)
        return `<ins style="background: #d4fcbc;">${part.value}</ins>`;
      if (part.removed)
        return `<del style="background: #fbb6c2;">${part.value}</del>`;
      return `<span>${part.value}</span>`;
    })
    .join("");
}

const positionGuidance = `
How to find \`from\` and \`to\` for a specific text node in Tiptap (ProseMirror) JSON

Given a Tiptap (ProseMirror-based) JSON document, calculate the \`from\` and \`to\` positions of a specific text node (e.g., \`"apples, bananas, cherries"\`).

## How Position Calculation Works

In Tiptap/ProseMirror:

- Positions are 1-based (start at 1).
- Each text node contributes the number of characters in its \`text\`.
- Each block node (like \`paragraph\`, \`bulletList\`, \`listItem\`, etc.) adds +1 for the start and +1 for the end — a total of +2.
- Traverse the document in depth-first order, summing character lengths and node boundaries as you go.

## Example Document

\`\`\`json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Lemons are yellow." }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Oranges are orange." }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "apples, bananas, cherries" }
      ]
    }
  ]
}
\`\`\`

## Target Text

\`\`\`text
"apples, bananas, cherries"
\`\`\`

## Expected Output

\`\`\`json
{
  "from": 61,
  "to": 86
}
\`\`\`
`;

/* PREVIOUS TOOLS


tools={{
        "move-block": defineAiTool()({
          description: `Moves a block of content from one range to a new position.`,
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
              <AiTool.Inspector />
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

      */
