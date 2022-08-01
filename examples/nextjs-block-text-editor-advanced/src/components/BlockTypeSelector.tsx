import { ReactNode } from "react";
import styles from "../../styles/BlockTypeSelector.module.css";
import { BlockNodeType, BlockProps, BlockType } from "../types";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

type Props = {
  children: ReactNode;
  setBlock: (block: BlockProps) => void;
  placeholder?: string;
};

export default function BlockTypeSelector({
  children,
  setBlock,
  placeholder = "Type to filter",
}: Props) {
  const groups = [
    {
      label: "Text",
      items: [
        {
          label: "Heading 1",
          description: "Large section heading",
          onSelect: () => {
            setBlock({
              type: BlockType.Text,
              node: {
                type: BlockNodeType.HeadingOne,
                children: [
                  {
                    type: BlockNodeType.Text,
                    text: "",
                  },
                ],
              },
            });
          },
        },
        {
          label: "Heading 2",
          description: "Medium section heading",
          onSelect: () => {
            setBlock({
              type: BlockType.Text,
              node: {
                type: BlockNodeType.HeadingTwo,
                children: [
                  {
                    type: BlockNodeType.Text,
                    text: "",
                  },
                ],
              },
            });
          },
        },
        {
          label: "Heading 3",
          description: "Small section heading",
          onSelect: () => {
            setBlock({
              type: BlockType.Text,
              node: {
                type: BlockNodeType.HeadingThree,
                children: [
                  {
                    type: BlockNodeType.Text,
                    text: "",
                  },
                ],
              },
            });
          },
        },
        {
          label: "Normal text",
          description: "Plain text",
          onSelect: () => {
            setBlock({
              type: BlockType.Text,
              node: {
                type: BlockNodeType.Paragraph,
                children: [
                  {
                    type: BlockNodeType.Text,
                    text: "",
                  },
                ],
              },
            });
          },
        },
      ],
    },
    {
      label: "Media",
      items: [
        {
          label: "Video",
          description: "Embed from YouTube",
          onSelect: () => {
            setBlock({
              type: BlockType.Video,
              url: null,
            });
          },
        },
        {
          label: "Image",
          description: "Embed from URL",
          onSelect: () => {
            setBlock({
              type: BlockType.Image,
              url: null,
            });
          },
        },
      ],
    },
  ];

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {children}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content className={styles.content}>
          {groups.map((group, indexGroup) => {
            return (
              <DropdownMenuPrimitive.Group
                key={indexGroup}
                className={styles.group}
              >
                <DropdownMenuPrimitive.Label className={styles.group_label}>
                  {group.label}
                </DropdownMenuPrimitive.Label>

                {groups[indexGroup].items.map((item, indexItem) => {
                  return (
                    <DropdownMenuPrimitive.DropdownMenuItem
                      className={styles.item}
                      key={indexItem}
                      onSelect={item.onSelect}
                    >
                      <span className={styles.item_label}>{item.label}</span>
                      <span className={styles.item_description}>
                        {item.description}
                      </span>
                    </DropdownMenuPrimitive.DropdownMenuItem>
                  );
                })}
              </DropdownMenuPrimitive.Group>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
