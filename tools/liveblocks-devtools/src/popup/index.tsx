import "./styles.css";

import { Loading } from "../components/Loading";
import { ThemeProvider } from "../contexts/Theme";

const LOADING_SIZE = 48;

function Popup() {
  return (
    <div className="flex items-center gap-3 py-5 px-7">
      <Loading
        width={LOADING_SIZE}
        height={LOADING_SIZE}
        className="-ml-3 flex-none"
      />
      <p className="text-dark-500 dark:text-light-800 min-w-[240px]">
        <strong className="font-medium">Liveblocks DevTools</strong> can be
        found as a new tab in your browser’s developer&nbsp;tools.
      </p>
    </div>
  );
}

export default function PopupApp() {
  return (
    <ThemeProvider>
      <Popup />
    </ThemeProvider>
  );
}
