import styles from "../../styles/DocumentTitle.module.css";
import { BlockType, DocumentMeta } from "../types";
import classNames from "classnames";
import { LiveObject } from "@liveblocks/client";
import { useList, useUpdateMyPresence } from "../liveblocks.config";
import { ID_TITLE_BLOCK, MAX_TITLE_LENGTH } from "../constants";
import useInsertBlockAtIndex from "../hooks/useInsertBlockAtIndex";
import focusTextBlockById from "../utils/focusTextBlockById";
import { BlockNodeType } from "../types";
import { createRef } from "react";

type Props = {
  meta: LiveObject<DocumentMeta>;
};

export default function DocumentTitle({ meta }: Props) {
  const ref = createRef<HTMLTextAreaElement>();
  const { title } = meta.toObject();
  const insertBlockAtIndex = useInsertBlockAtIndex();
  const blockIds = useList("blockIds");
  const setPresence = useUpdateMyPresence();

  return (
    <div
      className={classNames(styles.container, "title")}
      onClick={(e) => {
        // We stop propagation so that clicking here won't deselect all blocks
        e.stopPropagation();
      }}
    >
      <div
        className={styles.grow_wrap}
        data-replicated-value={title ? title : "Untitled"}
      >
        <textarea
          ref={ref}
          id={ID_TITLE_BLOCK}
          spellCheck={false}
          className={styles.textarea}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => {
            const element = ref.current;
            if (!element) {
              return;
            }
            meta.set("title", element.value);
          }}
          onFocus={() => {
            setPresence({ selectedBlockIds: [] });
          }}
          value={title ? title : ""}
          onKeyDown={(e) => {
            switch (e.key) {
              case "Enter":
                e.preventDefault();
                insertBlockAtIndex(
                  {
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
                  },
                  0
                );
                break;

              case "ArrowDown":
                e.preventDefault();
                const id = blockIds?.get(0);
                if (id) {
                  focusTextBlockById(id);
                }
                break;

              // Making sure this doesn't trigger global undo/redo
              case "z":
                if (e.ctrlKey || e.metaKey) {
                  e.stopPropagation();
                  break;
                }
            }
          }}
        />
      </div>

      {(!title || title === "") && (
        <div className={classNames(styles.placeholder, "placeholder")}>
          Untitled
        </div>
      )}
    </div>
  );
}
