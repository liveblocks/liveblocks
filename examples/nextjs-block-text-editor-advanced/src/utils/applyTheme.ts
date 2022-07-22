import { Theme } from "../types";

const applyTheme = (theme: Theme) => {
  const htmlElement = document.querySelector("html");
  if (!htmlElement) {
    return;
  }

  htmlElement.className = `theme-${theme}`;
};

export default applyTheme;
