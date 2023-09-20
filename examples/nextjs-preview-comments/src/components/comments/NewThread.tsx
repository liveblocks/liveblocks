import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@liveblocks/react-comments";
import * as Portal from "@radix-ui/react-portal";
import { useCreateThread } from "@/liveblocks.config";
import { ComposerSubmitComment } from "@liveblocks/react-comments/primitives";
import { CommentIcon } from "@/components/icons/CommentIcon";
import styles from "./NewThread.module.css";
import { Pointer, POINTER_OFFSET } from "./Pointer";
import { OverlayTop } from "@/components/comments/OverlayTop";
import { NewThreadCursor } from "@/components/comments/NewThreadCursor";
import { getCoordsFromPointerEvent } from "@/lib/coords";

type ComposerCoords = null | { x: number; y: number };

export function NewThread() {
  const [creatingCommentState, setCreatingCommentState] = useState<
    "placing" | "placed" | "complete"
  >("complete");
  const createThread = useCreateThread();

  const composerRef = useRef<HTMLDivElement>(null);
  const [composerCoords, setComposerCoords] = useState<ComposerCoords>(null);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const lastPointerEvent = useRef<PointerEvent>();
  const [allowUseComposer, setAllowUseComposer] = useState(false);
  const allowComposerRef = useRef(allowUseComposer);
  allowComposerRef.current = allowUseComposer;

  useEffect(() => {
    if (creatingCommentState === "complete") {
      return;
    }

    // Place a composer on the screen
    function newComment(e: MouseEvent) {
      if (dragging.current) {
        return;
      }
      console.log("new");

      e.preventDefault();

      // If already placed, click outside to close composer
      if (creatingCommentState === "placed") {
        setCreatingCommentState("complete");
        return;
      }

      // First click sets composer down
      setCreatingCommentState("placed");
      setComposerCoords({
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
      });
    }

    document.documentElement.addEventListener("click", newComment);

    return () => {
      document.documentElement.removeEventListener("click", newComment);
    };
  }, [creatingCommentState]);

  useEffect(() => {
    // If dragging composer, update position
    function handlePointerMove(e: PointerEvent) {
      if (!dragging.current) {
        return;
      }

      // Prevents issue with composedPath getting removed
      (e as any)._savedComposedPath = e.composedPath();
      lastPointerEvent.current = e;

      const { x, y } = dragOffset.current;
      setComposerCoords({
        x: e.pageX - x - POINTER_OFFSET.x,
        y: e.pageY - y - POINTER_OFFSET.y,
      });
    }

    // Stop dragging, timeout to avoid `newComment` running
    function handlePointerUp() {
      if (!dragging.current) {
        return;
      }

      setTimeout(() => {
        dragging.current = false;
      });
    }

    document.documentElement.addEventListener("pointermove", handlePointerMove);
    document.documentElement.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.documentElement.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      document.documentElement.removeEventListener(
        "pointerup",
        handlePointerUp
      );
    };
  }, []);

  // Set pointer event from last click on body for use later
  useEffect(() => {
    if (creatingCommentState !== "placing") {
      return;
    }

    function handlePointerDown(e: PointerEvent) {
      if (allowComposerRef.current) {
        return;
      }

      // Prevents issue with composedPath getting removed
      (e as any)._savedComposedPath = e.composedPath();
      lastPointerEvent.current = e;
      setAllowUseComposer(true);
    }

    document.documentElement.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.documentElement.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, [creatingCommentState]);

  // Enabling dragging with the top bar
  const handlePointerDownOverlay = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!composerRef.current) {
        return;
      }

      const rect = composerRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.pageX - rect.left - window.scrollX,
        y: e.pageY - rect.top - window.scrollY,
      };
      dragStart.current = {
        x: e.pageX,
        y: e.pageY,
      };
      dragging.current = true;
    },
    []
  );

  // Close on pressing X
  const handleOverlayClose = useCallback(() => {
    setCreatingCommentState("complete");
    setComposerCoords(null);
    setAllowUseComposer(false);
  }, []);

  // On composer submit, create thread and reset state
  const handleComposerSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!composerCoords || !lastPointerEvent.current) {
        return;
      }

      const {
        cursorSelectors = [],
        cursorX = -10000,
        cursorY = -10000,
      } = getCoordsFromPointerEvent(lastPointerEvent.current, {
        x: 0 - POINTER_OFFSET.x,
        y: 0 - POINTER_OFFSET.y,
      }) || {};

      createThread({
        body,
        metadata: {
          cursorSelectors: cursorSelectors.join(","),
          cursorX,
          cursorY,
          resolved: false,
          zIndex: 0,
        },
      });

      setComposerCoords(null);
      setCreatingCommentState("complete");
      setAllowUseComposer(false);
    },
    [createThread, composerCoords]
  );

  return (
    <>
      <button
        onClick={() =>
          setCreatingCommentState(
            creatingCommentState !== "complete" ? "complete" : "placing"
          )
        }
        style={{ opacity: creatingCommentState !== "complete" ? 0.7 : 1 }}
      >
        <CommentIcon />
      </button>
      {composerCoords && creatingCommentState === "placed" ? (
        <Portal.Root
          className={styles.composerWrapper}
          style={{
            pointerEvents: allowUseComposer ? "initial" : "none",
            transform: `translate(${composerCoords.x + POINTER_OFFSET.x}px, ${
              composerCoords.y + POINTER_OFFSET.y
            }px)`,
          }}
          asChild
        >
          <div
            ref={composerRef}
            className={styles.composer}
            // style={{ pointerEvents: dragging.current ? "none" : "initial" }}
          >
            <OverlayTop
              onPointerDown={handlePointerDownOverlay}
              onClose={handleOverlayClose}
            />
            <Pointer />
            <Composer onComposerSubmit={handleComposerSubmit} />
          </div>
        </Portal.Root>
      ) : null}
      <NewThreadCursor display={creatingCommentState === "placing"} />
    </>
  );
}
