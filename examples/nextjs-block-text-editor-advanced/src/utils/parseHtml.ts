import DOMPurify from "dompurify";

const parseHtml = (str: string): string => {
  return DOMPurify.sanitize(
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&#39;")
      .replace(/"/g, "&#34;")
  );
};

export default parseHtml;
