import React from "react";
import Head from "next/head";
import SingleLineCodeBlock from "../components/SingleLineCodeBlock";
import InlineCodeBlock from "../components/InlineCodeBlock";

import Avatar from "./avatars"

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
    <div>
      <Head>
        <title>Liveblocks</title>
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
      </Head>
        {hasSetupLiveblocksKey ? (
          <main>
            <Avatar />
          </main>
        ) : isRunningOnCodeSandbox ? (
          <main className="container mx-auto px-8">
          <h1 className="text-3xl font-semibold mt-24 mb-2">
            Welcome to Liveblocks Next.js live avatars examples
          </h1>
            <p className="mt-12 mb-6">
              To run{" "}
              <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
                Liveblocks
              </a>{" "}
              examples on CodeSandbox
            </p>
            <ul className="list-disc list-inside">
              <li className="mb-2">
                Create an account on{" "}
                <a
                  href="https://liveblocks.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  liveblocks.io
                </a>
              </li>
              <li className="mb-2">
                Copy your secret key from the administration
              </li>
              <li className="mb-2">
                Add a{" "}
                <a
                  href="https://codesandbox.io/docs/secrets"
                  target="_blank"
                  rel="noreferrer"
                >
                  secret key
                </a>{" "}
                named <InlineCodeBlock>LIVEBLOCKS_SECRET_KEY</InlineCodeBlock>{" "}
                to your CodeSandbox sandbox.
              </li>
              <li className="mb-2">
                Refresh your browser and you should be good to go!
              </li>
            </ul>
          </main>
        ) : (
          <main className="container mx-auto px-8">
          <h1 className="text-3xl font-semibold mt-24 mb-2">
            Welcome to Liveblocks Next.js live avatars examples
          </h1>
            <p className="mt-12 mb-6">
              To run{" "}
              <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
                Liveblocks
              </a>{" "}
              examples locally
            </p>
            <ul className="list-disc list-inside">
              <li className="mb-2">
                Install all dependencies with{" "}
                <SingleLineCodeBlock>npm install</SingleLineCodeBlock>
              </li>
              <li className="mb-2">
                Create an account on{" "}
                <a
                  href="https://liveblocks.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  liveblocks.io
                </a>
              </li>
              <li className="mb-2">
                Copy your secret key from the administration
              </li>
              <li className="mb-2">
                Create a file named{" "}
                <InlineCodeBlock>.env.local</InlineCodeBlock> and add your
                Liveblocks secret as environment variable{" "}
                <SingleLineCodeBlock>
                  LIVEBLOCKS_SECRET_KEY=sk_test_yourkey
                </SingleLineCodeBlock>
              </li>
              <li className="mb-2">
                Run the following command and you should be good to go
                <SingleLineCodeBlock>npm run dev</SingleLineCodeBlock>
              </li>
            </ul>
          </main>
        )}
    </div>
  );
}
