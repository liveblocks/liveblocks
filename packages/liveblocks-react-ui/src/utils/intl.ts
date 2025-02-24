import { memoize } from "./memoize";

// Avoid creating Intl formatters on every invocation.

export const dateTimeFormat = memoize(
  (...args: ConstructorParameters<(typeof Intl)["DateTimeFormat"]>) => {
    return new Intl.DateTimeFormat(...args);
  }
);

export const relativeTimeFormat = memoize(
  (...args: ConstructorParameters<(typeof Intl)["RelativeTimeFormat"]>) => {
    return new Intl.RelativeTimeFormat(...args);
  }
);

export const listFormat = memoize(
  (...args: ConstructorParameters<(typeof Intl)["ListFormat"]>) => {
    return new Intl.ListFormat(...args);
  }
);

export const numberFormat = memoize(
  (...args: ConstructorParameters<(typeof Intl)["NumberFormat"]>) => {
    return new Intl.NumberFormat(...args);
  }
);
