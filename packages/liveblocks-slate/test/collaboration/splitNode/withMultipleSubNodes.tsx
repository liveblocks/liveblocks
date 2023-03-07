/* eslint-disable react/void-dom-elements-no-children */
/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">
      slate-liveblocks
      <cursor />
      slate-liveblocks
      <link url="https://liveblocks.io">slate-liveblocks</link>
      <link url="https://liveblocks.io">slate-liveblocks</link>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">slate-liveblocks</unstyled>
    <unstyled id="block1">
      <cursor />
      slate-liveblocks
      <link url="https://liveblocks.io">slate-liveblocks</link>
      <link url="https://liveblocks.io">slate-liveblocks</link>
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.splitNodes(editor, { always: true });
}
