import diff from "fast-diff";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";

type FeedMessageData = {
  role: "user" | "assistant";
  content: string;
  userId?: string;
  name?: string;
  avatar?: string;
  model?: string;
  reasoning?: string;
  sources?: { title: string; url: string }[];
  suggestions?: string[];
  proposedHtml?: string;
  proposalStatus?: "pending" | "applied" | "rejected";
  chainOfThought?: {
    label: string;
    description?: string;
    status?: "complete" | "active" | "pending";
    search?: string[];
  }[];
  tool?: {
    name: string;
    input: Record<string, string | number>;
    output?: string;
  };
  usedTokens?: number;
  maxTokens?: number;
  streaming?: boolean;
};

const ROOM_ID_PREFIX = "liveblocks:examples:nextjs-ai-slideshow";

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const feedId = typeof body.feedId === "string" ? body.feedId : "";
  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const action = body.action === "apply" || body.action === "reject" ? body.action : undefined;
  const html = typeof body.html === "string" ? body.html : undefined;

  if (!roomId.startsWith(ROOM_ID_PREFIX) || !feedId || !messageId || !action) {
    return new NextResponse("Invalid room, feed, message, or action", { status: 400 });
  }

  if (action === "apply" && !html) {
    return new NextResponse("Missing slide HTML", { status: 400 });
  }

  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

  const messages = await liveblocks.getFeedMessages<FeedMessageData>({ roomId, feedId });
  const message = messages.data.find((item) => item.id === messageId);
  if (!message) {
    return new NextResponse("Feed message not found", { status: 404 });
  }

  if (action === "apply" && html) {
    await applyHtmlToYjsDocument(liveblocks, roomId, html);
  }

  await liveblocks.updateFeedMessage<FeedMessageData>({
    roomId,
    feedId,
    messageId,
    data: {
      ...message.data,
      proposalStatus: action === "apply" ? "applied" : "rejected",
    },
  });

  return NextResponse.json({ ok: true });
}

async function applyHtmlToYjsDocument(liveblocks: Liveblocks, roomId: string, nextHtml: string) {
  const binaryUpdate = await liveblocks.getYjsDocumentAsBinaryUpdate(roomId);
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(binaryUpdate));

  const ytext = ydoc.getText("codemirror");
  const currentHtml = ytext.toString();
  if (currentHtml === nextHtml) {
    return;
  }

  const stateVectorBefore = Y.encodeStateVector(ydoc);
  const changes = diff(currentHtml, nextHtml);

  ydoc.transact(() => {
    let index = 0;

    for (const [operation, text] of changes) {
      if (operation === 0) {
        index += text.length;
      } else if (operation === -1) {
        ytext.delete(index, text.length);
      } else if (operation === 1) {
        ytext.insert(index, text);
        index += text.length;
      }
    }
  });

  const incrementalUpdate = Y.encodeStateAsUpdate(ydoc, stateVectorBefore);
  await liveblocks.sendYjsBinaryUpdate(roomId, incrementalUpdate);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
