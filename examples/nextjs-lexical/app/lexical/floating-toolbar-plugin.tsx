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

export default function FloatingToolbarPlugin() {
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
    <FloatingToolbar
      range={range}
      onRangeChange={setRange}
      container={document.body}
    />
  );
}

function FloatingToolbar({
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
      <div className="flex items-center justify-center gap-2 p-2 w-full min-w-max rounded-lg bg-white border">
        <button
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
          className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
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
          className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-2 text-center text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 transition-colors"
        >
          <CommentIcon />
        </button>
      </div>
    </div>,
    container
  );
}

function BoldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.25 25H9V7H17.5C18.5022 7.00006 19.4834 7.28695 20.3277 7.82679C21.172 8.36662 21.8442 9.13684 22.2649 10.0465C22.6855 10.9561 22.837 11.9671 22.7015 12.96C22.5659 13.953 22.149 14.8864 21.5 15.65C22.3477 16.328 22.9645 17.252 23.2653 18.295C23.5662 19.3379 23.5364 20.4485 23.18 21.4738C22.8236 22.4991 22.1581 23.3887 21.2753 24.0202C20.3924 24.6517 19.3355 24.994 18.25 25ZM12 22H18.23C18.5255 22 18.8181 21.9418 19.091 21.8287C19.364 21.7157 19.6121 21.5499 19.821 21.341C20.0299 21.1321 20.1957 20.884 20.3087 20.611C20.4218 20.3381 20.48 20.0455 20.48 19.75C20.48 19.4545 20.4218 19.1619 20.3087 18.889C20.1957 18.616 20.0299 18.3679 19.821 18.159C19.6121 17.9501 19.364 17.7843 19.091 17.6713C18.8181 17.5582 18.5255 17.5 18.23 17.5H12V22ZM12 14.5H17.5C17.7955 14.5 18.0881 14.4418 18.361 14.3287C18.634 14.2157 18.8821 14.0499 19.091 13.841C19.2999 13.6321 19.4657 13.384 19.5787 13.111C19.6918 12.8381 19.75 12.5455 19.75 12.25C19.75 11.9545 19.6918 11.6619 19.5787 11.389C19.4657 11.116 19.2999 10.8679 19.091 10.659C18.8821 10.4501 18.634 10.2843 18.361 10.1713C18.0881 10.0582 17.7955 10 17.5 10H12V14.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
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
