export function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        style={{ width: 64, height: 64, opacity: 0.2 }}
      />
    </div>
  );
}
