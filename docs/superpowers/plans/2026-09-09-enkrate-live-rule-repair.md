# Enkrate Live Rule Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution in this repository. The project instructions prohibit subagents during change/edit mode. Steps use checkbox syntax for tracking.

**Goal:** Repair rule serialization, allowance evidence, owner-event discovery, and high-risk Rule Builder guidance, then prepare a manual Rule 1 cancellation and a preview-only corrected Rule 2.

**Architecture:** A pure `RuleDraft` to `RuleSubmission` module becomes the only serializer for `createRule`, and the Review & Sign surface renders the same typed object passed to the ABI. A shared 9,000-block owner-event reader serves `/rules` and `/receipts`. The existing wallet and owner-only cancellation paths remain manual; no Rule 2 transaction is sent.

**Tech Stack:** Next.js 16.3.4 App Router, React 19, TypeScript strict mode, viem 2.56.3, Tailwind CSS v4, `tsx` for focused pure tests, Base Mainnet read-only RPC.

## Global Constraints

- Do not change Solidity, deployments, RPC provider configuration, 1inch behavior, or execution behavior.
- Do not request a USDC approval, 1inch proposal, or execution transaction.
- Rule 1 cancellation must be initiated and signed manually by the user through the owner-only `cancelRule` flow.
- Do not create Rule 2; return its exact corrected preview only after Rule 1 cancellation is verified.
- Use the exact fixed/tumbling spend-window copy: `Maximum Enkrate may spend for this rule during its current 24-hour spend window.` Never call it rolling or sliding.
- Show current live reference beside trigger price; warn above approximately 10%, strongly warn above approximately 25%, require acknowledgement for material distance, and hard-block only clear order-of-magnitude nonsense below `reference / 1000` or above `reference * 1000`.
- Keep critical guidance visible below fields; info icons are supplemental and accessible.
- Use `apply_patch` for edits. Do not commit because the user did not request a commit.

## File Map

- Create `src/lib/rule-builder.ts`: pure draft types, parsing, validation, warning classification, exact submission serialization, equality checks, and testable block-range generation.
- Create `src/lib/owner-events.ts`: shared owner-filtered event reader that chunks RPC ranges to 9,000 blocks.
- Create `scripts/test-rule-builder.ts`: dependency-free focused assertions executed with the installed `tsx` tool.
- Modify `src/app/rules/new/page.tsx`: use the pure submission model, display exact serialized values, fetch live reference context, add safety guidance, and make approval state evidence-based.
- Modify `src/app/rules/page.tsx`: consume the shared event helper while retaining the existing owner-only manual cancellation flow.
- Modify `src/components/live-receipts.tsx`: consume the same shared event helper.
- Modify `agent-state/project-state.md`, `agent-state/memory.md`, and `agent-state/left-off.md`: record milestones, manual cancellation status, and the final preview only after verification.

### Task 1: Lock the Rule Submission Contract With Focused Tests

**Files:**
- Create: `scripts/test-rule-builder.ts`
- Create: `src/lib/rule-builder.ts`

**Interfaces:**
- `RuleDraft` is `{ ruleType: "recurring" | "conditional" | null; assetAddress: Address; amount: string; dailyCap: string; approvalBudget: string; cadenceDays: number; triggerPrice: string; referenceDeviation: string; slippage: string; expires: string; allowAged: boolean; triggerAcknowledged: boolean }`.
- `LiveReference` contains `referencePrice: bigint`, `referenceUpdatedAt: bigint`, and `referenceAge: bigint` when available.
- `RuleSubmission` contains `targetStock: Address`, `amountIn: bigint`, `maxSpendPerWindow: bigint`, `ruleType: 0 | 1`, `triggerPrice: bigint`, `intervalSeconds: bigint`, `maxReferenceDeviationBps: bigint`, `maxSlippageBps: bigint`, `expiresAt: bigint`, and `allowAgedReference: boolean`.
- `RuleWarning` is `{ code: "TRIGGER_MATERIAL" | "TRIGGER_STRONG" | "REFERENCE_DEVIATION_BROAD" | "SLIPPAGE_BROAD" | "AGED_REFERENCE" | "EXPIRY_LONG"; severity: "warning" | "strong"; message: string }`.
- `validateRuleDraft(draft, context)` returns `{ submission?: RuleSubmission; errors: string[]; warnings: RuleWarning[]; requiresTriggerAcknowledgement: boolean }`.
- `ruleSubmissionArgs(submission)` returns the exact `createRule` ABI tuple order.
- `sameRuleSubmission(left, right)` compares every serialized field.
- `blockRanges(fromBlock, toBlock, maxRange = 9000n)` returns inclusive ranges no larger than `maxRange`.

