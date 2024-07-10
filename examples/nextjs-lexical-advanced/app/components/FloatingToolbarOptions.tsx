import { SparklesIcon } from "../icons/SparklesIcon";
import {
  $createParagraphNode,
  $getSelection,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { BoldIcon } from "../icons/BoldIcon";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import { CommentIcon } from "../icons/CommentIcon";
import { motion } from "framer-motion";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback } from "react";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { useActiveBlock } from "../hooks/useActiveBlock";
import { ItalicIcon } from "../icons/ItalicIcon";
import { UnderlineIcon } from "../icons/UnderlineIcon";
import { StrikethroughIcon } from "../icons/StrikethroughIcon";

const DROPDOWN_OPTIONS = [
  {
    id: "paragraph",
    text: "Paragraph",
  },
  {
    id: "h1",
    text: "Heading 1",
  },
  {
    id: "h2",
    text: "Heading 2",
  },
  {
    id: "h3",
    text: "Heading 3",
  },
  {
    id: "h4",
    text: "Heading 4",
  },
  {
    id: "h5",
    text: "Heading 5",
  },
  {
    id: "h6",
    text: "Heading 6",
  },
  {
    id: "quote",
    text: "Quote",
  },
];

type DropdownIds = (typeof DROPDOWN_OPTIONS)[number]["id"];

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
  const activeBlock = useActiveBlock();

  const toggleBlock = useCallback(
    (type: DropdownIds) => {
      const selection = $getSelection();

      if (activeBlock === type || type === "paragraph") {
        return $setBlocksType(selection, () => $createParagraphNode());
      }

      if (type === "h1") {
        return $setBlocksType(selection, () => $createHeadingNode("h1"));
      }

      if (type === "h2") {
        return $setBlocksType(selection, () => $createHeadingNode("h2"));
      }

      if (type === "h3") {
        return $setBlocksType(selection, () => $createHeadingNode("h3"));
      }

      if (type === "h4") {
        return $setBlocksType(selection, () => $createHeadingNode("h4"));
      }

      if (type === "h5") {
        return $setBlocksType(selection, () => $createHeadingNode("h5"));
      }

      if (type === "h6") {
        return $setBlocksType(selection, () => $createHeadingNode("h6"));
      }

      if (type === "quote") {
        return $setBlocksType(selection, () => $createQuoteNode());
      }
    },
    [activeBlock]
  );

  return (
    <motion.div
      layoutId="floating-toolbar-main"
      layout="size"
      style={{ display: state !== "ai" ? "block" : "none" }}
      className="p-1 rounded-lg border shadow-lg border-border/80 bg-card pointer-events-auto origin-top text-gray-600"
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.93 }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        duration: 0.25,
      }}
    >
      <div className="flex items-center justify-center gap-1">
        <button
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

        <span className="w-[1px] py-3.5 bg-border/50" />

        <label htmlFor="select-block" className="h-8 items-center align-top">
          <span className="sr-only">Select block type</span>
          <select
            id="select-block"
            onInput={(e) => {
              editor.update(() => toggleBlock(e.currentTarget.value));
            }}
            className="bg-white border-0 h-8 pl-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground data-[active]:bg-accent"
            value={activeBlock || "paragraph"}
          >
            {DROPDOWN_OPTIONS.map(({ id, text }) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <BoldIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <ItalicIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <StrikethroughIcon className="w-4 h-4" />
        </button>

        <span className="w-[1px] py-3.5 mx-1 bg-border/50" />

        {/*<button*/}
        {/*  onClick={() => editor.update(() => toggleBlock("quote"))}*/}
        {/*  data-active={activeBlock === "quote" ? "" : undefined}*/}
        {/*  className={*/}
        {/*    "inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"*/}
        {/*  }*/}
        {/*>*/}
        {/*  <BlockquoteIcon />*/}
        {/*</button>*/}

        <button
          onClick={() => {
            editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined);
            setState("default");
          }}
          className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8 data-[active]:bg-accent"
        >
          <CommentIcon />
        </button>
      </div>
    </motion.div>
  );
}
