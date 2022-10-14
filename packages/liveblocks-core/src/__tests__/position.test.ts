import { makePosition, max, min, pos, posCodes } from "../lib/position";

const mid = (min + max) >> 1;

function testPosition(
  before: string | undefined,
  after: string | undefined,
  expected: string
) {
  const result = makePosition(before, after);
  expect(posCodes(result)).toEqual(posCodes(expected));
}

describe("makePosition", () => {
  test("No children", () => testPosition(undefined, undefined, pos([min + 1])));

  test("Insert after .1", () =>
    testPosition(pos([min + 1]), undefined, pos([min + 2])));

  test("Insert before .9", () =>
    testPosition(undefined, pos([max]), pos([max - 1])));

  test("Insert after .9", () =>
    testPosition(pos([max]), undefined, pos([max, min + 1])));

  test("Insert before .1", () =>
    testPosition(undefined, pos([min + 1]), pos([min, max])));

  test("Insert between .1 and .3", () =>
    testPosition(pos([min + 1]), pos([min + 3]), pos([min + 2])));

  test("Insert between .1 and .5", () =>
    testPosition(pos([min + 1]), pos([min + 5]), pos([min + 3])));

  test("Insert between .1 and .4", () =>
    testPosition(pos([min + 1]), pos([min + 4]), pos([min + 2])));

  test("Insert between .1 and .2", () =>
    testPosition(pos([min + 1]), pos([min + 2]), pos([min + 1, mid])));

  test("Insert between .11 and .12", () =>
    testPosition(
      pos([min + 1, min + 1]),
      pos([min + 1, min + 2]),
      pos([min + 1, min + 1, mid])
    ));

  test("Insert between .09 and .1 should .095", () =>
    testPosition(pos([min, max]), pos([min + 1]), pos([min, max, mid])));

  test("Insert between .19 and .21 should be .195", () =>
    testPosition(
      pos([min + 1, max]),
      pos([min + 2, min + 1]),
      pos([min + 1, max, mid])
    ));

  test("Insert between .11 and .21 should be .15", () =>
    testPosition(
      pos([min + 1, min + 1]),
      pos([min + 2, min + 1]),
      pos([min + 1, (min + 1 + max) >> 1])
    ));
});
