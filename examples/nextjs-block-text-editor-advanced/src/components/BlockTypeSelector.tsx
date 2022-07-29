import classNames from "classnames";
import { createRef, useEffect, useRef, useState } from "react";
import styles from "../../styles/BlockTypeSelector.module.css";
import { BlockNodeType, BlockType } from "../types";
import { ScrollArea } from "./ScrollArea";
import { useMap } from "../liveblocks.config";
import { LiveObject } from "@liveblocks/client";

type Props = {
  blockId: string;
  placeholder?: string;
};

export default function BlockTypeSelector({
  blockId,
  placeholder = "Type '/' to insert block",
}: Props) {
  const inputRef = createRef<HTMLInputElement>();
  const [search, setSearch] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<[number, number] | null>(
    null
  );

  const blocks = useMap("blocks");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const groups = [
    {
      label: "Text",
      items: [
        {
          label: "Heading 1",
          description: "Large section heading",
          onSelect: () => {
            blocks?.set(
              blockId,
              new LiveObject({
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
              })
            );
          },
        },
        {
          label: "Heading 2",
          description: "Medium section heading",
          onSelect: () => {
            blocks?.set(
              blockId,
              new LiveObject({
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
              })
            );
          },
        },
        {
          label: "Heading 3",
          description: "Small section heading",
          onSelect: () => {
            blocks?.set(
              blockId,
              new LiveObject({
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
              })
            );
          },
        },
        {
          label: "Normal text",
          description: "Plain text",
          onSelect: () => {
            blocks?.set(
              blockId,
              new LiveObject({
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
              })
            );
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
            blocks?.set(
              blockId,
              new LiveObject({
                type: BlockType.Video,
                url: null,
              })
            );
          },
        },
      ],
    },
  ];

  const selectPreviousItem = () => {
    if (!selectedItem) {
      setSelectedItem([
        groups.length - 1,
        groups[groups.length - 1].items.length - 1,
      ]);
      return;
    }

    const [indexGroup, indexItem] = selectedItem;

    if (indexItem > 0) {
      setSelectedItem([indexGroup, indexItem - 1]);
      return;
    }

    if (indexGroup > 0) {
      setSelectedItem([
        indexGroup - 1,
        groups[indexGroup - 1].items.length - 1,
      ]);
      return;
    }

    setSelectedItem([
      groups.length - 1,
      groups[groups.length - 1].items.length - 1,
    ]);
  };

  const selectNextItem = () => {
    if (!selectedItem) {
      setSelectedItem([0, 0]);
      return;
    }

    const [indexGroup, indexItem] = selectedItem;

    if (indexItem < groups[indexGroup].items.length - 1) {
      setSelectedItem([indexGroup, indexItem + 1]);
      return;
    }

    if (indexGroup < groups.length - 1) {
      setSelectedItem([indexGroup + 1, 0]);
      return;
    }

    setSelectedItem([0, 0]);
  };

  return (
    <span className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={search}
        className={styles.input}
        spellCheck={false}
        onKeyDown={(e) => {
          switch (e.key) {
            case "Tab":
              e.preventDefault();
              break;

            case "ArrowDown":
              e.preventDefault();
              selectNextItem();
              break;

            case "ArrowUp":
              e.preventDefault();
              selectPreviousItem();
              break;

            case "Enter":
              if (!selectedItem) {
                break;
              }

              e.preventDefault();
              groups[selectedItem[0]].items[selectedItem[1]].onSelect();
              break;
          }
        }}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setSearch(value);
        }}
        placeholder={placeholder}
      />

      <div
        className={styles.content}
        onPointerLeave={(e) => {
          setSelectedItem(null);
        }}
      >
        <ScrollArea className={styles.scroll_area}>
          {groups.map((group, indexGroup) => {
            const filteredItems = group.items.filter((item) => {
              return (
                item.label.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase()) ||
                group.label.toLowerCase().includes(search.toLowerCase())
              );
            });

            return (
              filteredItems.length > 0 && (
                <div key={indexGroup} className={styles.group}>
                  <div className={styles.group_label}>{group.label}</div>

                  {filteredItems.map((item, indexItem) => {
                    return (
                      <button
                        className={classNames(styles.item, {
                          [styles.item_selected]:
                            selectedItem &&
                            selectedItem[0] === indexGroup &&
                            selectedItem[1] === indexItem,
                        })}
                        key={indexItem}
                        onPointerUp={item.onSelect}
                        onPointerEnter={(e) => {
                          setSelectedItem([indexGroup, indexItem]);
                        }}
                      >
                        <span className={styles.item_label}>{item.label}</span>
                        <span className={styles.item_description}>
                          {item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            );
          })}
        </ScrollArea>
      </div>
    </span>
  );
}
