/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <cursor />
      Hello world!
    </unstyled>
    <unstyled id="myBlockId">Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="myBlockId">
      <cursor />
      Welcome to slate-liveblocks!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.removeNodes(editor);
}
