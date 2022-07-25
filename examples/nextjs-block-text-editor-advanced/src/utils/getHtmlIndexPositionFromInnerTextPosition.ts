const getHtmlIndexPositionFromInnerTextPosition = (
  position: number,
  html: string,
  ignoreHtmlChars: boolean = false
): number => {
  // Matches between `<` and `>`, and also `&` and `;` if ignoreHtmlChars true
  const regex = ignoreHtmlChars ? /<(.*?)>|&(.*?);/g : /<(.*?)>/g;

  let newPos = position;
  let currentMatch;
  let currentOffset = 0;
  const tagSizesAtPosition: Record<string, string[]> = {};

  // Keep looking for HTML tags, record the length of them and their position relative to innerText
  // <em> is at position 6 and is 4 long:
  // `hello <em>world` => { "6": 4 }
  while ((currentMatch = regex.exec(html)) !== null) {
    currentOffset += currentMatch[0].length;
    const key = regex.lastIndex - currentOffset;

    // Add matched words to array in tagSizesAtPosition
    if (!tagSizesAtPosition[key]) {
      tagSizesAtPosition[key] = [currentMatch[0]];
    } else {
      tagSizesAtPosition[key].push(currentMatch[0]);
    }
  }

  let matches = 0;

  // If current position is more than a matched tag, add on the amount
  for (const [key, val] of Object.entries(tagSizesAtPosition)) {
    if (position > parseInt(key) + (ignoreHtmlChars && matches ? 1 : 0)) {
      if (ignoreHtmlChars && val.length > 1) {
        // Do something different here? This is when two entities touch
        // Currently this is adding together the length of the matched words at this position
        // And adding it to position counter
        newPos += val.reduce((prev, curr) => prev + curr.length, 0);
      } else {
        // Add length of matched word
        newPos += val[0].length;
      }
      matches++;
    }
  }

  return ignoreHtmlChars ? newPos - matches : newPos;
};

export default getHtmlIndexPositionFromInnerTextPosition;
