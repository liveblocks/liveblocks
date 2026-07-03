"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { DownloadIcon, Loader2Icon, MessageSquarePlusIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { Chat } from "./chat";
import { CollaborativeEditor } from "./collaborative-editor";
import { resolveProposal, type SlideProposal } from "./proposal-actions";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-html";
import { SlidePreview } from "./slide-preview";

type Panel = "slide" | "code";

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider id={roomId} initialPresence={{ promptingFeedId: null }}>
      <ClientSideSuspense
        fallback={
          <div className="flex h-dvh items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        }
      >
        <SlideshowApp roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function SlideshowApp({ roomId }: { roomId: string }) {
  const [panel, setPanel] = useState<Panel>("slide");
  const [placingComment, setPlacingComment] = useState(false);
  const [exporting, setExporting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The proposal currently shown in the Slide tab instead of the shared
  // document. Local to this user; accept/reject resolves it for everyone.
  const [previewedProposal, setPreviewedProposal] =
    useState<SlideProposal | null>(null);
  const [resolvingProposal, setResolvingProposal] = useState<
    "apply" | "reject" | null
  >(null);

  const previewProposal = useCallback((proposal: SlideProposal | null) => {
    setPreviewedProposal(proposal);
    if (proposal) {
      setPlacingComment(false);
      setPanel("slide");
    }
  }, []);

  const resolvePreviewedProposal = useCallback(
    async (action: "apply" | "reject") => {
      if (!previewedProposal || resolvingProposal) {
        return;
      }
      setResolvingProposal(action);
      try {
        await resolveProposal(roomId, previewedProposal, action);
        setPreviewedProposal(null);
      } finally {
        setResolvingProposal(null);
      }
    },
    [previewedProposal, resolvingProposal, roomId]
  );

  const exportPptx = useCallback(async () => {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      if (panel !== "slide") {
        setPanel("slide");
        await waitForPaint();
      }

      const document = iframeRef.current?.contentDocument;
      const element = document?.body ?? document?.documentElement;
      if (!element) {
        throw new Error("Slide preview is not ready yet.");
      }

      const [{ toPng }, { default: PptxGenJS }] = await Promise.all([
        import("html-to-image"),
        import("pptxgenjs"),
      ]);

      const dataUrl = await toPng(element, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        pixelRatio: 10,
        cacheBust: true,
        style: {
          width: `${SLIDE_WIDTH}px`,
          height: `${SLIDE_HEIGHT}px`,
          margin: "0",
        },
      });

      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "LIVEBLOCKS_16_9", width: 10, height: 5.625 });
      pptx.layout = "LIVEBLOCKS_16_9";
      const slide = pptx.addSlide();
      slide.addImage({ data: dataUrl, x: 0, y: 0, w: 10, h: 5.625 });
      await pptx.writeFile({ fileName: "slide.pptx" });
    } finally {
      setExporting(false);
    }
  }, [exporting, panel]);

  return (
    <div className="flex h-dvh w-full gap-2.5 overflow-hidden bg-neutral-50 p-2.5">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <header className="flex items-center justify-between border-b border-neutral-950/5 px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="rounded px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 data-[selected]:bg-neutral-100 data-[selected]:text-neutral-900"
              data-selected={panel === "slide" || undefined}
              onClick={() => setPanel("slide")}
            >
              Slide
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 data-[selected]:bg-neutral-100 data-[selected]:text-neutral-900"
              data-selected={panel === "code" || undefined}
              onClick={() => {
                setPlacingComment(false);
                setPanel("code");
              }}
            >
              Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            {panel === "slide" ? (
              <Button
                variant={placingComment ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPlacingComment((value) => !value)}
                // Pins belong to the shared slide, not to an unapplied proposal.
                disabled={previewedProposal !== null}
              >
                <MessageSquarePlusIcon className="size-4" />
                Comment
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={exportPptx}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              Download .pptx
            </Button>
            <AvatarStack size={28} />
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            className="absolute inset-0"
            style={{ display: panel === "slide" ? "block" : "none" }}
          >
            <SlidePreview
              iframeRef={iframeRef}
              placingComment={placingComment}
              onPlacingDone={() => setPlacingComment(false)}
              proposal={previewedProposal}
              resolvingProposal={resolvingProposal}
              onResolveProposal={resolvePreviewedProposal}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{ display: panel === "code" ? "block" : "none" }}
          >
            <CollaborativeEditor />
          </div>
        </div>
      </main>

      <aside className="flex w-[380px] shrink-0 overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <Chat
          roomId={roomId}
          previewedProposal={previewedProposal}
          onPreviewProposal={previewProposal}
        />
      </aside>
    </div>
  );
}
