/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">Hello world!</unstyled>
    <h1 id="block2">
      <cursor />
      Welcome to slate-liveblocks!
    </h1>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">Hello world!</unstyled>
    <unstyled id="block2">
      <cursor />
      Welcome to slate-liveblocks!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.setNodes(editor, { type: "unstyled", id: "block2" });
}
