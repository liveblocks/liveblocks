import React from "react";
import Head from "next/head";
import Whiteboard from "../src";

export async function getStaticProps() {
  return {
    props: {
      isRunningOnCodeSandbox: process.env.CODESANDBOX_SSE != null,
      hasSetupLiveblocksKey: process.env.LIVEBLOCKS_SECRET_KEY != null,
    },
  };
}

type Props = {
  hasSetupLiveblocksKey: boolean;
  isRunningOnCodeSandbox: boolean;
};

export default function Home({
  hasSetupLiveblocksKey,
  isRunningOnCodeSandbox,
}: Props) {
  return (
    <main>
      <Whiteboard />
    </main>
  );
}
