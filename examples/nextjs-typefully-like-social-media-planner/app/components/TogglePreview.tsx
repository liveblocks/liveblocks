"use client";

import { useMutation, useStorage } from "@liveblocks/react";

export function TogglePreview() {
  const publicPreview = useStorage((root) => root.publicPreview);

  const toggle = useMutation(({ storage }) => {
    const current = storage.get("publicPreview");
    storage.set("publicPreview", !current);
  }, []);

  if (publicPreview === null) {
    return null;
  }

  return (
    <label className="flex gap-1">
      Preview
      <input type="checkbox" checked={publicPreview} onChange={toggle} />
    </label>
  );
}
