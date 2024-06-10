import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { getRooms } from "../database";
import "../styles/globals.css";
import { Providers } from "./Providers";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rooms = await getRooms();

  return (
    <html lang="en">
      <head>
        <title>Liveblocks</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, user-scalable=no" />
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
        <Providers>
          <main className="content">{children}</main>
          <Sidebar rooms={rooms} />
          <Header />
        </Providers>
      </body>
    </html>
  );
}
