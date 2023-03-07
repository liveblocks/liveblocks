import { Room } from "@liveblocks/client";
import { LiveRoot } from "../src";

export type SlateTestStorage = {
	liveRoot: LiveRoot;
};

export type SlateTestPresence = {};

export type UnitTestRoom = Room<SlateTestPresence, SlateTestStorage, {}, {}>;
