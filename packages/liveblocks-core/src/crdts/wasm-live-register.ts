/**
 * Self-registering module: imports the three WASM LiveNode classes and
 * registers them with wasm-live-helpers so that resolveEntry() can
 * construct the right wrapper.
 *
 * Import this module once at WASM initialization time.
 */

import { WasmLiveList } from "./WasmLiveList";
import { WasmLiveMap } from "./WasmLiveMap";
import { WasmLiveObject } from "./WasmLiveObject";
import { _registerWasmLiveTypes } from "./wasm-live-helpers";

_registerWasmLiveTypes(WasmLiveObject, WasmLiveList, WasmLiveMap);
