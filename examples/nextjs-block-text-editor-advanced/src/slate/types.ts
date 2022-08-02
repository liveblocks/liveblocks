import { LiveObject, LiveList } from "@liveblocks/client";
import { BaseEditor, BaseOperation } from "slate";
import { ReactEditor } from "slate-react";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
    Operation: BaseOperation & { isRemote?: boolean };
  }
}

export type TextSelection = {
  caretPosition: number | null;
};

export type Presence = {
  selectedBlockIds: string[];
  textSelection: TextSelection | null;
};

export type Storage = {
  meta: LiveObject<DocumentMeta>;
  blocks: LiveList<CustomElement>;
};

export type DocumentMeta = {
  title: string | null;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    imageUrl: string;
  };
};

export type CustomElement = {
  type: "paragraph";
  id: string;
  children: CustomText[];
};

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
};

export type Format = "bold" | "underline" | "strikeThrough" | "italic";

export type Theme = "light" | "dark";
