import { LiveblocksProvider } from "../../liveblocks.config";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { DOCUMENTS } from "../database";
import "../styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiveblocksProvider>
      <html lang="en">
        <head>
          <title>Liveblocks</title>
          <meta name="robots" content="noindex" />
          <meta
            name="viewport"
            content="width=device-width, user-scalable=no"
          />
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
          <main className="content">{children}</main>
          <Sidebar documents={DOCUMENTS} />
          <Header />
        </body>
      </html>
    </LiveblocksProvider>
  );
}
