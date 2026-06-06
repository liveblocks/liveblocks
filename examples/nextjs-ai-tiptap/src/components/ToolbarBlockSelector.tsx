import { Toolbar } from "@liveblocks/react-tiptap";
import { Editor } from "@tiptap/react";
import { CheckboxIcon } from "@/icons";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor | null;
};

export function ToolbarBlockSelector({ editor }: Props) {
  return (
    <Toolbar.BlockSelector
      className={styles.blockSelector}
      items={(defaultBlockItems) => [
        ...defaultBlockItems,
        {
          name: "Task list",
          icon: <CheckboxIcon style={{ width: 17 }} />,
          isActive: () => editor?.isActive("taskList") ?? false,
          setActive: () => editor?.chain().focus().toggleTaskList().run(),
        },
      ]}
    />
  );
}
