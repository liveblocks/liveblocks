/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      Hello <cursor />!
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      Hello <text bold>world</text>
      <cursor />!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.addMark("bold", true);
  editor.insertText("world");
}
