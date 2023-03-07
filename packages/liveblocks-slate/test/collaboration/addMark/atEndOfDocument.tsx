/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      Hello <anchor />
      world!
      <focus />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      Hello{" "}
      <text bold>
        <anchor />
        world!
      </text>
      <focus />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.addMark("bold", true);
}
