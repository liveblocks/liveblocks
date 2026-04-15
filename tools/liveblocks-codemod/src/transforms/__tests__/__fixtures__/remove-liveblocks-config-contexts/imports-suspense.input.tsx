/* eslint-disable */
// @ts-nocheck
import { shallow, type JsonObject } from "@liveblocks/react";
import {
  useThreads,
  unknownVariable,
  useInboxNotifications,
  Storage,
} from "./liveblocks.config";
import { useOthers, type Presence } from "../liveblocks.config";
import { type CustomType, useEditThreadMetadata } from "/liveblocks.config";
import { RoomProvider } from "../../../liveblocks.config";
import type { UserMeta } from "src/liveblocks.config";
import { foo } from "./my.config";
import { bar } from "./config";
