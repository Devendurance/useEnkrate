import assert from "node:assert/strict";
import * as ownerEvents from "../src/lib/owner-events";

assert.equal(ownerEvents.OWNER_EVENT_MAX_RANGE, 2_000n, "owner event reads must stay within the configured RPC limit");
console.log("owner event range assertions passed");
