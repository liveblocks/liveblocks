import { describe, expect, test } from "vitest";

import type { ClientWireOp } from "../../protocol/Op";
import { OpCode } from "../../protocol/Op";
import { UnacknowledgedOps } from "../UnacknowledgedOps";

describe("UnacknowledgedOps", () => {
  test("indexes pending CreateTextOps by parent and position", () => {
    const unacked = new UnacknowledgedOps();

    const createTextOp: ClientWireOp = {
      type: OpCode.CREATE_TEXT,
      opId: "1:0",
      id: "1:1",
      parentId: "0:0",
      parentKey: "!",
      data: [["Hello"]],
      version: 0,
    };
    unacked.add(createTextOp);

    expect(unacked.get("1:0")).toBe(createTextOp);
    expect(Array.from(unacked.getByParentId("0:0"))).toEqual([createTextOp]);
    expect(Array.from(unacked.getByParentIdAndKey("0:0", "!"))).toEqual([
      createTextOp,
    ]);

    unacked.delete("1:0");

    expect(unacked.get("1:0")).toBeUndefined();
    expect(Array.from(unacked.getByParentId("0:0"))).toEqual([]);
    expect(Array.from(unacked.getByParentIdAndKey("0:0", "!"))).toEqual([]);
  });

  test("does not index non-create ops by position", () => {
    const unacked = new UnacknowledgedOps();

    const updateTextOp: ClientWireOp = {
      type: OpCode.UPDATE_TEXT,
      opId: "1:0",
      id: "1:1",
      baseVersion: 0,
      ops: [{ type: "insert", index: 0, text: "x" }],
    };
    unacked.add(updateTextOp);

    expect(unacked.get("1:0")).toBe(updateTextOp);
    expect(Array.from(unacked.getByParentId("0:0"))).toEqual([]);

    unacked.delete("1:0");
    expect(unacked.size).toBe(0);
  });
});
