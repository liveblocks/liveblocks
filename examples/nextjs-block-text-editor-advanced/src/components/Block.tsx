import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LiveObject } from "@liveblocks/client";
import { memo, useState, useEffect, CSSProperties } from "react";
import { useRoom } from "../liveblocks.config";
import { BlockProps, BlockType } from "../types";
import BlockText from "./BlockText";
import BlockVideo from "./BlockVideo";
import BlockImage from "./BlockImage";
import BlockCodeSandbox from "./BlockCodeSandbox";
import styles from "../../styles/Block.module.css";

type Props = {
  blockId: string;
  block: LiveObject<BlockProps>;
};

const BlockComponent = memo(function BlockComponent({ blockId, block }: Props) {
  const [blockData, setBlockData] = useState(block.toObject());
  const room = useRoom();

  // Block is a nested LiveObject inside a LiveMap, so we need to subscribe to changes made to a specific block
  useEffect(() => {
    function onChange() {
      setBlockData(block.toObject());
    }

    return room.subscribe(block, onChange);
  }, [room, block]);

  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: blockId,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      className={styles.sortable_item}
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        // We stop propagation so that clicking here won't deselect all blocks
        e.stopPropagation();
      }}
    >
      {blockData.type === BlockType.Text && (
        <BlockText
          id={blockId}
          blockId={blockId}
          block={block}
          data={blockData}
        />
      )}

      {blockData.type === BlockType.Video && (
        <BlockVideo
          id={blockId}
          blockId={blockId}
          block={block}
          data={blockData}
        />
      )}

      {blockData.type === BlockType.Image && (
        <BlockImage
          id={blockId}
          blockId={blockId}
          block={block}
          data={blockData}
        />
      )}

      {blockData.type === BlockType.CodeSandbox && (
        <BlockCodeSandbox
          id={blockId}
          blockId={blockId}
          block={block}
          data={blockData}
        />
      )}
    </div>
  );
});

export default BlockComponent;
