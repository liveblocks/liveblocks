import getHtmlIndexPositionFromInnerTextPosition from "./getHtmlIndexPositionFromInnerTextPosition";

const insertHtmlAtPosition = (
  position: number,
  html: string,
  htmlToInsert: string
): string => {
  let newPosition = position;
  newPosition = getHtmlIndexPositionFromInnerTextPosition(position, html);

  return (
    html.substring(0, newPosition) + htmlToInsert + html.substring(newPosition)
  );
};

export default insertHtmlAtPosition;
