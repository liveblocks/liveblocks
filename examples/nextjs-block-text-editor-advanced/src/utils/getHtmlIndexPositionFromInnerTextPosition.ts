const getHtmlIndexPositionFromInnerTextPosition = (
  position: number,
  html: string,
  ignoreHtmlChars: boolean = false
): number => {
  let offset = 0;
  let isParsingHTMLTag = false;
  let isParsingHTMLEntity = false;

  let i = 0;
  for (let char of html) {
    if (i - offset === position) {
      break;
    }

    if (ignoreHtmlChars === true && isParsingHTMLEntity) {
      if (char === ";") {
        isParsingHTMLEntity = false;
      } else {
        offset++;
      }
    } else if (ignoreHtmlChars === true && char === "&") {
      isParsingHTMLEntity = true;
      offset++;
    } else if (isParsingHTMLTag) {
      offset++;

      if (char === ">") {
        isParsingHTMLTag = false;
      }
    } else if (char === "<") {
      offset++;
      isParsingHTMLTag = true;
    }

    i++;
  }

  return position + offset;
};

export default getHtmlIndexPositionFromInnerTextPosition;
