type CursorProps = {
  x: number;
  y: number;
  avatar: string;
};

export default function Cursor({ x, y, avatar }: CursorProps) {
  return (
    <div
      className="cursor"
      style={{
        transform: `translate(${x}px, ${y}px`,
        transition: "transform 120ms linear",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <defs>
          <filter id="avatar-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
          </filter>
          <pattern
            id="avatar-image"
            filter="url(#avatar-blur)"
            patternUnits="userSpaceOnUse"
            width="100"
            height="100"
          >
            <image href={avatar} x="0" y="0" width="100" height="100" />
          </pattern>
        </defs>
        <path
          d="m13.67 6.03-11-4a.5.5 0 0 0-.64.64l4 11a.5.5 0 0 0 .935.015l1.92-4.8 4.8-1.92a.5.5 0 0 0 0-.935h-.015Z"
          fill="url(#avatar-image)"
        />
      </svg>
    </div>
  );
}
