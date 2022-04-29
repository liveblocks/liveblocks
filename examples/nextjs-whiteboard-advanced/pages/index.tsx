import React from "react";
import Whiteboard from "../src";

export default function Home() {
  return (
    <main>
      <Whiteboard />
    </main>
  );
}

export async function getStaticProps() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    if (process.env.CODESANDBOX_SSE) {
      throw new Error(
        `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
          `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-whiteboard#codesandbox.`
      );
    } else {
      throw new Error(
        `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
          `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-whiteboard#getting-started.`
      );
    }
  }

  return { props: {} };
}
