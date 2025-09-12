import "@testing-library/jest-dom/vitest";

// Workaround to avoid `@testing-library/react` warnings about `act()`
// https://github.com/testing-library/react-testing-library/issues/1061
global.IS_REACT_ACT_ENVIRONMENT = true;
