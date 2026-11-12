"use client";

import { AvatarStack } from "@liveblocks/react-ui";
import { MessageSquarePlusIcon, Redo2Icon, Undo2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Chat,
  ProposalCodePreview,
  resolveProposal,
  type SlideProposal,
} from "@/features/ai-chat";
import {
  CollaborativeEditor,
  type EditorHistory,
} from "@/features/code-editor";
import { SlideSidebar, useSlides } from "@/features/deck";
import { ExportPptxButton } from "@/features/pptx-export";
import { SlidePreview } from "@/features/slide-preview";
import { matchUndoRedoShortcut, useSlideUndo } from "@/features/visual-editor";

type Panel = "slide" | "code";

type DisplaySlide = {
  id: string;
  proposalHtml?: string;
  isNewProposal?: boolean;
  hasProposal?: boolean;
};

export function SlideshowApp({ roomId }: { roomId: string }) {
  const { slideIds, addSlide, deleteSlide, moveSlide } = useSlides();
  const { undo, redo, canUndo, canRedo } = useSlideUndo();
  const [panel, setPanel] = useState<Panel>("slide");
  const [codeHistory, setCodeHistory] = useState<EditorHistory | null>(null);
  const [placingComment, setPlacingComment] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const previousSelectedIndex = useRef(0);
  const [previewedProposal, setPreviewedProposal] =
    useState<SlideProposal | null>(null);
  const [resolvingProposal, setResolvingProposal] = useState<
    "apply" | "reject" | null
  >(null);

  const undoRef = useRef({ undo, redo, active: false });
  // eslint-disable-next-line react-hooks/refs -- latest-value ref: the window keydown listener below must never see a stale undo/redo
  undoRef.current = {
    undo,
    redo,
    active: panel === "slide" && previewedProposal === null,
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!undoRef.current.active) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, [contenteditable]"))
      ) {
        return;
      }
      const action = matchUndoRedoShortcut(event);
      if (!action) {
        return;
      }
      event.preventDefault();
      if (action === "undo") {
        undoRef.current.undo();
      } else {
        undoRef.current.redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const displaySlides = useMemo<DisplaySlide[]>(() => {
    const proposalHtmlBySlideId = new Map<string, string>();
    const newProposalHtml: string[] = [];

    for (const proposal of previewedProposal?.proposals ?? []) {
      if (proposal.slideId === "new") {
        newProposalHtml.push(proposal.html);
      } else {
        proposalHtmlBySlideId.set(proposal.slideId, proposal.html);
      }
    }

    return [
      ...slideIds.map((id) => ({
        id,
        proposalHtml: proposalHtmlBySlideId.get(id),
        hasProposal: proposalHtmlBySlideId.has(id),
      })),
      ...newProposalHtml.map((proposalHtml, index) => ({
        id: `proposal-new-${index}`,
        proposalHtml,
        isNewProposal: true,
        hasProposal: true,
      })),
    ];
  }, [previewedProposal, slideIds]);
  const displaySlideIds = useMemo(
    () => displaySlides.map((slide) => slide.id),
    [displaySlides]
  );

  const selectedIndex = selectedSlideId
    ? displaySlideIds.indexOf(selectedSlideId)
    : -1;
  const fallbackIndex =
    slideIds.length === 0
      ? -1
      : // eslint-disable-next-line react-hooks/refs -- the last selected index is remembered across renders without re-rendering, so a deleted slide falls back to its neighbour
        Math.min(previousSelectedIndex.current, slideIds.length - 1);
  const slideId =
    selectedIndex === -1 ? (slideIds[fallbackIndex] ?? null) : selectedSlideId;

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
      if (displaySlideIds.includes(selectedSlideId)) {
        return;
      }
    }

    const nextIndex = Math.min(
      previousSelectedIndex.current,
      slideIds.length - 1
    );
    setSelectedSlideId(slideIds[nextIndex]);
  }, [displaySlideIds, slideIds, selectedSlideId]);

  const previewProposal = useCallback((proposal: SlideProposal | null) => {
    setPreviewedProposal(proposal);
    if (proposal) {
      setPlacingComment(false);
      setPanel("slide");
    }
  }, []);

  const [pendingSlideId, setPendingSlideId] = useState<string | null>(null);
  const handleProposalApplied = useCallback((newSlideIds: string[]) => {
    const lastNewSlideId = newSlideIds.at(-1);
    if (lastNewSlideId) {
      setPendingSlideId(lastNewSlideId);
    }
  }, []);

  const resolvePreviewedProposal = useCallback(
    async (action: "apply" | "reject") => {
      if (!previewedProposal || resolvingProposal) {
        return;
      }
      setResolvingProposal(action);
      try {
        const { newSlideIds } = await resolveProposal(
          roomId,
          previewedProposal,
          action
        );
        setPreviewedProposal(null);
        if (action === "apply") {
          handleProposalApplied(newSlideIds);
        }
      } finally {
        setResolvingProposal(null);
      }
    },
    [handleProposalApplied, previewedProposal, resolvingProposal, roomId]
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

  useEffect(() => {
    if (pendingSlideId && slideIds.includes(pendingSlideId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- selection waits for the new slide to arrive from the shared Yjs document
      selectSlide(pendingSlideId);
      setPendingSlideId(null);
    }
  }, [pendingSlideId, selectSlide, slideIds]);

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

  const selectedDisplaySlide = displaySlides.find(
    (slide) => slide.id === slideId
  );
  const selectedProposalHtml = selectedDisplaySlide?.proposalHtml;
  const selectedSlideIsReal = slideId ? slideIds.includes(slideId) : false;

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
        displaySlides={displaySlides}
        selectedSlideId={slideId}
        onSelectSlide={selectSlide}
        onAddSlide={addAndSelectSlide}
        onDeleteSlide={deleteAndSelectNearestSlide}
        onMoveSlide={moveSlide}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-950/5 px-2.5 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={panel === "code" ? codeHistory?.undo : undo}
                disabled={
                  previewedProposal !== null ||
                  (panel === "code" ? !codeHistory?.canUndo : !canUndo)
                }
                aria-label="Undo"
              >
                <Undo2Icon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={panel === "code" ? codeHistory?.redo : redo}
                disabled={
                  previewedProposal !== null ||
                  (panel === "code" ? !codeHistory?.canRedo : !canRedo)
                }
                aria-label="Redo"
              >
                <Redo2Icon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <AvatarStack size={28} />
            {panel === "slide" ? (
              <Button
                variant={placingComment ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPlacingComment((value) => !value)}
                disabled={previewedProposal !== null}
              >
                <MessageSquarePlusIcon className="size-4" />
                Comment
              </Button>
            ) : null}
            <ExportPptxButton />
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
              proposalHtml={selectedProposalHtml}
              isNewProposal={!!selectedDisplaySlide?.isNewProposal}
              resolvingProposal={resolvingProposal}
              onResolveProposal={resolvePreviewedProposal}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{ display: panel === "code" ? "block" : "none" }}
          >
            {previewedProposal && selectedProposalHtml !== undefined ? (
              <ProposalCodePreview
                html={selectedProposalHtml}
                resolvingProposal={resolvingProposal}
                onResolveProposal={resolvePreviewedProposal}
              />
            ) : selectedSlideIsReal ? (
              <CollaborativeEditor
                key={slideId}
                slideId={slideId}
                onHistoryChange={setCodeHistory}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader size={20} />
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="flex w-[380px] shrink-0 overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <Chat
          roomId={roomId}
          slideId={slideId}
          slideIds={slideIds}
          previewedProposal={previewedProposal}
          onPreviewProposal={previewProposal}
          onProposalApplied={handleProposalApplied}
        />
      </aside>
    </div>
  );
}
