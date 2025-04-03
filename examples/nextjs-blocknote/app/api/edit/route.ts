import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";
import { BlockNoteEditor } from "@blocknote/core";

const editor = BlockNoteEditor.create({
  _headless: true,
});

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log(editor.pmSchema);
  console.log("IT STARTED");
  try {
    await withProsemirrorDocument(
      {
        roomId: "liveblocks:examples:nextjs-blocknote",
        client: liveblocks,
        schema: editor.pmSchema,
      },
      async (api) => {
        // First clear any existing content
        await api.clearContent();

        // Then set initial content with proper document structure
        // await api.setContent({
        //   type: "doc",
        //   content: [
        //     {
        //       type: "paragraph",
        //       content: [{ type: "text", text: "Hello world" }],
        //     },
        //   ],
        // });
      }
    );
    console.log("IT WORKED");
  } catch (error) {
    console.log("IT WENT WRONG");
    console.error(error);
    return new NextResponse("Error", { status: 500 });
  }

  return new NextResponse("Success", { status: 200 });
}
