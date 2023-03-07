/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <anchor />
      Hello world!
      <focus />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <cursor />
    </unstyled>
  </editor>
);

export const inputRemoteEditor = (
  <editor>
    <unstyled>
      Hello world!
      <cursor />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.delete(editor);
}
