/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">
      Hello world!
      <cursor />
    </unstyled>
    <unstyled id="block2">Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block2">Welcome to slate-liveblocks!</unstyled>
    <unstyled id="block1">
      Hello world!
      <cursor />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.moveNodes(editor, {
    at: [0],
    to: [1],
  });
}
