import { FloatingToolbar, Toolbar } from "@liveblocks/react-tiptap";
import { Editor } from "@tiptap/react";
import { ToolbarMedia } from "@/components/TextEditor/ToolbarMedia";
import { ToolbarInlineAdvanced } from "./TextInlineAdvanced";
import { ToolbarAlignment } from "./ToolbarAlignment";
import { ToolbarBlockSelector } from "./ToolbarBlockSelector";

type Props = {
  editor: Editor | null;
};

export function StaticToolbar({ editor }: Props) {
  return (
    <Toolbar editor={editor} data-toolbar="static">
      <Toolbar.SectionHistory />
      <Toolbar.Separator />
      <ToolbarBlockSelector editor={editor} />
      <Toolbar.Separator />
      <Toolbar.SectionInline />
      <ToolbarInlineAdvanced editor={editor} />
      <Toolbar.Separator />
      <ToolbarAlignment editor={editor} />
      <Toolbar.Separator />
      <ToolbarMedia editor={editor} />
      <Toolbar.Separator />
      <Toolbar.SectionCollaboration />
    </Toolbar>
  );
}

export function SelectionToolbar({ editor }: Props) {
  return (
    <FloatingToolbar editor={editor} data-toolbar="selection">
      <ToolbarBlockSelector editor={editor} />
      <Toolbar.Separator />
      <Toolbar.SectionInline />
      <Toolbar.Separator />
      <Toolbar.SectionCollaboration />
    </FloatingToolbar>
  );
}
