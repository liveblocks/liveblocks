import type { BaseEditor, Element } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor, RenderElementProps } from "slate-react";

import type {
  ComposerBodyAutoLink,
  ComposerBodyCustomLink,
  ComposerBodyListItem,
  ComposerBodyMention,
  ComposerBodyOrderedList,
  ComposerBodyParagraph,
  ComposerBodyText,
  ComposerBodyUnorderedList,
} from "./types";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element:
      | ComposerBodyParagraph
      | ComposerBodyOrderedList
      | ComposerBodyUnorderedList
      | ComposerBodyListItem
      | ComposerBodyMention
      | ComposerBodyAutoLink
      | ComposerBodyCustomLink;
    Text: ComposerBodyText;
  }
}

declare module "slate-react" {
  type RenderElementSpecificProps<E extends Element> = Omit<
    RenderElementProps,
    "element"
  > & { element: E };
}

declare module "react" {
  interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
    enterKeyHint?: InputHTMLAttributes<T>["enterKeyHint"];
  }
}
