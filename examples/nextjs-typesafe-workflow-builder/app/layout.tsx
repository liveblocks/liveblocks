import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-flow/styles.css";
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Workflow builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
