/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../../slate-jsx";

export const input = (
  <editor>
    <unstyled id="block1">
      Hello world!
      <cursor />
    </unstyled>
    <ul>
      <ul-li id="block2">Welcome to slate-liveblocks!</ul-li>
    </ul>
  </editor>
);

export const expected = (
  <editor>
    <ul>
      <ul-li id="block2">Welcome to slate-liveblocks!</ul-li>
      <ul-li id="block1">
        Hello world!
        <cursor />
      </ul-li>
    </ul>
  </editor>
);

export function run(editor: Editor) {
  Editor.withoutNormalizing(editor, () => {
    Transforms.setNodes(
      editor,
      { type: "unordered-list-item" },
      {
        at: [0],
      }
    );
    Transforms.moveNodes(editor, {
      at: [0],
      to: [1, 1],
    });
  });
}