- [ ] **Step 1: Write failing focused assertions**

```ts
import assert from "node:assert/strict";
import { blockRanges, ruleSubmissionArgs, sameRuleSubmission, validateRuleDraft } from "../src/lib/rule-builder";

const live = { referencePrice: 22590680000n, referenceUpdatedAt: 1788884225n, referenceAge: 7096n };
const baseDraft = {
  ruleType: "conditional" as const,
  assetAddress: "0xb20000000000000000000078ee7ce2fE4908108C" as const,
  amount: "1",
  dailyCap: "1",
  cadenceDays: 1,
  triggerPrice: "230.424936",
  referenceDeviation: "2",
  slippage: "1",
  expires: "2026-09-08",
  allowAged: false,
  triggerAcknowledged: false,
};

const result = validateRuleDraft(baseDraft, { liveReference: live, nowSeconds: 1788891449n });
assert.equal(result.errors.length, 0);
assert.equal(result.submission?.amountIn, 1000000n);
assert.equal(result.submission?.maxSpendPerWindow, 1000000n);
assert.equal(result.submission?.triggerPrice, 23042493600n);
assert.equal(result.submission?.maxReferenceDeviationBps, 200n);
assert.equal(result.submission?.maxSlippageBps, 100n);
assert.deepEqual(ruleSubmissionArgs(result.submission!), [
  baseDraft.assetAddress, 1000000n, 1000000n, 1, 23042493600n, 0n, 200n, 100n,
  result.submission!.expiresAt, false,
]);

const distant = validateRuleDraft({ ...baseDraft, triggerPrice: "260" }, { liveReference: live, nowSeconds: 1788891449n });
assert.equal(distant.requiresTriggerAcknowledgement, true);
assert.equal(distant.errors.length, 0);

const typo = validateRuleDraft({ ...baseDraft, triggerPrice: "0.000001" }, { liveReference: live, nowSeconds: 1788891449n });
assert.ok(typo.errors.some((message) => message.includes("order of magnitude")));

assert.equal(sameRuleSubmission(result.submission!, { ...result.submission!, maxSlippageBps: 99n }), false);
assert.deepEqual(blockRanges(51015985n, 51055472n, 9000n), [
  { fromBlock: 51015985n, toBlock: 51024984n },
  { fromBlock: 51024985n, toBlock: 51033984n },
  { fromBlock: 51033985n, toBlock: 51042984n },
  { fromBlock: 51042985n, toBlock: 51051984n },
  { fromBlock: 51051985n, toBlock: 51055472n },
]);
console.log("rule-builder assertions passed");
```

- [ ] **Step 2: Run the focused assertions before implementation**

Run: `npx tsx scripts/test-rule-builder.ts`

Expected: FAIL because `src/lib/rule-builder.ts` does not yet expose the specified functions.

- [ ] **Step 3: Implement the pure rule-builder module**

Implement strict decimal parsing through the existing `parseUsdc` and `parsePrice` helpers. Convert percentages with `BigInt(Math.round(Number(value) * 100))`, reject non-finite/negative values and values above `10000` bps, reject past expiry, and preserve the fixed/tumbling spend-window meaning in returned guidance text.

