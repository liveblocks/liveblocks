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
import { AIToolbar } from "./AIToolbar";
import { SparklesIcon } from "../icons/SparklesIcon";
import { useRange } from "../hooks/useRange";
import { useMouseListener } from "../hooks/useMouseListener";

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
        setCreatingMouseSelection(!rangeRef.current && mouse === "down");
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
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<"default" | "ai" | "closed">("default");

  if (state === "closed") {
    return null;
  }

  return (
    <div className="w-full text-foreground text-sm leading-relaxed">
      {/* AI toolbar when enabled */}
      <div style={{ display: state === "ai" ? "block" : "none" }}>
        <AIToolbar
          state={state}
          setState={setState}
          onClose={() => {
            setState("closed");
          }}
        />
      </div>

      {/* Initial toolbar */}
      <div
        style={{ display: state !== "ai" ? "block" : "none" }}
        className="flex items-center justify-center gap-2 p-1 rounded-lg border shadow-lg border-border/80 bg-card pointer-events-auto"
      >
        <button
          // onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setState("ai");
            setFullWidth(true);
          }}
          className="px-2 inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 data-[active]:bg-accent"
        >
          <div className="flex items-center text-indigo-500 font-semibold">
            <SparklesIcon className="h-4 -ml-1" /> AI
          </div>
        </button>
        <button
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <BoldIcon />
        </button>

        <button
          onClick={() => {
            /* const isOpen = */ editor.dispatchCommand(
              OPEN_FLOATING_COMPOSER_COMMAND,
              undefined
            );
            // if (isOpen) {
            //   onRangeChange(null);
            // }
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <CommentIcon />
        </button>
      </div>
    </div>
  );
}
