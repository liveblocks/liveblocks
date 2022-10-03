import liveblocksPanelHTML from "url:./panel/index.html";

chrome.devtools.panels.create(
  "Liveblocks",
  null,
  // See: https://github.com/PlasmoHQ/plasmo/issues/106#issuecomment-1188539625
  liveblocksPanelHTML.split("/").pop()
);

function Page() {
  return null;
}

export default Page;
