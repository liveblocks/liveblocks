type BaseThreadSelection = {
  editor: "lexical" | "slate"; // | "codemirror", etc.
};

interface LexicalSelection extends BaseThreadSelection {
  editor: "lexical";
  anchorPath: number[];
  anchorOffset: number;
  anchorType: "text" | "element";
  focusPath: number[];
  focusOffset: number;
  focusType: "text" | "element";
  isBackward: boolean;
}

export type ThreadSelection = LexicalSelection; // | SlateSelection | MonacoSelection, etc.
