/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled id="block1">
      Welcome to slate-liveblocks!
      <cursor />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled id="block1">Welcome to slate-liveblocks!</unstyled>
    <unstyled id="block1">
      <cursor />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.splitNodes(editor, { always: true });
}
