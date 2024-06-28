"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { ChangeEvent } from "react";

export function DocumentName() {
  const title = useStorage((root) => root.title);

  const handleChange = useMutation(
    ({ storage }, e: ChangeEvent<HTMLInputElement>) => {
      storage.set("title", e.target.value);
    },
    []
  );

  return (
    <input
      type="text"
      value={title}
      onChange={handleChange}
      className="outline-none"
    />
  );
}
