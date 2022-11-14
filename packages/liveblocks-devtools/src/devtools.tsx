import liveblocksPanelHTML from "url:./panel/index.html";
import browser from "webextension-polyfill";

browser.devtools.panels.create(
  "Liveblocks",
  null as unknown as string,
  // See: https://github.com/PlasmoHQ/plasmo/issues/106#issuecomment-1188539625
  liveblocksPanelHTML.split("/").pop()!
);

function Page() {
  return null;
}

export default Page;
