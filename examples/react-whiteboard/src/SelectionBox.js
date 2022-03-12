import { memo } from "react";

const SelectionBox = memo(({ bounds, isAnimated }) => {
  return (
    <>
      <rect
        className="selection"
        style={{
          transition: isAnimated ? "all 0.1s ease" : "",
          transform: `translate(${bounds.x}px, ${bounds.y}px)`,
        }}
        x={0}
        y={0}
        width={bounds.width}
        height={bounds.height}
      />
    </>
  );
});

export default SelectionBox;
