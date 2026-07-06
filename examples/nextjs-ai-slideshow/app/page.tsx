"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import {
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  MessageSquarePlusIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <Tabs
            value={panel}
            onValueChange={(value) => {
              if (value === "code") {
                setPlacingComment(false);
                setPanel("code");
              } else {
                setPanel("slide");
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="slide">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <AvatarStack size={28} />
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
            {previewedProposal ? (
              <ProposalCodePreview
                proposal={previewedProposal}
                resolvingProposal={resolvingProposal}
                onResolveProposal={resolvePreviewedProposal}
              />
            ) : (
              <CollaborativeEditor />
            )}
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

function ProposalCodePreview({
  proposal,
  resolvingProposal,
  onResolveProposal,
}: {
  proposal: SlideProposal;
  resolvingProposal: "apply" | "reject" | null;
  onResolveProposal: (action: "apply" | "reject") => void;
}) {
  return (
    <div className="relative h-full min-h-0 bg-white">
      <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-rose-200 bg-white py-1.5 pl-4 pr-1.5 shadow-md">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-neutral-700">
          <EyeIcon className="size-4 text-rose-600" />
          Previewing proposed code
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResolveProposal("reject")}
            disabled={resolvingProposal !== null}
            className="rounded-full"
          >
            {resolvingProposal === "reject" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Reject
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => onResolveProposal("apply")}
            disabled={resolvingProposal !== null}
          >
            {resolvingProposal === "apply" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Accept
          </Button>
        </div>
      </div>

      <pre className="h-full overflow-auto bg-white px-4 pb-4 pt-16 font-mono text-[13px] leading-5 text-neutral-900">
        <code>{proposal.html}</code>
      </pre>
    </div>
  );
}
