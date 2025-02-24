export function pluralize<
  C extends number,
  S extends string,
  P extends string = `${S}s`,
>(count: C, singular: S, plural?: P): C extends 1 ? S : P {
  return (count === 1 ? singular : (plural ?? `${singular}s`)) as C extends 1
    ? S
    : P;
}
