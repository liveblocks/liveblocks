/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      <anchor />
      Welcome to slate-liveblocks!
      <focus />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      <cursor />
    </unstyled>
  </editor>
);

export const inputRemoteEditor = (
  <editor>
    <unstyled>Hello world!</unstyled>
    <unstyled>
      <cursor />
      Welcome to slate-liveblocks!
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.delete(editor);
}
