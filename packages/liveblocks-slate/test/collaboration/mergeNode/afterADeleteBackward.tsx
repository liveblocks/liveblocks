/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      <cursor />
      Welcome to slate-liveblocks!
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      Hello world!
      <cursor />
      Welcome to slate-liveblocks!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.deleteBackward("character");
}
