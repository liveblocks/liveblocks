import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";
import { BlockNoteSchema } from "@blocknote/core";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blockNoteSchema = new BlockNoteSchema();

  console.log("IT STARTED");
  try {
    await withProsemirrorDocument(
      {
        roomId: "liveblocks:examples:nextjs-blocknote",
        client: liveblocks,
        schema: { nodes: blockNoteSchema.blockSchema },
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
