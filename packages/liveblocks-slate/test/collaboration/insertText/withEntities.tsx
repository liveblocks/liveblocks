/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <note-link entityId="myEntity">
        Hello <cursor />!
      </note-link>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <note-link entityId="myEntity">
        Hello world
        <cursor />!
      </note-link>
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.insertText("world");
}
