import { useStorage } from "@liveblocks/react/suspense";

export function Cover() {
  const cover = useStorage((root) => root.cover);

  if (!cover) {
    return null;
  }

  return <div style={{ backgroundColor: cover, height: 300 }} />;
}
