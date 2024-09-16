import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { $findMatchingParent } from "@lexical/utils";
import { $isHeadingNode } from "@lexical/rich-text";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  MouseEventHandler,
  ReactNode,
  useCallback,
  useSyncExternalStore,
} from "react";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { BoldIcon } from "@/icons/BoldIcon";
import { ItalicIcon } from "@/icons/ItalicIcon";
import { UnderlineIcon } from "@/icons/UnderlineIcon";
import { StrikethroughIcon } from "@/icons/StrikethroughIcon";
import { CodeIcon } from "@/icons/CodeIcon";
import { CommentIcon } from "@/icons/CommentIcon";
import { Select } from "@/components/Select";

const DROPDOWN_OPTIONS = [
  {
    id: "paragraph",
    text: "Text",
    jsx: <>Regular text</>,
  },
  {
    id: "h1",
    text: "Heading 1",
    jsx: <span className="font-bold text-[1.2em]">Heading 1</span>,
  },
  {
    id: "h2",
    text: "Heading 2",
    jsx: <span className="font-bold text-[1.1em]">Heading 2</span>,
  },
  {
    id: "h3",
    text: "Heading 3",
    jsx: <span className="font-bold">Heading 3</span>,
  },

  {
    id: "quote",
    text: "Quote",
    jsx: <span className="border-l-[3px] border-neutral-600 pl-2">Quote</span>,
  },
];

type DropdownIds = (typeof DROPDOWN_OPTIONS)[number]["id"];

export function EditorFloatingToolbarOptions() {
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

      if (type === "quote") {
        return $setBlocksType(selection, () => $createQuoteNode());
      }
    },
    [activeBlock]
  );

  return (
    <div className="py-0.5 px-1 rounded-lg border shadow-lg border-border/80 bg-white pointer-events-auto origin-top text-neutral-600 text-sm">
      <div className="flex items-center justify-center gap-1">
        <label
          htmlFor="select-block"
          className="h-8 flex items-center align-top"
        >
          <span className="sr-only">Select block type</span>
          <Select
            id="select-block-type"
            value={activeBlock || "paragraph"}
            items={DROPDOWN_OPTIONS}
            onValueChange={(value) => {
              editor.update(() => toggleBlock(value));
            }}
          />
        </label>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
          }}
        >
          <BoldIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
          }}
        >
          <ItalicIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
          }}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
          }}
        >
          <StrikethroughIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
          }}
        >
          <CodeIcon className="w-4 h-4" />
        </ToolbarButton>

        <span className="w-[1px] py-3.5 bg-border/50" />

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined);
          }}
        >
          <CommentIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  children,
}: {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-neutral-200 hover:text-accent-foreground w-7 h-7 data-[active]:bg-accent"
    >
      {children}
    </button>
  );
}

export function useActiveBlock() {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return null;

      const anchor = selection.anchor.getNode();
      let element =
        anchor.getKey() === "root"
          ? anchor
          : $findMatchingParent(anchor, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchor.getTopLevelElementOrThrow();
      }

      if ($isHeadingNode(element)) {
        return element.getTag();
      }

      return element.getType();
    });
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
