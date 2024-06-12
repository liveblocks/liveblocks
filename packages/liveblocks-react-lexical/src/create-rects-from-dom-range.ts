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

import type { LexicalEditor } from "lexical";

/**
 * Creates DOMRects, generally used to help the editor find a specific location on the screen.
 * @param editor - The lexical editor
 * @param range - A fragment of a document that can contain nodes and parts of text nodes.
 * @returns The selectionRects as an array.
 */
export function createRectsFromDOMRange(
  editor: LexicalEditor,
  range: Range
): Array<ClientRect> {
  const rootElement = editor.getRootElement();

  if (rootElement === null) {
    return [];
  }
  const rootRect = rootElement.getBoundingClientRect();
  const computedStyle = getComputedStyle(rootElement);
  const rootPadding =
    parseFloat(computedStyle.paddingLeft) +
    parseFloat(computedStyle.paddingRight);
  const selectionRects = Array.from(range.getClientRects());
  let selectionRectsLength = selectionRects.length;
  //sort rects from top left to bottom right.
  selectionRects.sort((a, b) => {
    const top = a.top - b.top;
    // Some rects match position closely, but not perfectly,
    // so we give a 3px tolerance.
    if (Math.abs(top) <= 3) {
      return a.left - b.left;
    }
    return top;
  });
  let prevRect;
  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    // Exclude rects that overlap preceding Rects in the sorted list.
    const isOverlappingRect =
      prevRect &&
      prevRect.top <= selectionRect.top &&
      prevRect.top + prevRect.height > selectionRect.top &&
      prevRect.left + prevRect.width > selectionRect.left;
    // Exclude selections that span the entire element
    const selectionSpansElement =
      selectionRect.width + rootPadding === rootRect.width;
    if (isOverlappingRect || selectionSpansElement) {
      selectionRects.splice(i--, 1);
      selectionRectsLength--;
      continue;
    }
    prevRect = selectionRect;
  }
  return selectionRects;
}
