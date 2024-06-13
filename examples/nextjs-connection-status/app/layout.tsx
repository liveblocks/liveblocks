import { Providers } from "./Providers";
import "./globals.css";

export const metadata = {
  title: "Liveblocks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://liveblocks.io/favicon-32x32.png"
          rel="icon"
          sizes="32x32"
          type="image/png"
        />
        <link
          href="https://liveblocks.io/favicon-16x16.png"
          rel="icon"
          sizes="16x16"
          type="image/png"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

/**
 * Checking that your Liveblocks API key has been added
 * https://liveblocks.io/dashboard.apikeys
 */
const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-connection-status#codesandbox.`
  : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-connection-status#getting-started.`;

if (!API_KEY) {
  console.warn(API_KEY_WARNING);
}
