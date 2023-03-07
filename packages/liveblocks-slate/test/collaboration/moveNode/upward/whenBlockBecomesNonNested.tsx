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
    <unstyled id="block2">Welcome to slate-liveblocks!</unstyled>
    <unstyled id="block1">
      Hello world!
      <cursor />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Editor.withoutNormalizing(editor, () => {
    Transforms.setNodes(
      editor,
      { type: "unstyled" },
      {
        at: [1, 0],
      }
    );
    Transforms.moveNodes(editor, {
      at: [1, 0],
      to: [0],
    });
  });
}
