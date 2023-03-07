/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      Welcome to slate-liveblocks!
      <cursor />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
    <h1>
      Foo bar!
      <cursor />
    </h1>
  </editor>
);

export function run(editor: Editor) {
  editor.insertNode(<h1>Foo bar!</h1>);
}
