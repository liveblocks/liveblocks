import { SparklesIcon } from "../icons/SparklesIcon";
import { FORMAT_TEXT_COMMAND } from "lexical";
import { BoldIcon } from "../icons/BoldIcon";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import { CommentIcon } from "../icons/CommentIcon";
import { motion } from "framer-motion";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export function FloatingToolbarOptions({
  state,
  setState,
  onOpenAi,
}: {
  state: "default" | "ai" | "closed";
  setState: (state: "default" | "ai" | "closed") => void;
  onOpenAi: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  return (
    <motion.div
      // layoutId="floating-toolbar-main"
      style={{ display: state !== "ai" ? "block" : "none" }}
      className="flex items-center justify-center gap-2 p-1 rounded-lg border shadow-lg border-border/80 bg-card pointer-events-auto origin-top"
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        duration: 0.25,
      }}
    >
      <button
        // onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setState("ai");
          onOpenAi();
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
          /* const isOpen = */
          editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined);
          // if (isOpen) {
          //   onRangeChange(null);
          // }
          setState("default");
        }}
        className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
      >
        <CommentIcon />
      </button>
    </motion.div>
  );
}
