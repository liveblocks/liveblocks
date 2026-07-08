import diff from "fast-diff";
import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { getSlideIds, getSlideText, SLIDES_ARRAY_KEY } from "@/app/slide-doc";

type SlideProposal = { slideId: string; html: string };

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
  proposals?: SlideProposal[];
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
  const action =
    body.action === "apply" || body.action === "reject"
      ? body.action
      : undefined;

  if (!roomId.startsWith(ROOM_ID_PREFIX) || !feedId || !messageId || !action) {
    return new NextResponse("Invalid room, feed, message, or action", {
      status: 400,
    });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  const messages = await liveblocks.getFeedMessages<FeedMessageData>({
    roomId,
    feedId,
  });
  const message = messages.data.find((item) => item.id === messageId);
  if (!message) {
    return new NextResponse("Feed message not found", { status: 404 });
  }

  let newSlideIds: string[] = [];
  if (action === "apply") {
    const proposals = message.data.proposals;
    if (!proposals || proposals.length === 0) {
      return new NextResponse("Slide proposals not found", { status: 404 });
    }

    newSlideIds = await applyProposalsToYjsDocument(liveblocks, roomId, proposals);
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

  return NextResponse.json({ ok: true, newSlideIds });
}

async function applyProposalsToYjsDocument(
  liveblocks: Liveblocks,
  roomId: string,
  proposals: SlideProposal[]
): Promise<string[]> {
  const binaryUpdate = await liveblocks.getYjsDocumentAsBinaryUpdate(roomId);
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(binaryUpdate));

  const stateVectorBefore = Y.encodeStateVector(ydoc);
  const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);
  const slideIds = getSlideIds(ydoc);
  const newSlideIds: string[] = [];

  ydoc.transact(() => {
    if (slideIds.length === 0) {
      for (const proposal of proposals) {
        newSlideIds.push(appendSlide(ydoc, slides, proposal.html));
      }
      return;
    }

    for (const proposal of proposals) {
      if (proposal.slideId === "new") {
        newSlideIds.push(appendSlide(ydoc, slides, proposal.html));
        continue;
      }

      if (!slideIds.includes(proposal.slideId)) {
        continue;
      }

      applyHtmlDiff(getSlideText(ydoc, proposal.slideId), proposal.html);
    }
  });

  const incrementalUpdate = Y.encodeStateAsUpdate(ydoc, stateVectorBefore);
  await liveblocks.sendYjsBinaryUpdate(roomId, incrementalUpdate);

  return newSlideIds;
}

function appendSlide(
  ydoc: Y.Doc,
  slides: Y.Array<string>,
  html: string
): string {
  const id = nanoid(8);
  slides.push([id]);
  getSlideText(ydoc, id).insert(0, html);
  return id;
}

function applyHtmlDiff(ytext: Y.Text, nextHtml: string) {
  const currentHtml = ytext.toString();
  if (currentHtml === nextHtml) {
    return;
  }

  let index = 0;
  for (const [operation, text] of diff(currentHtml, nextHtml)) {
    if (operation === 0) {
      index += text.length;
    } else if (operation === -1) {
      ytext.delete(index, text.length);
    } else if (operation === 1) {
      ytext.insert(index, text);
      index += text.length;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
