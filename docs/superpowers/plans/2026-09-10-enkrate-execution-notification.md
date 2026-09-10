# Enkrate Execution Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution in this repository. The project instructions prohibit subagents during change/edit mode. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-owned, globally visible execution-success notification and refresh signal for verified owner `RuleExecuted` events.

**Architecture:** Extend `Web3Provider` with typed execution activity state, a centralized toast queue, a transaction-hash/log-index deduplication set, and a monotonic refresh version. The provider establishes a current-block baseline per connected account, then performs bounded owner-filtered event checks through the existing read-only RPC fallback. The manual execution panel and the monitor submit the same verified event shape; mounted data surfaces consume the refresh version.

**Tech Stack:** Next.js 16.3.4 App Router, React 19, TypeScript strict mode, viem 2.56.3, Tailwind CSS v4, `tsx` focused assertions, existing Base Mainnet read-only RPC clients.

## Global Constraints

- Do not modify Solidity, deployments, deployment artifacts, or live contract state.
- Do not create another rule, request another quote, approve USDC, execute another trade, add keeper automation, or add AI/chat.
- Do not add a dependency unless the existing React/Tailwind stack cannot implement the toast; it is sufficient.
- Keep the typed notification context inside the existing `Web3Provider`; do not add a standalone event bus or route-local-only toast.
- Use `transactionHash + logIndex` for deduplication and retain the seen keys for the provider session.
- Establish the event-monitor baseline from the current block on account connection; do not replay deployment history for notifications.
- Use `withReadOnlyRpcFallback` for event-monitor block and log reads.
- Never query more than `OWNER_EVENT_MAX_RANGE` (`2_000n`) blocks in one monitor request.
- Auto-dismiss each toast after 8 seconds and provide an accessible manual dismiss control.
- Preserve the existing Enkrate visual language and page layouts.
- Use `apply_patch` for edits and do not commit because the user did not request a commit.

---

## File Map

- Create `src/lib/execution-activity.ts`: pure event/notification types, manual success gating, dedupe key generation, and activity-state recording.
- Create `src/components/execution-toast.tsx`: the global, design-system-aligned toast viewport and individual toast lifecycle.
- Create `scripts/test-execution-notifications.ts`: dependency-free focused assertions for notification, event, dedupe, refresh, and revert behavior.
- Modify `src/lib/owner-events.ts`: expose an exact bounded owner-event range reader for incremental monitoring while preserving the existing historical reader.
- Modify `src/components/web3-provider.tsx`: own execution activity context, monitor future owner events, and render the global toast viewport.
- Modify `src/components/rule-execution-panel.tsx`: pass the verified receipt event into the provider after existing execution checks.
- Modify `src/components/execution-receipt.tsx` and `src/components/live-receipts.tsx`: add a stable internal receipt anchor for the toast's `/receipts` link.
- Modify `src/components/mainnet-asset-status.tsx`, `src/components/readiness.tsx`, `src/app/rules/page.tsx`, `src/app/rules/new/page.tsx`, and `src/components/live-receipts.tsx`: consume the provider refresh version in existing read effects.
- Modify `agent-state/project-state.md`, `agent-state/memory.md`, and `agent-state/left-off.md`: record the completed notification/refresh milestone and verification evidence.

## Task 1: Lock the Pure Execution Activity Contract

**Files:**
- Create: `src/lib/execution-activity.ts`
- Create: `scripts/test-execution-notifications.ts`

