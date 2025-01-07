/* eslint-disable no-restricted-syntax */

import { useEffect, useLayoutEffect as useOriginalLayoutEffect } from "react";

// On React 18.2.0 and earlier, useLayoutEffect triggers a warning when
// executed on the server, so this workaround should be used instead.
export const useLayoutEffect =
  typeof window !== "undefined" ? useOriginalLayoutEffect : useEffect;
