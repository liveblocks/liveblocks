import { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import { expectError, expectType } from "tsd";

// Schema with various key types
type Schema = {
  required: string;
  optionalJson?: number;
  optionalString?: string;
  optionalArray?: number[];
  optionalObject?: { nested: string; count: number };
  optionalLiveObject?: LiveObject<{ x: number }>;
  optionalLiveList?: LiveList<number>;
  optionalLiveMap?: LiveMap<string, string>;
  optionalJsonOrUndefined: string | undefined;
};

declare const obj: LiveObject<Schema>;

// Allowed: optional Json keys
obj.setLocal("optionalJson", 42);
obj.setLocal("optionalString", "hello");
obj.setLocal("optionalJsonOrUndefined", "hello");
obj.setLocal("optionalArray", [1, 2, 3]);
obj.setLocal("optionalObject", { nested: "hi", count: 5 });

// Disallowed: required key (not optional)
expectError(obj.setLocal("required", "value"));

// Disallowed: optional LiveStructure keys
expectError(obj.setLocal("optionalLiveObject", new LiveObject({ x: 1 })));
expectError(obj.setLocal("optionalLiveList", new LiveList([1])));
expectError(obj.setLocal("optionalLiveMap", new LiveMap([["a", "b"]])));

// Disallowed: wrong value type
expectError(obj.setLocal("optionalJson", "not a number"));

// Disallowed: undefined as value
expectError(obj.setLocal("optionalJson", undefined));

// Disallowed: nonexistent key
expectError(obj.setLocal("nonexistent", 42));

// Return type of get() includes local values
expectType<number | undefined>(obj.get("optionalJson"));
expectType<string>(obj.get("required"));
