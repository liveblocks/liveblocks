import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getSelection, $isRangeSelection, $isRootOrShadowRoot } from "lexical";
import { SVGAttributes, useCallback, useSyncExternalStore } from "react";
import { $findMatchingParent } from "@lexical/utils";

export default function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const activeBlock = useActiveBlock();

  return (
    <>
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () => $createHeadingNode("h1"));
          });
        }}
        className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        style={{
          backgroundColor:
            activeBlock === "h1" ? "rgba(0, 0, 0, 0.05)" : "transparent",
        }}
      >
        <HeadingOneIcon />
      </button>

      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () => $createHeadingNode("h2"));
          });
        }}
        className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        style={{
          backgroundColor:
            activeBlock === "h2" ? "rgba(0, 0, 0, 0.05)" : "transparent",
        }}
      >
        <HeadingTwoIcon />
      </button>

      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () => $createHeadingNode("h3"));
          });
        }}
        className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        style={{
          backgroundColor:
            activeBlock === "h3" ? "rgba(0, 0, 0, 0.05)" : "transparent",
        }}
      >
        <HeadingThreeIcon />
      </button>

      <span className="w-[1px] bg-zinc-900 py-2 mx-2" />

      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () => $createQuoteNode());
          });
        }}
        className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        style={{
          backgroundColor:
            activeBlock === "quote" ? "rgba(0, 0, 0, 0.05)" : "transparent",
        }}
      >
        <QuoteIcon />
      </button>
    </>
  );
}

function useActiveBlock() {
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

function HeadingOneIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="m17 12 3-2v8" />
    </svg>
  );
}

function HeadingTwoIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
  );
}

function HeadingThreeIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </svg>
  );
}

function QuoteIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 6H3" />
      <path d="M21 12H8" />
      <path d="M21 18H8" />
      <path d="M3 12v6" />
    </svg>
  );
}
