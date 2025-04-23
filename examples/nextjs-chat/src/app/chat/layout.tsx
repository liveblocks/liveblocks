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
