/** @jsx jsx */
import { Editor } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      Welcome
      <cursor />
      to slate-liveblocks!
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>Welcome</unstyled>
    <h1>
      Foo bar!
      <cursor />
    </h1>
    <unstyled>to slate-liveblocks!</unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.insertNode(<h1>Foo bar!</h1>);
}
