import { ReactNode } from "react";
import styles from "../../styles/BlockTypeSelector.module.css";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { nanoid } from "nanoid";
import { CustomElement } from "./types";

type Props = {
  children: ReactNode;
  setBlock: (block: CustomElement) => void;
};

export default function BlockTypeSelector({
  children,
  setBlock,
}: Props) {
  const groups = [
    {
      label: "Text",
      items: [
        {
          label: "Normal text",
          description: "Plain text",
          onSelect: () => {
            setBlock({
              id: nanoid(),
              type: "paragraph",
              children: [
                {
                  text: "",
                },
              ],
            })
          },
        },
      ],
    },
    {
      label: "Media",
      items: [
        {
          label: "Image",
          description: "Embed from URL",
          onSelect: () => {
            setBlock({
              id: nanoid(),
              type: "image",
              url: null,
              children: [{ text:"" }],
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
