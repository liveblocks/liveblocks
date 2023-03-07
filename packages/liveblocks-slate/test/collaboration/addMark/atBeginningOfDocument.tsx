/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <anchor />
      Hello
      <focus /> world!
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <anchor />
      <text bold>Hello</text>
      <focus /> world!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.addMark("bold", true);
}
