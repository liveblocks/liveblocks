// "use client";

import React from "react";
import { CommentsProvider } from "../../../liveblocks.config";
import { Example } from "./Example";

export default function Home() {
  return (
    <CommentsProvider roomId="nextjs-comments">
      <Example />
    </CommentsProvider>
  );
}
