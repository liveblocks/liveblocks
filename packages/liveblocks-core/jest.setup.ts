jest.mock("./src/lib/get-base-url", () => {
  const { DEFAULT_BASE_URL } = jest.requireActual("./src/constants");

  return {
    getBaseUrl: (baseUrl: string | undefined) => baseUrl || DEFAULT_BASE_URL,
  };
});