For a valid live reference, calculate absolute relative difference in basis points. Add a material warning above `1000` bps, a strong warning above `2500` bps, and a hard error only when `triggerPrice * 1000n < referencePrice` or `triggerPrice > referencePrice * 1000n`. Require `triggerAcknowledged` for either warning but do not reject a non-nonsensical distant strategy solely because it differs from the current reference.

- [ ] **Step 4: Run the focused assertions after implementation**

Run: `npx tsx scripts/test-rule-builder.ts`

Expected: `rule-builder assertions passed` and exit code 0.

### Task 2: Add Bounded Owner Event Discovery

**Files:**
- Create: `src/lib/owner-events.ts`
- Modify: `src/app/rules/page.tsx`
- Modify: `src/components/live-receipts.tsx`
- Modify: `scripts/test-rule-builder.ts`

**Interfaces:**
- `getOwnerEventLogs({ address, event, owner, fromBlock })` reads the latest block, calls `publicClient.getLogs` once per 9,000-block range, and returns sorted/deduplicated logs.
- Missing `fromBlock` throws a configuration error instead of scanning from block zero.

- [ ] **Step 1: Add helper tests for range boundaries and deduplication**

Extend `scripts/test-rule-builder.ts` with assertions for a one-block range, an exact 9,000-block range, a range crossing multiple chunks, and no overlapping ranges. Keep RPC calls out of the pure test.

- [ ] **Step 2: Implement `src/lib/owner-events.ts`**

Use the existing `publicClient`, preserve the indexed `owner` argument, sort by `blockNumber` then `logIndex`, and deduplicate by `${transactionHash}:${logIndex}`. Export the pure `blockRanges` function from `rule-builder.ts` or a small shared range utility so the focused test covers the actual boundary logic.

- [ ] **Step 3: Replace both unbounded reads**

In `src/app/rules/page.tsx`, replace the single `publicClient.getLogs` call with `getOwnerEventLogs`, preserving the existing `RuleCreated` event and owner filter. In `src/components/live-receipts.tsx`, do the same for `RuleExecuted`. Keep existing visible error states and loading behavior.

- [ ] **Step 4: Run focused tests and typecheck the touched paths**

Run: `npx tsx scripts/test-rule-builder.ts`

Expected: all pure assertions pass. Full typecheck runs after the Rule Builder page changes.

### Task 3: Refactor the Rule Builder Around the Exact Submission Object

**Files:**
- Modify: `src/app/rules/new/page.tsx`

**Interfaces:**
- The page creates one `RuleDraft` from its state on every render.
- The selected asset's live snapshot is read through `engine.inspectAsset` when the asset changes and is shown beside the trigger.
- The page keeps `reviewedSubmission` and `finalSubmission` snapshots only for mismatch detection/display; neither is independently serialized.

- [ ] **Step 1: Add live reference state and field-level guidance**

Read `inspectAsset(SUPPORTED_ASSETS[asset].address)` through `publicClient` when the asset changes. Show reference price and age beside the trigger. Extend the local field renderer to accept visible helper text, optional detail text for an accessible info icon, warning text, and error text without changing the page structure.

- [ ] **Step 2: Wire validation into Continue and Review & Sign**

Build a `RuleDraft` from current state, call `validateRuleDraft`, block malformed or nonsensical values, and require the trigger acknowledgement checkbox only when the material/strong warning is active. The review step must not render raw React strings for serialized values; render `reviewedSubmission` with raw and formatted values, including expiry timestamp/date, bps, enum, amount, cap, trigger, and aged-reference flag.

- [ ] **Step 3: Add the pre-sign snapshot invariant**

