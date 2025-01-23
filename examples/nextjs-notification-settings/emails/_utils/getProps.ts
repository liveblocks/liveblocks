export const getProps = <P>(external: P, preview: P): P => {
  if (!external || Object.keys(external).length <= 0) {
    return preview;
  }

  return external;
};
