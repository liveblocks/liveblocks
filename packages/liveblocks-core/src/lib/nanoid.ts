// Inlined version of 3.3.7 of nanoid.js
// https://www.npmjs.com/package/nanoid/v/3.3.7?activeTab=code
export const nanoid = (t = 21): string =>
  crypto
    .getRandomValues(new Uint8Array(t))
    .reduce(
      (t, e) =>
        (t +=
          (e &= 63) < 36
            ? e.toString(36)
            : e < 62
              ? (e - 26).toString(36).toUpperCase()
              : e < 63
                ? "_"
                : "-"),
      ""
    );