**Interfaces:**
- `ExecutionObservation` contains `{ transactionHash: \`0x\${string}\`; logIndex: bigint; ruleId: bigint; owner: Address; targetStock: Address; amountIn: bigint; amountOut: bigint; timestamp: bigint }`.
- `ExecutionNotification` extends `ExecutionObservation` with `{ key: string; asset: string }`.
- `ExecutionActivityState` contains `{ notifications: ExecutionNotification[]; refreshVersion: number; seenKeys: ReadonlySet<string> }`.
- `createExecutionActivityState()` returns an empty `ExecutionActivityState`.
- `executionKey(observation)` returns `${transactionHash.toLowerCase()}:${logIndex.toString()}`.
- `createExecutionNotification(observation, expectedOwner, asset)` returns a notification only when the owner matches and `amountOut > 0n`; otherwise it returns `undefined`.
- `manualExecutionObservation(status, observation)` returns the observation only for `status === "success"`, otherwise `undefined`.
- `recordExecution(state, notification)` returns the unchanged state for a seen key; otherwise it adds the notification and increments `refreshVersion` exactly once.

- [ ] **Step 1: Write the failing focused assertions**

```ts
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
```

- [ ] **Step 2: Run the focused test and confirm the contract is not implemented yet**

Run: `npx tsx scripts/test-execution-notifications.ts`

Expected: the command fails because `src/lib/execution-activity.ts` does not yet exist.

- [ ] **Step 3: Implement the pure helpers**

Use the exact types above. Generate the key only from the transaction hash and log index, compare addresses case-insensitively, and preserve the same state object on duplicate input:

```ts
export function recordExecution(state: ExecutionActivityState, notification: ExecutionNotification) {
  if (state.seenKeys.has(notification.key)) return state;
  const seenKeys = new Set(state.seenKeys);
  seenKeys.add(notification.key);
  return {
    notifications: [...state.notifications, notification],
    refreshVersion: state.refreshVersion + 1,
    seenKeys,
  };
}
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npx tsx scripts/test-execution-notifications.ts`

Expected: `execution notification assertions passed` and exit code 0.

## Task 2: Add the Bounded Provider Monitor and Toast Queue

**Files:**
- Modify: `src/lib/owner-events.ts`
- Modify: `src/components/web3-provider.tsx`
- Create: `src/components/execution-toast.tsx`

**Interfaces:**
- `getOwnerEventLogsInRange<T>({ address, event, owner, fromBlock, toBlock })` uses `withReadOnlyRpcFallback`, preserves the indexed owner filter, chunks with `blockRanges(fromBlock, toBlock, OWNER_EVENT_MAX_RANGE)`, and returns merged/sorted/deduplicated logs.
- `WalletContextValue` adds `executionNotifications`, `executionRefreshKey`, `reportExecution(observation)`, and `dismissExecution(key)` while preserving all existing wallet fields.
- The provider monitor decodes only configured-engine `RuleExecuted` logs and passes `ExecutionObservation` values to `reportExecution`.

- [ ] **Step 1: Refactor the owner-event reader around one bounded internal operation**

Keep `getOwnerEventLogs` as the historical deployment-to-latest API used by `/rules` and `/receipts`. Add this exact range API for the monitor:

```ts
export async function getOwnerEventLogsInRange<T extends OwnerEventLog = OwnerEventLog>({
  address,
  event,
  owner,
  fromBlock,
  toBlock,
}: {
  address: Address;
  event: AbiEvent;
  owner: Address;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  return withReadOnlyRpcFallback((client) => readOwnerEventLogs<T>(client, {
    address, event, owner, fromBlock, toBlock,
  }));
}
```

The internal `readOwnerEventLogs` must return `mergeOwnerEventLogs(logs)` and must call `client.getLogs` only for the inclusive ranges produced by `blockRanges`. Reject negative bounds with the existing range error and return an empty list when `fromBlock > toBlock`.

- [ ] **Step 2: Add typed execution state to `Web3Provider`**

Initialize `createExecutionActivityState()` once, reset it when `account` changes, and expose the new context fields. `reportExecution` must derive the supported asset symbol from `targetStock`, call `createExecutionNotification(observation, account, asset)`, and update state with `recordExecution`. If there is no account or the event fails validation, return without changing state.

