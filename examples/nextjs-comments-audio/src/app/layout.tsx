import cx from "classnames";
import { Inter } from "next/font/google";
import "../globals.css";

export const metadata = {
  title: "Liveblocks",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

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
      <body
        className={cx("bg-primary text-primary antialiased", inter.className)}
      >
        {children}
      </body>
    </html>
  );
}
