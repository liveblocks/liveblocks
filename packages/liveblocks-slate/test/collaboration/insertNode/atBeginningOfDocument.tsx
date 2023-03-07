/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <cursor />
      Hello world!
    </unstyled>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <h1>
      Foo bar!
      <cursor />
    </h1>
    <unstyled>Hello world!</unstyled>
    <unstyled>Welcome to slate-liveblocks!</unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.insertNode(<h1>Foo bar!</h1>);
}