```tsx
const reportExecution = useCallback((observation: ExecutionObservation) => {
  if (!account) return;
  setExecutionActivity((state) => {
    const asset = supportedAssetLabel(observation.targetStock);
    const notification = createExecutionNotification(observation, account, asset);
    return notification ? recordExecution(state, notification) : state;
  });
}, [account]);
```

- [ ] **Step 3: Implement the future-only owner monitor**

Use one effect keyed by `account`. If the engine address or `RuleExecuted` ABI is unavailable, do nothing. The first safe `getBlockNumber` result becomes `cursor` and is not queried as historical notification input. After that, each timeout checks `latest`, queries at most the next 2,000 blocks with `getOwnerEventLogsInRange`, decodes the logs, reports valid events, and advances the cursor only after the bounded log request succeeds. Use a completion-scheduled `setTimeout` rather than overlapping `setInterval` calls; clear it on cleanup. Swallow monitor read errors so the next attempt retries the same cursor without inventing a failure notification.

```tsx
const EXECUTION_EVENT_POLL_MS = 12_000;
const toBlock = fromBlock + OWNER_EVENT_MAX_RANGE - 1n > latest
  ? latest
  : fromBlock + OWNER_EVENT_MAX_RANGE - 1n;
```

The monitor must pass `{ owner: account }` to every log query and must skip logs without `transactionHash` or `logIndex`. Decode with `decodeEventLog({ abi: [ruleExecutedEvent], data: log.data, topics: log.topics })`; catch decode failures and continue.

- [ ] **Step 4: Render the global toast viewport without a new dependency**

Render `ExecutionToastViewport` as a child of `WalletContext.Provider` and before the existing `children`. For each notification, show the exact title and message, an internal `/receipts#receipt-${hash}` link, an external `explorerTxUrl(hash)` link, and a labeled close button. Use existing `bg-ink`, `text-white`, `rounded-feature`, `shadow-high`, `font-display`, `font-mono`, focus-ring, and spacing conventions. Use `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` on each toast. Schedule `onDismiss(notification.key)` after 8,000ms and clear the timer on unmount.

- [ ] **Step 5: Run static checks for the provider and monitor**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

## Task 3: Feed the Verified Manual Receipt Into the Shared Activity Path

**Files:**
- Modify: `src/components/rule-execution-panel.tsx`
- Modify: `src/components/execution-receipt.tsx`
- Modify: `src/components/live-receipts.tsx`

**Interfaces:**
- The execution panel obtains `reportExecution` from `useWallet`.
- The report payload uses the exact engine event log's transaction hash and log index plus decoded `RuleExecuted` arguments.
- `ExecutionReceipt` accepts an optional `id` and places it on its existing article without changing its layout.

- [ ] **Step 1: Preserve the event log while decoding the manual receipt**

In the existing receipt loop, store the matching engine log alongside `executionArgs`. Require `executionLog.transactionHash` and `executionLog.logIndex` before building the payload. Keep all existing owner, rule, asset, amount, output, transfer, engine-balance, allowance, and spend-window assertions unchanged.

```tsx
const observation = manualExecutionObservation(receipt.status, {
  transactionHash: executionLog.transactionHash,
  logIndex: executionLog.logIndex,
  ruleId: executionArgs.ruleId as bigint,
  owner: executionArgs.owner as Address,
  targetStock: executionArgs.targetStock as Address,
  amountIn: executionArgs.amountIn as bigint,
  amountOut: executionArgs.amountOut as bigint,
  timestamp: executionArgs.timestamp as bigint,
});
if (!observation) throw new Error("Execution did not produce a verified success event.");
reportExecution(observation);
```

Call this only after the existing successful receipt and post-state checks. Do not call it from the catch path or for a reverted receipt. Preserve the current manual error message state for failures.

- [ ] **Step 2: Add a stable receipt anchor**

Add `id?: string` to `ExecutionReceiptProps`, pass it to the article, and make `LiveReceipts` render:

