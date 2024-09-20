import "@/styles/globals.css";
import { Providers } from "./Providers";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const HAS_OPENAI_KEY = process.env.OPENAI_API_KEY;
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
          <Suspense>{children}</Suspense>
          {!HAS_OPENAI_KEY ? (
            <div className="no-key">
              <div>
                <h2>OpenAI API key required</h2>
                <p>
                  To run this example, download the project and add your OpenAI
                  API key to <code>.env.local</code>
                </p>
                <pre>
                  <code>
                    OPENAI_API_KEY=sk-...
                    <br />
                    LIVEBLOCKS_SECRET_KEY=sk_...
                    <br />
                    LIVEBLOCKS_WEBHOOK_SECRET_KEY=whsec...
                  </code>
                </pre>
                <p>
                  <a href={"https://platform.openai.com/api-keys"}>
                    Create your OpenAI API key here
                  </a>
                </p>
              </div>
            </div>
          ) : null}
        </Providers>
      </body>
    </html>
  );
}
