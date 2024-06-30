import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import {
  autoUpdate,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { BoldIcon } from "../icons/BoldIcon";
import { CommentIcon } from "../icons/CommentIcon";
import { FloatingToolbarAi } from "./FloatingToolbarAi";
import { SparklesIcon } from "../icons/SparklesIcon";
import { useRange } from "../hooks/useRange";
import { useMouseListener } from "../hooks/useMouseListener";
import {
  AnimatePresence,
  AnimateSharedLayout,
  LayoutGroup,
  motion,
} from "framer-motion";
import { FloatingToolbarOptions } from "./FloatingToolbarOptions";

export function FloatingToolbar() {
  const padding = 20;
  const [fullWidth, setFullWidth] = useState(false);
  const [editor] = useLexicalComposerContext();

  // Handle floating and edge cases
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "bottom",
    middleware: [
      offset(10),
      hide({ padding }),
      shift({ padding, limiter: limitShift() }),
      size({ padding }),
    ],
    whileElementsMounted: (...args) => {
      return autoUpdate(...args, {
        animationFrame: true,
      });
    },
  });

  // Pass position of current selection to floating ui
  const { range, rangeRef } = useRange();
  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () =>
        range?.getBoundingClientRect() || new DOMRect(),
    });
  }, [setReference, range]);

  // When menu closed, go back to narrow width
  useEffect(() => {
    if (range === null) {
      setFullWidth(false);
    }
  }, [range]);

  // Don't show toolbar when mouse is down and creating a new selection
  const [creatingMouseSelection, setCreatingMouseSelection] = useState(false);
  useMouseListener((mouse) => {
    // Wait two ticks in case Lexical needs to remove previous selection
    setTimeout(() => {
      setTimeout(() => {
        setCreatingMouseSelection(
          rangeRef.current === null && mouse === "down"
        );
      });
    });
  });

  if (range === null || creatingMouseSelection) {
    return null;
  }

  return createPortal(
    <div
      ref={setFloating}
      className="pointer-events-none"
      style={
        fullWidth && editor._rootElement
          ? {
              position: strategy,
              top: 0,
              left: editor._rootElement.getBoundingClientRect().left,
              transform: `translate3d(0, ${Math.round(y)}px, 0)`,
              width: editor._rootElement.getBoundingClientRect().width,
            }
          : {
              position: strategy,
              top: 0,
              left: 0,
              transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
              minWidth: "max-content",
            }
      }
    >
      <ToolbarOptions setFullWidth={setFullWidth} />
    </div>,
    document.body
  );
}

function ToolbarOptions({
  setFullWidth,
}: {
  setFullWidth: (isFullWidth: boolean) => void;
}) {
  const [state, setState] = useState<"default" | "ai" | "closed">("default");

  if (state === "closed") {
    return null;
  }

  return (
    <div className="w-full text-foreground text-sm leading-relaxed">
      {/* AI toolbar when enabled */}
      {state === "ai" ? (
        <FloatingToolbarAi
          state={state}
          setState={setState}
          onClose={() => {
            setState("closed");
            setFullWidth(false);
          }}
        />
      ) : null}

      {/* Initial toolbar */}
      {state === "default" ? (
        <FloatingToolbarOptions
          state={state}
          setState={setState}
          onOpenAi={() => setFullWidth(true)}
        />
      ) : null}
    </div>
  );
}
