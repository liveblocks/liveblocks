"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useRoom } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import {
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  MessageSquarePlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { Chat } from "./chat";
import { CollaborativeEditor } from "./collaborative-editor";
import { resolveProposal, type SlideProposal } from "./proposal-actions";
import { getSlideIds, getSlideText } from "./slide-doc";
import { SLIDE_HEIGHT, SLIDE_WIDTH, STARTER_SLIDE_HTML } from "./slide-html";
import { SlidePreview } from "./slide-preview";
import { SlideSidebar } from "./slide-sidebar";
import { useSlides } from "./slides";

type Panel = "slide" | "code";

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function createOffscreenIframe(html: string) {
  return new Promise<HTMLIFrameElement>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.addEventListener("load", () => resolve(iframe), { once: true });
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.width = String(SLIDE_WIDTH);
    iframe.height = String(SLIDE_HEIGHT);
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${SLIDE_WIDTH}px`;
    iframe.style.height = `${SLIDE_HEIGHT}px`;
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
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
  const room = useRoom();
  const { slideIds, addSlide, deleteSlide, moveSlide } = useSlides();
  const [panel, setPanel] = useState<Panel>("slide");
  const [placingComment, setPlacingComment] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const previousSelectedIndex = useRef(0);

  const selectedIndex = selectedSlideId
    ? slideIds.indexOf(selectedSlideId)
    : -1;
  const fallbackIndex =
    slideIds.length === 0
      ? -1
      : Math.min(previousSelectedIndex.current, slideIds.length - 1);
  const slideId =
    selectedIndex === -1
      ? (slideIds[fallbackIndex] ?? null)
      : selectedSlideId;

  useEffect(() => {
    if (slideIds.length === 0) {
      return;
    }

    if (selectedSlideId) {
      const index = slideIds.indexOf(selectedSlideId);
      if (index !== -1) {
        previousSelectedIndex.current = index;
        return;
      }
    }

    const nextIndex = Math.min(previousSelectedIndex.current, slideIds.length - 1);
    setSelectedSlideId(slideIds[nextIndex]);
  }, [slideIds, selectedSlideId]);

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

  const selectSlide = useCallback(
    (id: string) => {
      const index = slideIds.indexOf(id);
      if (index !== -1) {
        previousSelectedIndex.current = index;
      }
      setSelectedSlideId(id);
    },
    [slideIds]
  );

  const addAndSelectSlide = useCallback(() => {
    const id = addSlide();
    previousSelectedIndex.current = slideIds.length;
    setSelectedSlideId(id);
  }, [addSlide, slideIds.length]);

  const deleteAndSelectNearestSlide = useCallback(
    (id: string) => {
      const index = slideIds.indexOf(id);
      if (index !== -1 && id === slideId) {
        previousSelectedIndex.current = Math.min(index, slideIds.length - 2);
      }
      deleteSlide(id);
    },
    [deleteSlide, slideId, slideIds]
  );

  const exportPptx = useCallback(async () => {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      const [{ toPng }, { default: PptxGenJS }] = await Promise.all([
        import("html-to-image"),
        import("pptxgenjs"),
      ]);

      const provider = getYjsProviderForRoom(room);
      const ydoc = provider.getYDoc();
      const exportedSlideIds = getSlideIds(ydoc);
      if (exportedSlideIds.length === 0) {
        throw new Error("No slides are ready to export yet.");
      }

      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "LIVEBLOCKS_16_9", width: 10, height: 5.625 });
      pptx.layout = "LIVEBLOCKS_16_9";

      for (const id of exportedSlideIds) {
        const html = getSlideText(ydoc, id).toString() || STARTER_SLIDE_HTML;
        const iframe = await createOffscreenIframe(html);

        try {
          await waitForPaint();
          const document = iframe.contentDocument;
          const element = document?.body ?? document?.documentElement;
          if (!element) {
            throw new Error("Slide preview is not ready yet.");
          }

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

          const slide = pptx.addSlide();
          slide.addImage({ data: dataUrl, x: 0, y: 0, w: 10, h: 5.625 });
        } finally {
          iframe.remove();
        }
      }

      await pptx.writeFile({ fileName: "slides.pptx" });
    } finally {
      setExporting(false);
    }
  }, [exporting, room]);

  if (!slideId) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-neutral-50 text-muted-foreground">
        <Loader size={20} />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full gap-2.5 overflow-hidden bg-neutral-50 p-2.5">
      <SlideSidebar
        slideIds={slideIds}
        selectedSlideId={slideId}
        onSelectSlide={selectSlide}
        onAddSlide={addAndSelectSlide}
        onDeleteSlide={deleteAndSelectNearestSlide}
        onMoveSlide={moveSlide}
      />

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
              slideId={slideId}
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
              <CollaborativeEditor key={slideId} slideId={slideId} />
            )}
          </div>
        </div>
      </main>

      <aside className="flex w-[380px] shrink-0 overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <Chat
          roomId={roomId}
          slideId={slideId}
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
      <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-primary/30 bg-white py-1.5 pl-4 pr-1.5 shadow-md">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-neutral-700">
          <EyeIcon className="size-4 text-primary" />
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
            className="rounded-full"
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
