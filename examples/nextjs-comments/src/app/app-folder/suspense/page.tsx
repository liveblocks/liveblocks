// "use client";

import React from "react";
import { CommentsProvider } from "../../../../liveblocks.config";
import { ClientSideSuspense } from "../../../components/ClientSideSuspense";
import { Loading } from "../../../components/Loading";
import { Example } from "./Example";

export default function Home() {
  return (
    <CommentsProvider roomId="nextjs-comments">
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </CommentsProvider>
  );
}
