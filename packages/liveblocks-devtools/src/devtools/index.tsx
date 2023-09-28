// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import liveblocksPanelHTML from "url:./panel.html";
import browser from "webextension-polyfill";

void browser.devtools.panels.create(
  "Liveblocks",
  "",
  // See: https://github.com/PlasmoHQ/plasmo/issues/106#issuecomment-1188539625
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  liveblocksPanelHTML.split("/").pop()!
);

function Page() {
  return null;
}

export default Page;
