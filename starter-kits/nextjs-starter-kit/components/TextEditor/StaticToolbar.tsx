import { Toolbar } from "@liveblocks/react-tiptap";
import { Editor } from "@tiptap/react";
import { ToolbarMedia } from "@/components/TextEditor/ToolbarMedia";
import { ToolbarInlineAdvanced } from "./TextInlineAdvanced";
import { ToolbarAlignment } from "./ToolbarAlignment";

type Props = {
  editor: Editor | null;
};

export function StaticToolbar({ editor }: Props) {
  return (
    <Toolbar editor={editor}>
      <Toolbar.SectionHistory />
      <Toolbar.Separator />
      <Toolbar.BlockSelector />
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
