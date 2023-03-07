/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">
      Hello world!
      <cursor />
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">Hello world!</unstyled>
    <h1>
      <cursor />
    </h1>
  </editor>
);

export function run(editor: Editor) {
  editor.insertNode({ type: "unstyled", children: [{ text: "" }] });
  Transforms.setNodes(editor, { type: "header-one" });
}
