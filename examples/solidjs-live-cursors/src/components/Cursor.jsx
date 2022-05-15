import { spring } from "motion";
import { Motion } from "@motionone/solid";

// Custom spring animation for smooth cursor
const springAnimation = spring({ damping: 30, stiffness: 200, mass: 0.5 });

export default function Cursor(props) {
  return (
    <Motion
      initial={false}
      animate={{ x: props.x, y: props.y }}
      transition={{ easing: springAnimation }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
      }}
    >
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={props.color}
        />
      </svg>
    </Motion>
  );
}
