import injected from "./hook";

const inject = async (tabId: number) => {
  chrome.scripting.executeScript(
    {
      target: {
        tabId,
      },
      world: "MAIN",
      func: injected,
    },
    () => {
      console.log("Background script got callback after injection");
    }
  );
};

chrome.tabs.onActivated.addListener((event) => {
  inject(event.tabId);
});
