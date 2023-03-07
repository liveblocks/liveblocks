/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <h1 id="block1">
      Hello world!
      <cursor />
    </h1>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <h1 id="block1">Hello world!</h1>
    <h1 id="block1">
      <cursor />
    </h1>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.splitNodes(editor, { always: true });
}
