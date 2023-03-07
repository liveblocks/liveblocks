/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <ul>
      <ul-li>Hello world!</ul-li>
      <ul-li>
        Welcome to <cursor />
      </ul-li>
    </ul>
  </editor>
);

export const expected = (
  <editor>
    <ul>
      <ul-li>Hello world!</ul-li>
      <ul-li>
        Welcome to slate-liveblocks!
        <cursor />
      </ul-li>
    </ul>
  </editor>
);

export function run(editor: Editor) {
  editor.insertText("slate-liveblocks!");
}
