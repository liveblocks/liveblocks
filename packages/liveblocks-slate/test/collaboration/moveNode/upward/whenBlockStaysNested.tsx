/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <ul>
      <ul-li id="block1">
        Hello world!
        <cursor />
      </ul-li>
    </ul>
    <unstyled />
    <ul>
      <ul-li id="block2">Welcome to slate-liveblocks!</ul-li>
    </ul>
  </editor>
);

export const expected = (
  <editor>
    <unstyled />
    <ul>
      <ul-li id="block2">Welcome to slate-liveblocks!</ul-li>
      <ul-li id="block1">
        Hello world!
        <cursor />
      </ul-li>
    </ul>
  </editor>
);

export function run(editor: Editor) {
  Transforms.moveNodes(editor, {
    at: [0, 0],
    to: [2, 1],
  });
}
