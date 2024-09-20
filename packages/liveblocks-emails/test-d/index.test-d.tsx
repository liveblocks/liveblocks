import React from "react";
React; // To silence tsd warning

import { hey } from "@liveblocks/emails";
import { expectType } from "tsd";

// Perform type-level checks
expectType<"👋">(hey);
