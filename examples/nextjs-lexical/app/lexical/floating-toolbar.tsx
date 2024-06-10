import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { useEffect, useLayoutEffect, useState } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import type { LexicalEditor, LexicalNode } from "lexical";
import { $isTextNode } from "lexical";
import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";

export default function FloatingToolbar() {
  const [editor] = useLexicalComposerContext();

  const [range, setRange] = useState<Range | null>(null);

  useEffect(() => {
    editor.registerUpdateListener(({ tags }) => {
      return editor.getEditorState().read(() => {
        // Ignore selection updates related to collaboration
        if (tags.has("collaboration")) return;

        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          setRange(null);
          return;
        }

        const { anchor, focus } = selection;

        const range = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset
        );

        setRange(range);
      });
    });
  }, [editor]);

  if (range === null) return null;

  return (
    <Toolbar range={range} onRangeChange={setRange} container={document.body} />
  );
}

function Toolbar({
  range,
  onRangeChange,
  container,
}: {
  range: Range;
  onRangeChange: (range: Range | null) => void;
  container: HTMLElement;
}) {
  const [editor] = useLexicalComposerContext();

  const padding = 20;

  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "bottom",
    middleware: [
      flip({ padding, crossAxis: false }),
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

  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () => range.getBoundingClientRect(),
    });
  }, [setReference, range]);

  return createPortal(
    <div
      ref={setFloating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}
    >
      <div className="flex items-center justify-center gap-2 p-1.5 w-full min-w-max rounded-lg bg-white border shadow">
        <button
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
          className="relative w-[30px] h-[30px] rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        >
          <BoldIcon />
        </button>

        <button
          onClick={() => {
            const isOpen = editor.dispatchCommand(
              OPEN_FLOATING_COMPOSER_COMMAND,
              undefined
            );
            if (isOpen) {
              onRangeChange(null);
            }
          }}
          className="relative  w-[30px] h-[30px] rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        >
          <CommentIcon />
        </button>
      </div>
    </div>,
    container
  );
}

function BoldIcon(props: React.SVGAttributes<SVGElement>) {
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
      <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
    </svg>
  );
}

function CommentIcon(props: React.SVGAttributes<SVGElement>) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/**
 * MIT License
 * Copyright (c) Meta Platforms, Inc. and affiliates.

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

function getDOMTextNode(element: Node | null): Text | null {
  let node = element;

  while (node !== null) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node as Text;
    }

    node = node.firstChild;
  }

  return null;
}

function getDOMIndexWithinParent(node: ChildNode): [ParentNode, number] {
  const parent = node.parentNode;

  if (parent === null) {
    throw new Error("Should never happen");
  }

  return [parent, Array.from(parent.childNodes).indexOf(node)];
}

/**
 * Creates a selection range for the DOM.
 * @param editor - The lexical editor.
 * @param anchorNode - The anchor node of a selection.
 * @param _anchorOffset - The amount of space offset from the anchor to the focus.
 * @param focusNode - The current focus.
 * @param _focusOffset - The amount of space offset from the focus to the anchor.
 * @returns The range of selection for the DOM that was created.
 */
export function createDOMRange(
  editor: LexicalEditor,
  anchorNode: LexicalNode,
  _anchorOffset: number,
  focusNode: LexicalNode,
  _focusOffset: number
): Range | null {
  const anchorKey = anchorNode.getKey();
  const focusKey = focusNode.getKey();
  const range = document.createRange();
  let anchorDOM: Node | Text | null = editor.getElementByKey(anchorKey);
  let focusDOM: Node | Text | null = editor.getElementByKey(focusKey);
  let anchorOffset = _anchorOffset;
  let focusOffset = _focusOffset;

  if ($isTextNode(anchorNode)) {
    anchorDOM = getDOMTextNode(anchorDOM);
  }

  if ($isTextNode(focusNode)) {
    focusDOM = getDOMTextNode(focusDOM);
  }

  if (
    anchorNode === undefined ||
    focusNode === undefined ||
    anchorDOM === null ||
    focusDOM === null
  ) {
    return null;
  }

  if (anchorDOM.nodeName === "BR") {
    [anchorDOM, anchorOffset] = getDOMIndexWithinParent(anchorDOM as ChildNode);
  }

  if (focusDOM.nodeName === "BR") {
    [focusDOM, focusOffset] = getDOMIndexWithinParent(focusDOM as ChildNode);
  }

  const firstChild = anchorDOM.firstChild;

  if (
    anchorDOM === focusDOM &&
    firstChild !== null &&
    firstChild.nodeName === "BR" &&
    anchorOffset === 0 &&
    focusOffset === 0
  ) {
    focusOffset = 1;
  }

  try {
    range.setStart(anchorDOM, anchorOffset);
    range.setEnd(focusDOM, focusOffset);
  } catch (e) {
    return null;
  }

  if (
    range.collapsed &&
    (anchorOffset !== focusOffset || anchorKey !== focusKey)
  ) {
    // Range is backwards, we need to reverse it
    range.setStart(focusDOM, focusOffset);
    range.setEnd(anchorDOM, anchorOffset);
  }

  return range;
}
