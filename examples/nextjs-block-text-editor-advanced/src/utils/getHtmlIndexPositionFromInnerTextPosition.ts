import parseHtml from "./parseHtml";

const getHtmlIndexPositionFromInnerTextPosition = (
  position: number,
  html: string
): number => {
  // Fix escaped characters bug
  html = parseHtml(html);

  // Non-greedily matches anything between < and >
  const regex = /<(.*?)>/g;

  let newPos = position;
  let currentMatch;
  let currentOffset = 0;
  const tagSizesAtPosition: Record<string, number> = {};

  // Keep looking for HTML tags, record the length of them and their position relative to innerText
  // <em> is at position 6 and is 4 long:
  // `hello <em>world` => { "6": 4 }
  while ((currentMatch = regex.exec(html)) !== null) {
    currentOffset += currentMatch[0].length;
    const key = regex.lastIndex - currentOffset;

    if (!tagSizesAtPosition[key]) {
      tagSizesAtPosition[key] = currentMatch[0].length;
    } else {
      // If multiple tags at one location, accumulate
      tagSizesAtPosition[key] += currentMatch[0].length;
    }
  }

  // If current position is more than a matched tag, add on the amount
  for (const [key, val] of Object.entries(tagSizesAtPosition)) {
    if (position > parseInt(key)) {
      newPos += val;
    }
  }

  return newPos;
};

export default getHtmlIndexPositionFromInnerTextPosition;
