import type { Element as SlateElement } from "slate";
import type { RenderElementProps } from "slate-react";

import type {
  AiComposerBodyElement,
  AiComposerBodyText,
  AiComposerEditor,
  ComposerBodyElement,
  ComposerBodyText,
  ComposerEditor,
} from "./types";

declare module "slate" {
  interface CustomTypes {
    Editor: ComposerEditor | AiComposerEditor;
    Element: ComposerBodyElement | AiComposerBodyElement;
    Text: ComposerBodyText | AiComposerBodyText;
  }
}

declare module "slate-react" {
  type RenderElementSpecificProps<E extends SlateElement> = Omit<
    RenderElementProps,
    "element"
  > & { element: E };

  type RenderLeafSpecificProps<L extends SlateLeaf> = Omit<
    RenderLeafProps,
    "leaf"
  > & { leaf: L };
}

declare module "react" {
  interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
    enterKeyHint?: InputHTMLAttributes<T>["enterKeyHint"];
  }
}
