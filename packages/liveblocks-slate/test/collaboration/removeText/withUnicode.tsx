/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
      <anchor />
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
      <focus />
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
      <cursor />
      {"Iñtërnâtiônàlizætiøn☃💩\uFEFF"}
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.delete(editor);
}
