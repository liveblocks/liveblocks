/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <text bold>
        Hello
        <anchor /> world
        <focus />!
      </text>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <text bold>Hello</text>
      <text>
        <anchor /> world
        <focus />
      </text>
      <text bold>!</text>
    </unstyled>
  </editor>
);

export const inputRemoteEditor = (
  <editor>
    <unstyled>
      <text bold>
        Hello
        <cursor /> world!
      </text>
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.removeMark("bold");
}
