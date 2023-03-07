/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <ul>
      <ul-li id="block1">
        <cursor />
        Hello World!
      </ul-li>
    </ul>
  </editor>
);

export const expected = (
  <editor>
    <ul>
      <ul-li id="block1" checked>
        <cursor />
        Hello World!
      </ul-li>
    </ul>
  </editor>
);

export function run(editor: Editor) {
  Transforms.setNodes(
    editor,
    { checked: true },
    {
      mode: "lowest",
    }
  );
}
