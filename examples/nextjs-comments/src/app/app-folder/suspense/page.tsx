// "use client";

import React, { Suspense } from "react";
import { CommentsProvider } from "../../../../liveblocks.config";
import { Loading } from "../../../components/Loading";
import { Example } from "./Example";

export default function Home() {
  return (
    <CommentsProvider roomId="nextjs-comments">
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </CommentsProvider>
  );
}
