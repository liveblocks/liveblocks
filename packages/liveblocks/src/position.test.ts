import { posCodes, makePosition, pos, min, max, mid, middle } from "./position";

function testLink(a: string, b: string) {
  expect(posCodes(a)).toEqual(posCodes(b));
}

describe("makePosition", () => {
  test("No children", () => testLink(makePosition(), pos([min + 1])));

  test("Insert after .1", () =>
    testLink(makePosition(pos([min + 1])), pos([min + 2])));

  test("Insert before .9", () =>
    testLink(makePosition(undefined, pos([max - 1])), pos([max - 2])));

  test("Insert after .9", () =>
    testLink(makePosition(pos([max - 1])), pos([max - 1, min + 1])));

  test("Insert before .1", () =>
    testLink(makePosition(undefined, pos([min + 1])), pos([min, max - 1])));

  test("Insert between .1 and .3", () =>
    testLink(makePosition(pos([min + 1]), pos([min + 3])), pos([min + 2])));

  test("Insert between .1 and .5", () =>
    testLink(makePosition(pos([min + 1]), pos([min + 5])), pos([min + 3])));

  test("Insert between .1 and .4", () =>
    testLink(makePosition(pos([min + 1]), pos([min + 4])), pos([min + 2])));

  test("Insert between .1 and .2", () =>
    testLink(
      makePosition(pos([min + 1]), pos([min + 2])),
      pos([min + 1, mid])
    ));

  test("Insert between .11 and .12", () =>
    testLink(
      makePosition(pos([min + 1, min + 1]), pos([min + 1, min + 2])),
      pos([min + 1, min + 1, mid])
    ));

  test("Insert between .09 and .1 should .095", () =>
    testLink(
      makePosition(pos([min, max - 1]), pos([min + 1])),
      pos([min, max - 1, mid])
    ));

  test("Insert between .19 and .21 should be .195", () =>
    testLink(
      makePosition(pos([min + 1, max - 1]), pos([min + 2, min + 1])),
      pos([min + 1, max - 1, mid])
    ));

  test("Insert between .11 and .21 should be .15", () =>
    testLink(
      makePosition(pos([min + 1, min + 1]), pos([min + 2, min + 1])),
      pos([min + 1, Math.floor(middle(min + 1, max))])
    ));
});
