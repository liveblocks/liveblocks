import { createRoot } from "react-dom/client";
import { Tabs } from "./components/Tabs";
import { Debug } from "./tabs/debug";
import { ThemeProvider } from "./theme";

function Panel() {
  return (
    <ThemeProvider>
      <Tabs
        className="h-full"
        defaultValue="debug"
        tabs={[
          {
            value: "debug",
            title: "Debug",
            content: <Debug />,
          },
          {
            value: "storage",
            title: "Storage",
            content: null,
          },
          {
            value: "presence",
            title: "Presence",
            content: null,
          },
          {
            value: "history",
            title: "History",
            content: null,
          },
          {
            value: "events",
            title: "Events",
            content: null,
          },
        ]}
      />
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<Panel />);
