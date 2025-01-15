import { Toolbar } from "@liveblocks/react-tiptap";
import { Editor } from "@tiptap/react";
import { CheckboxIcon } from "@/icons";

type Props = {
  editor: Editor | null;
};

export function ToolbarBlockSelector({ editor }: Props) {
  return (
    <Toolbar.BlockSelector
      items={(defaultBlockItems) => [
        ...defaultBlockItems,
        {
          name: "Task list",
          icon: <CheckboxIcon style={{ width: 18 }} />,
          isActive: () => editor?.isActive("taskList") ?? false,
          setActive: () => editor?.chain().focus().toggleTaskList().run(),
        },
      ]}
    />
  );
}
