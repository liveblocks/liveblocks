import styles from "../../styles/Document.module.css";
import Header from "./Header";
import { BlockNodeType, BlockProps, BlockType, Storage } from "../types";
import Container from "./Container";
import Block from "./Block";
import classNames from "classnames";
import DocumentTitle from "./DocumentTitle";
import { useEffect, useState } from "react";
import focusTextBlockById from "../utils/focusTextBlockById";
import { ID_TITLE_BLOCK } from "../constants";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LiveObject } from "@liveblocks/client";
import { useHistory, useUpdateMyPresence } from "../liveblocks.config";
import isBlockTopLevelNodeEmpty from "../utils/isBlockTopLevelNodeEmpty";
import useInsertBlockAtIndex from "../hooks/useInsertBlockAtIndex";

export default function Document({ meta, blocks, blockIds }: Storage) {
  const [draggingBlock, setDraggingBlock] = useState<{
    blockId: string;
    block: LiveObject<BlockProps>;
  } | null>(null);

  const history = useHistory();
  const updateMyPresence = useUpdateMyPresence();
  const insertBlockAtIndex = useInsertBlockAtIndex();

  useEffect(() => {
    if (!blockIds.length) {
      focusTextBlockById(ID_TITLE_BLOCK);
    }
  }, [blockIds]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const handleOnKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "z":
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              history.redo();
            } else {
              history.undo();
            }
            break;
          }
      }
    };

    document.addEventListener("keydown", handleOnKeyDown);

    return () => {
      document.removeEventListener("keydown", handleOnKeyDown);
    };
  });

  useEffect(() => {
    const onWindowBlur = () => {
      updateMyPresence({ textSelection: null, selectedBlockIds: [] });
    };

    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("blur", onWindowBlur);
    };
  });

  return (
    <div
      className={styles.block_text_editor}
      onClick={() => {
        // When clicking at the bottom of the document will
        // either create a new text block at the bottom or focus
        // on the last one if it's empty
        const blockIdsLength = blockIds.toArray().length;
        const lastBlockId = blockIds.get(blockIdsLength - 1);
        const lastBlock =
          lastBlockId !== undefined ? blocks.get(lastBlockId) : null;

        if (
          lastBlockId &&
          lastBlock &&
          isBlockTopLevelNodeEmpty(lastBlock.get("node"))
        ) {
          focusTextBlockById(lastBlockId);
          return;
        }

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
          blockIdsLength
        );
      }}
    >
      <Header />

      <div
        className={classNames(styles.prose, "prose")}
        onClick={(e) => e.stopPropagation()}
      >
        <Container>
          <DocumentTitle meta={meta} />
          <DndContext
            sensors={sensors}
            onDragStart={(event) => {
              const { active } = event;

              const blockId = blockIds?.find(
                (blockId) => blockId === active.id
              );

              if (!blockId) {
                return;
              }

              const block = blocks.get(blockId);

              if (!block) {
                return;
              }

              setDraggingBlock({
                blockId,
                block,
              });
            }}
            onDragEnd={(event) => {
              const { active, over } = event;

              if (blockIds && over && active.id !== over.id) {
                const oldIndex = blockIds.findIndex(
                  (blockId) => blockId === active.id
                );
                const newIndex = blockIds.findIndex(
                  (blockId) => blockId === over.id
                );

                blockIds.move(oldIndex, newIndex);
              }

              setDraggingBlock(null);
            }}
          >
            <SortableContext
              items={blockIds.toArray()}
              strategy={verticalListSortingStrategy}
            >
              {blockIds.map((blockId) => {
                const block = blocks.get(blockId);

                if (block == null) {
                  return null;
                }

                return <Block key={blockId} block={block} blockId={blockId} />;
              })}
            </SortableContext>
            <DragOverlay>
              {draggingBlock && (
                <Block
                  block={draggingBlock.block}
                  blockId={draggingBlock.blockId}
                />
              )}
            </DragOverlay>
          </DndContext>
        </Container>
      </div>
    </div>
  );
}
