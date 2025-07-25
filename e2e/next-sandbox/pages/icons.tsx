import * as LiveblocksReactUiPrivateExports from "@liveblocks/react-ui/_private";
import type { ComponentType, CSSProperties } from "react";

// This page is used to visualize all icons currently available
// in the `@liveblocks/react-ui` package.
export default function Page() {
  const icons = Object.entries(LiveblocksReactUiPrivateExports).filter(
    ([name]) => name.endsWith("Icon")
  );

  return (
    <div>
      <h1>
        All <code>@liveblocks/react-ui</code> icons
      </h1>

      <ul
        style={
          {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            listStyle: "none",
            padding: 0,
            margin: 0,
            gap: 16,
            "--lb-background": "#fff",
            "--lb-dynamic-background": "#fff",
          } as CSSProperties
        }
      >
        {icons.map(([name, value]) => {
          const Icon = value as ComponentType;

          return (
            <li
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
                aspectRatio: 1,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    outline: "1px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: 2,
                  }}
                >
                  <Icon />
                </div>
              </div>
              <span
                title={name}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                {name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
