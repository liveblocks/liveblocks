import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("IT STARTED");
  try {
    await withProsemirrorDocument(
      {
        roomId: "liveblocks:examples:nextjs-tiptap-2",
        client: liveblocks,
        schema: getSchema([Youtube, StarterKit]),
      },
      async (api) => {
        await api.update((doc, tr) => {
          return tr.insertText("Hello world");
        });
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
