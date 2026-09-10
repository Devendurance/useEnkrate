import assert from "node:assert/strict";
import {
  createExecutionActivityState,
  createExecutionNotification,
  manualExecutionObservation,
  recordExecution,
  type ExecutionObservation,
} from "../src/lib/execution-activity";

const owner = "0xC44685b7c78cC9C9b7f6623d7697Ac30ab0D6Dc9" as const;
const event: ExecutionObservation = {
  transactionHash: "0x28a4a5a47976626527ed58c4cd3b74753ed4ab0b9e95f5a473ace46abeefc7fb",
  logIndex: 17n,
  ruleId: 2n,
  owner,
  targetStock: "0xb20000000000000000000078ee7ce2fE4908108C",
  amountIn: 1_000_000n,
  amountOut: 445_453n,
  timestamp: 1_789_000_539n,
};

const manual = manualExecutionObservation("success", event);
assert.deepEqual(manual, event);
const notification = createExecutionNotification(manual!, owner, "NVDAc");
assert.equal(notification?.asset, "NVDAc");
assert.equal(notification?.key, `${event.transactionHash.toLowerCase()}:17`);

const observed = createExecutionNotification(event, owner, "NVDAc");
assert.equal(observed?.key, notification?.key);

let state = createExecutionActivityState();
state = recordExecution(state, notification!);
assert.equal(state.notifications.length, 1);
assert.equal(state.refreshVersion, 1);
assert.strictEqual(recordExecution(state, observed!), state);
assert.equal(state.refreshVersion, 1);

assert.equal(manualExecutionObservation("reverted", event), undefined);
assert.equal(manualExecutionObservation("success", undefined), undefined);
assert.equal(createExecutionNotification({ ...event, amountOut: 0n }, owner, "NVDAc"), undefined);
assert.equal(createExecutionNotification(event, "0x0000000000000000000000000000000000000001", "NVDAc"), undefined);
console.log("execution notification assertions passed");
