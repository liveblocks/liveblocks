/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">Hello world!</unstyled>
    <ul>
      <ul-li>
        <cursor />
        Welcome to slate-liveblocks!
      </ul-li>
    </ul>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">
      Hello world!
      <cursor />
      Welcome to slate-liveblocks!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.deleteBackward("character");
}