On the final submit path, rebuild the draft into `finalSubmission`, set it as the visible final object, compare it to `reviewedSubmission`, and stop with a mismatch error if any field differs. Only after equality succeeds call `wallet.writeContract` with `ruleSubmissionArgs(finalSubmission)`. Extract the `RuleCreated` event and verify receipt status before setting `createdRuleId`.

- [ ] **Step 4: Repair allowance state**

Replace the boolean-only `approvalDone` shortcut with an allowance state. Read allowance before displaying confirmation. After `approve`, require a successful receipt and read allowance again. Set `Bounded approval confirmed` only when the fresh allowance is at least the exact authorization amount; otherwise show `Approval required` and the current onchain allowance.

- [ ] **Step 5: Add corrected visible safety copy**

Use the exact fixed/tumbling spend-window wording from the global constraints. Add the specified trigger, deviation, slippage, aged-reference, expiry, and authorization guidance. Keep warnings visible in the document flow, use the design-system ink/reject colors, and add accessible info labels only as supplemental detail.

- [ ] **Step 6: Run focused assertions and lint**

Run: `npx tsx scripts/test-rule-builder.ts`

Expected: all focused assertions pass.

Run: `npm run lint`

Expected: ESLint exits 0 with no errors.

### Task 4: Verify the Repair Before Any Wallet Action

**Files:**
- Modify: `agent-state/project-state.md`
- Modify: `agent-state/memory.md`
- Modify: `agent-state/left-off.md`

- [ ] **Step 1: Run the complete local checks**

Run these commands separately from the repository root:

```text
npm run lint
npm run typecheck
npm run build
npx tsx scripts/test-rule-builder.ts
```

Expected: every command exits 0. Do not claim completion if any command fails.

- [ ] **Step 2: Run route smoke**

Start the production server from the already successful build, request `/rules`, `/rules/new`, and `/receipts`, and verify HTTP 200 responses. Do not submit any browser-wallet transaction during smoke testing.

- [ ] **Step 3: Run read-only Rule 1 pre-cancellation checks**

Using a read-only Base client, verify Rule 1 is active, owner is the public wallet, allowance from the wallet to the engine is zero, and no `RuleExecuted` event exists for Rule 1. Verify the chunked event helper discovers the `RuleCreated` event.

- [ ] **Step 4: Present the manual cancellation checkpoint**

Tell the user that Rule 1 is ready for owner-only cancellation. Show `cancelRule(1)`, the engine address, and that no approval/proposal/execution is involved. Wait for the user to click the existing cancel control and manually approve the wallet prompt. Never call `writeContract` for cancellation from the shell or an automated signer.

### Task 5: Verify Cancellation and Return Rule 2 Preview Only

**Files:**
- Modify: `agent-state/project-state.md`
- Modify: `agent-state/memory.md`
- Modify: `agent-state/left-off.md`

- [ ] **Step 1: Verify the user-provided cancellation receipt**

Read the receipt and require success. Read `getRule(1)` and require `status == CANCELLED`. Read USDC allowance and require zero. Read owner-filtered `RuleExecuted` logs and require no Rule 1 execution.

- [ ] **Step 2: Re-read current NVDAc state**

Read official B20 status, transfer pause, corporate-action hold, reference price, updatedAt, age, and multiplier. Do not reuse the earlier reference or hardcode the prior `$230.42493600` trigger.

- [ ] **Step 3: Build and display corrected Rule 2 preview**

Use the pure serializer to construct a preview with exactly 1 USDC amount/cap, conditional type, current-reference-based trigger, 1-2% reference deviation, approximately 0.5-1% provider slippage, aged reference OFF, and short expiry. Display all raw and human values, including exact `expiresAt` and the acknowledgment status. Do not call `createRule`, approve, request 1inch, or execute.

- [ ] **Step 4: Final verification and state handoff**

Update the three state files with the cancellation hash, Rule 1 cancelled status, zero allowance, no execution, the corrected Rule 2 preview, and the explicit next step: wait for user approval before creating Rule 2.

No commit or push is part of this plan.
