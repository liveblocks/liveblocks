/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      <cursor />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      Welcome to slate-liveblocks!
      <cursor />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.insertText("Welcome to slate-liveblocks!");
}
