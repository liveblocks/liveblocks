/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <anchor />
      <text italic>Hello world</text>
      <focus />
      <text bold>!</text>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <anchor />
      <text italic bold>
        Hello world
      </text>
      <focus />
      <text bold>!</text>
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.addMark("bold", true);
}
