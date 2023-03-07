/** @jsx jsx */
import { Editor, Transforms } from "slate";
import { jsx } from "../../../slate-jsx";

export const input = (
  <editor>
    <unstyled>
      <note-link noteId="note1">
        Meeting notes
        <cursor />
      </note-link>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <note-link noteId="note2">
        Meeting notes
        <cursor />
      </note-link>
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.setNodes(
    editor,
    { noteId: "note2" },
    {
      match: (node) => Editor.isInline(editor, node),
    }
  );
}
