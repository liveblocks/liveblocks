import { useRedo, useUndo } from "@liveblocks/react";
import * as React from "react";

export function useKeyboardEvents() {
  const undo = useUndo();
  const redo = useRedo();

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "z": {
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          }
        }
      }
    }

    document.body.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);
}
