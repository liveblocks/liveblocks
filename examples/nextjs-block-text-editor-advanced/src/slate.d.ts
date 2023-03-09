import { BaseEditor, BaseElement } from "slate";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from "slate-history";

import { ElementWithId } from "./plugins/withElementIds";
import { CustomElement, CustomText } from "./types";
import { LiveblocksEditor, PresenceEditor } from "@liveblocks/slate";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor &
      ReactEditor &
      LiveblocksEditor &
      HistoryEditor &
      PresenceEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
