export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

export function toPairs<T>(arr: T[]): T[][] {
  let pairs: T[][] = [];

  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }

  return pairs;
}

const USER_COLORS = [
  "#EC5E41",
  "#F2555A",
  "#F04F88",
  "#E34BA9",
  "#BD54C6",
  "#9D5BD2",
  "#7B66DC",
  "#5373E6",
  "#369EFF",
  "#02B1CC",
  "#11B3A3",
  "#39B178",
  "#55B467",
  "#FF802B",
];

export function connectionIdToColor(id: number) {
  return USER_COLORS[id % USER_COLORS.length];
}
