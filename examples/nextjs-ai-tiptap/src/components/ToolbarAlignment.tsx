import { Toolbar } from "@liveblocks/react-tiptap";
import { Editor } from "@tiptap/react";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
} from "@/icons";

type Props = {
  editor: Editor | null;
};

export function ToolbarAlignment({ editor }: Props) {
  return (
    <>
      <Toolbar.Toggle
        name="Align left"
        icon={<AlignLeftIcon />}
        active={editor?.isActive({ textAlign: "left" }) ?? false}
        onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        disabled={!editor?.can().chain().focus().setTextAlign("left").run()}
      />

      <Toolbar.Toggle
        name="Align center"
        icon={<AlignCenterIcon />}
        active={editor?.isActive({ textAlign: "center" }) ?? false}
        onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        disabled={!editor?.can().chain().focus().setTextAlign("center").run()}
      />

      <Toolbar.Toggle
        name="Align right"
        icon={<AlignRightIcon />}
        active={editor?.isActive({ textAlign: "right" }) ?? false}
        onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        disabled={!editor?.can().chain().focus().setTextAlign("right").run()}
      />

      <Toolbar.Toggle
        name="Justify"
        icon={<AlignJustifyIcon />}
        active={editor?.isActive({ textAlign: "justify" }) ?? false}
        onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
        disabled={!editor?.can().chain().focus().setTextAlign("justify").run()}
      />
    </>
  );
}
