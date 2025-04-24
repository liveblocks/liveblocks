import Link from "next/link";
import { LeftSidebar } from "./LeftSidebar";
import { Providers } from "./Providers";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <Providers>
        <div className="chat-app-container">
          <div className="chat-controls">
            <h1 className="logo">lbChat</h1>
            <LeftSidebar />
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "end",
                gap: 16,
              }}
            >
              <h3>
                <Link href="/">"Kitchen sink"</Link>
              </h3>
              <h3>
                <Link href="/todo">Todo app</Link>
              </h3>
              <h3>
                <Link href="/simple">Simple/clean chat</Link>
              </h3>
            </div>
          </div>
          <div
            className="chat-window-container"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {children}
          </div>
        </div>
      </Providers>
    </main>
  );
}
