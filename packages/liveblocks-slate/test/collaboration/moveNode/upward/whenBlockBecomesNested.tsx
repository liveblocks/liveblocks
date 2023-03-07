/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../../slate-jsx";

export const input = (
  <editor>
    <ul>
      <ul-li id="block1">
        Hello world!
        <cursor />
      </ul-li>
    </ul>
    <unstyled id="block2">Welcome to slate-liveblocks!</unstyled>
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
        at: [1],
      }
    );
    Transforms.moveNodes(editor, {
      at: [1],
      to: [0, 0],
    });
  });
}
