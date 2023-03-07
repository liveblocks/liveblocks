/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">
      H{"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
      <cursor />
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
    </unstyled>
    <unstyled>{"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}</unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">H{"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}</unstyled>
    <unstyled id="block1">
      <cursor />
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
    </unstyled>
    <unstyled>{"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}</unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.splitNodes(editor, { always: true });
}
