import liveblocksPanelHTML from "url:./panels/liveblocks/index.html";

chrome.devtools.panels.create(
  "Liveblocks",
  null,
  // See: https://github.com/PlasmoHQ/plasmo/issues/106#issuecomment-1188539625
  liveblocksPanelHTML.split("/").pop()
);

function Devtools() {
  // TODO: Investigate if necessary.
  //       It used to include a welcome message/page.
  return null;
}

export default Devtools;
