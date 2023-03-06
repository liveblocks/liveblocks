import type { Operation } from "slate";

export type PendingChange = {
	op: Operation;
} & Record<string, unknown>;
