import { Format } from "../types";

const applyFormatToSelection = (
  selection: Selection | null,
  format: Format
) => {
  if (!selection) {
    return;
  }

  document.execCommand(format);
};

export default applyFormatToSelection;
