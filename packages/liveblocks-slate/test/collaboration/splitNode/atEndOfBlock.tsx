/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">
      Hello world!
      <cursor />
    </unstyled>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">Hello world!</unstyled>
    <unstyled id="block1">
      <cursor />
    </unstyled>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.splitNodes(editor, { always: true });
}
