import type { Editor as SlateEditor } from "slate";

import { isEmpty } from "../utils/is-empty";
import { removeMarks } from "../utils/marks";

// https://github.com/ianstormtaylor/slate/issues/2908
export function withEmptyClearFormatting<T extends SlateEditor>(editor: T): T {
  const { onChange } = editor;

  editor.onChange = (options) => {
    if (isEmpty(editor, editor.children)) {
      removeMarks(editor);
    }

    onChange(options);
  };

  return editor;
}
