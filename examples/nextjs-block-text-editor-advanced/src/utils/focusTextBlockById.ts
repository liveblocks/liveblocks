const focusTextBlockById = (id: string, caretPosition?: number) => {
  setTimeout(() => {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.focus();

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    if (!caretPosition || !element.childNodes[0]) {
      return;
    }

    const range = document.createRange();
    range.setStart(element.childNodes[0], caretPosition);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, 80);
};

export default focusTextBlockById;
