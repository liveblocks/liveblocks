import "@liveblocks/lexical/styles.css";
import "@liveblocks/react-ui/styles.css";
import "./globals.css";

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-950 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
