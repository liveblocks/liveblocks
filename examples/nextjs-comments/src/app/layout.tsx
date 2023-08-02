import "../styles/globals.css";
import "@liveblocks/react-comments/default.css";
import "@liveblocks/react-comments/default/dark/media-query.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
