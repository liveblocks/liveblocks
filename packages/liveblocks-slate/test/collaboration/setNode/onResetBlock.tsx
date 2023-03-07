/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <h1 id="block1">
      <cursor />
      Hello world!
    </h1>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block2">
      <cursor />
      Hello world!
    </unstyled>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.setNodes(editor, { type: "unstyled", id: "block2" });
}