```tsx
<ExecutionReceipt id={`receipt-${receipt.hash}`} ... />
```

The toast's internal link must use the same fragment and the existing receipt page route.

- [ ] **Step 3: Re-run the focused assertions**

Run: `npx tsx scripts/test-execution-notifications.ts`

Expected: all notification assertions pass, including the reverted/manual gating checks.

## Task 4: Wire Automatic Refresh Into Mounted Surfaces

**Files:**
- Modify: `src/app/rules/page.tsx`
- Modify: `src/components/mainnet-asset-status.tsx`
- Modify: `src/components/readiness.tsx`
- Modify: `src/app/rules/new/page.tsx`
- Modify: `src/components/live-receipts.tsx`

**Interfaces:**
- Every affected component reads `executionRefreshKey` from `useWallet`.
- Existing manual `refreshKey` values remain supported for explicit refresh/cancellation flows.
- The provider refresh version is an effect dependency only; it is not persisted and does not create a polling loop in the consumers.

- [ ] **Step 1: Refresh `/rules` and each mounted `LiveRule`**

Destructure `executionRefreshKey` in `RulesPage`, include it in the owner-rule loading effect, and pass it to `MainnetAssetStatus`/`LiveRule` or read it directly in those components. The event must cause owner-created rule discovery, current rule status, spend window, and owner-to-engine allowance reads to run again. Leave the manual `Refresh` button and cancellation callback intact.

- [ ] **Step 2: Refresh balances and B20 guard state**

Read `executionRefreshKey` in `MainnetAssetStatus` and add it beside `account` and the existing `refreshKey` in both asset and USDC balance effect dependencies. This re-reads wallet B20 balances, engine `inspectAsset` guard state, and wallet USDC without broad polling.

- [ ] **Step 3: Refresh readiness and builder reads**

Read `executionRefreshKey` in `Readiness` and add it to its `canAttemptExecution` effect dependencies. In `NewRulePage`, add it to the live selected-asset `inspectAsset` effect and the review-step allowance effect so a mounted builder catches the same event-driven state change.

- [ ] **Step 4: Refresh historical receipts**

Read `executionRefreshKey` in `LiveReceipts` and add it to the existing `load` effect dependency list. Keep its deployment-to-latest history query bounded through `getOwnerEventLogs`; this is a refresh trigger, not a new poller.

- [ ] **Step 5: Run focused checks after refresh wiring**

Run:

```text
npx tsx scripts/test-execution-notifications.ts
npm run lint
npm run typecheck
```

Expected: all commands exit 0.

## Task 5: Verify the Complete Notification and Refresh Result

**Files:**
- Modify: `agent-state/project-state.md`
- Modify: `agent-state/memory.md`
- Modify: `agent-state/left-off.md`

- [ ] **Step 1: Run the required production checks**

Run each command separately from the repository root:

```text
npm run lint
npm run typecheck
npm run build
npx tsx scripts/test-execution-notifications.ts
```

Expected: every command exits 0. Do not claim a passing result without captured command output.

- [ ] **Step 2: Run route smoke against the production build**

Start the already-built app with `npm run start` on an available local port, request `/`, `/rules`, `/rules/new`, `/receipts`, and `/playbooks`, and require HTTP 200 for each. Do not connect a wallet or submit any transaction during smoke testing. Stop only the process started for this check.

- [ ] **Step 3: Inspect the final diff for scope**

Run `git diff --stat` and `git status --short`. Confirm that no Solidity, deployment, `.env`, contract address, quote, transaction, keeper, AI, or dependency files changed. Confirm the only application behavior added is provider-owned execution notification and mounted-state refresh.

- [ ] **Step 4: Update session state with evidence**

Record the changed files, exact toast behavior, future-only bounded monitor, dedupe key, refresh consumers, command results, and any verification limitation in the three required state files. Leave the next step as stop; no follow-on feature is authorized.
