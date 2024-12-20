import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { CustomTaskItem } from "@/components/CustomTaskItem";
import TaskList from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import Youtube from "@tiptap/extension-youtube";
import { Schema } from "prosemirror-model";
import { Extensions } from "@tiptap/core";

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const roomId = "liveblocks:examples:nextjs-tiptap-advanced-test2";

export async function GET(request: NextRequest) {
  // Get as plain text
  // const plainText = await withProsemirrorDocument<string>(
  //   {
  //     client,
  //     roomId,
  //   },
  //   (api) => {
  //     return api.getText();
  //   }
  // );

  // Insert text (at random location?)
  // await withProsemirrorDocument<string>(
  //   {
  //     client,
  //     roomId,
  //   },
  //   async (api) => {
  //     await api.update((_, tr) => {
  //       return tr.insertText("hello text", 0, 0);
  //     });
  //
  //     return api.getText();
  //   }
  // );

  await withProsemirrorDocument<string>(
    {
      client,
      roomId,
    },
    async (api) => {
      await api.update((doc, tr) => {
        const schema = doc.type.schema;

        const newDocContent = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This is the new document content.",
                },
              ],
            },
          ],
        };

        // Create a new document node from JSON
        const newDoc = schema.nodeFromJSON(newDocContent);

        // Replace the entire content of the current document
        tr.replace(0, doc.content.size, newDoc.slice(0, newDoc.content.size));

        return tr;
      });

      return api.getText();
    }
  );

  console.log("Complete");

  return new Response(null, { status: 200 });
}

const extensions = [
  StarterKit.configure({
    blockquote: {
      HTMLAttributes: {
        class: "tiptap-blockquote",
      },
    },
    code: {
      HTMLAttributes: {
        class: "tiptap-code",
      },
    },
    codeBlock: {
      languageClassPrefix: "language-",
      HTMLAttributes: {
        class: "tiptap-code-block",
        spellcheck: false,
      },
    },
    heading: {
      levels: [1, 2, 3],
      HTMLAttributes: {
        class: "tiptap-heading",
      },
    },
    // The Collaboration extension comes with its own history handling
    history: false,
    horizontalRule: {
      HTMLAttributes: {
        class: "tiptap-hr",
      },
    },
    listItem: {
      HTMLAttributes: {
        class: "tiptap-list-item",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "tiptap-ordered-list",
      },
    },
    paragraph: {
      HTMLAttributes: {
        class: "tiptap-paragraph",
      },
    },
  }),
  Highlight.configure({
    HTMLAttributes: {
      class: "tiptap-highlight",
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class: "tiptap-image",
    },
  }),
  Link.configure({
    HTMLAttributes: {
      class: "tiptap-link",
    },
  }),
  Placeholder.configure({
    placeholder: "Start writing…",
    emptyEditorClass: "tiptap-empty",
  }),
  // CustomTaskItem,
  TaskList.configure({
    HTMLAttributes: {
      class: "tiptap-task-list",
    },
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Typography,
  Youtube.configure({
    modestBranding: true,
    HTMLAttributes: {
      class: "tiptap-youtube",
    },
  }),
];

function getSchemaFromExtensions(extensions: Extensions) {
  const nodes = {};
  const marks = {};

  extensions.forEach((extension) => {
    if (extension.type === "node") {
      nodes[extension.name] = {
        ...extension.schema,
        group: extension.schema?.group || "block",
        content: extension.schema?.content || "inline*",
      };
    }
    if (extension.type === "mark") {
      marks[extension.name] = extension.schema || {};
    }
  });

  if (!nodes["doc"]) {
    nodes["doc"] = {
      content: "block+",
    };
  }

  if (!nodes["text"]) {
    nodes["text"] = {
      group: "inline",
    };
  }

  return new Schema({ nodes, marks });
}

const schema = getSchemaFromExtensions(extensions);
