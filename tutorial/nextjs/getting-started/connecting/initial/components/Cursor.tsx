type CursorProps = {
  x: number;
  y: number;
  picture: string;
};

export default function Cursor({ x, y, picture }: CursorProps) {
  return (
    <div className="cursor" style={{ transform: `translate(${x}px, ${y}px` }}>
      <svg width="32" height="44" viewBox="0 0 24 36" fill="none">
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
            <image href={picture} x="0" y="0" width="100" height="100" />
          </pattern>
        </defs>
        <path
          fill="url(#avatar-image)"
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
        />
      </svg>
    </div>
  );
}
