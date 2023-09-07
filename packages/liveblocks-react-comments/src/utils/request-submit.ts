/**
 * Ponyfill for `HTMLFormElement.requestSubmit`.
 */
export function requestSubmit(
  form: HTMLFormElement,
  submitter?: HTMLElement | null
) {
  if (typeof form.requestSubmit === "function") {
    return form.requestSubmit(submitter);
  }

  if (submitter) {
    submitter.click();
  } else {
    submitter = document.createElement("input");
    (submitter as HTMLInputElement).type = "submit";
    submitter.hidden = true;

    form.appendChild(submitter);

    submitter.click();

    form.removeChild(submitter);
  }
}
