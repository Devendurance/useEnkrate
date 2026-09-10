import assert from "node:assert/strict";
import { mergeOwnerEventLogs } from "../src/lib/owner-events";
import { assertReceiptSucceeded, assertZeroAllowance, confirmAllowance } from "../src/lib/web3";
import {
  blockRanges,
  ruleRecordFromTuple,
  ruleSubmissionArgs,
  sameRuleSubmission,
  SPEND_WINDOW_GUIDANCE,
  validateRuleDraft,
  waitForRuleStatus,
} from "../src/lib/rule-builder";

const live = {
  referencePrice: 22_590_680_000n,
  referenceUpdatedAt: 1_788_884_225n,
  referenceAge: 7_096n,
};

const baseDraft = {
  ruleType: "conditional" as const,
  assetAddress: "0xb20000000000000000000078ee7ce2fE4908108C" as const,
  amount: "1",
  dailyCap: "1",
  approvalBudget: "1",
  cadenceDays: 1,
  triggerPrice: "230.424936",
  referenceDeviation: "2",
  slippage: "1",
  expires: "2026-09-08",
  allowAged: false,
  triggerAcknowledged: false,
};

const result = validateRuleDraft(baseDraft, { liveReference: live, nowSeconds: 1_788_891_449n });
assert.equal(result.errors.length, 0);
assert.equal(result.submission?.amountIn, 1_000_000n);
assert.equal(result.submission?.maxSpendPerWindow, 1_000_000n);
assert.equal(result.submission?.triggerPrice, 23_042_493_600n);
assert.equal(result.submission?.maxReferenceDeviationBps, 200n);
assert.equal(result.submission?.maxSlippageBps, 100n);
assert.deepEqual(ruleSubmissionArgs(result.submission!), [
  baseDraft.assetAddress,
  1_000_000n,
  1_000_000n,
  1,
  23_042_493_600n,
  0n,
  200n,
  100n,
  result.submission!.expiresAt,
  false,
]);

const distant = validateRuleDraft(
  { ...baseDraft, triggerPrice: "260" },
  { liveReference: live, nowSeconds: 1_788_891_449n },
);
assert.equal(distant.requiresTriggerAcknowledgement, true);
assert.ok(distant.errors.some((message) => message.includes("Acknowledge")));

const acknowledgedDistant = validateRuleDraft(
  { ...baseDraft, triggerPrice: "260", triggerAcknowledged: true },
  { liveReference: live, nowSeconds: 1_788_891_449n },
);
assert.equal(acknowledgedDistant.errors.length, 0);

const typo = validateRuleDraft(
  { ...baseDraft, triggerPrice: "0.000001" },
  { liveReference: live, nowSeconds: 1_788_891_449n },
);
assert.ok(typo.errors.some((message) => message.includes("order-of-magnitude")));
assert.match(SPEND_WINDOW_GUIDANCE, /current 24-hour spend window/);
assert.doesNotMatch(SPEND_WINDOW_GUIDANCE, /rolling|sliding/i);
assert.doesNotThrow(() => assertReceiptSucceeded("success"));
assert.throws(() => assertReceiptSucceeded("reverted"), /did not confirm successfully/);
assert.doesNotThrow(() => assertZeroAllowance(0n));
assert.throws(() => assertZeroAllowance(1_000_000n), /must be exactly zero/);

const firstLog = { blockNumber: 10n, logIndex: 2n, transactionHash: "0xaaa" as const };
const duplicateLog = { blockNumber: 10n, logIndex: 2n, transactionHash: "0xaaa" as const };
const secondLog = { blockNumber: 11n, logIndex: 0n, transactionHash: "0xbbb" as const };
assert.deepEqual(mergeOwnerEventLogs([secondLog, duplicateLog, firstLog]), [firstLog, secondLog]);

const normalizedRule = ruleRecordFromTuple([
  1n,
  baseDraft.assetAddress,
  baseDraft.assetAddress,
  1_000_000n,
  1_000_000n,
  1,
  23_042_493_600n,
  0n,
  0n,
  200n,
  100n,
  1_788_908_399n,
  false,
  0,
]);
assert.equal(normalizedRule.id, 1n);
assert.equal(normalizedRule.owner, baseDraft.assetAddress);
assert.equal(normalizedRule.maxReferenceDeviationBps, 200n);
assert.equal(normalizedRule.status, 0);

assert.equal(
  sameRuleSubmission(result.submission!, { ...result.submission!, maxSlippageBps: 99n }),
  false,
);
assert.deepEqual(blockRanges(51_015_985n, 51_055_472n, 9_000n), [
  { fromBlock: 51_015_985n, toBlock: 51_024_984n },
  { fromBlock: 51_024_985n, toBlock: 51_033_984n },
  { fromBlock: 51_033_985n, toBlock: 51_042_984n },
  { fromBlock: 51_042_985n, toBlock: 51_051_984n },
  { fromBlock: 51_051_985n, toBlock: 51_055_472n },
]);

void (async () => {
  const allowanceReads: string[] = [];
  const allowanceConfirmation = await confirmAllowance(
    async (blockNumber) => {
      allowanceReads.push(blockNumber?.toString() ?? "latest");
      if (blockNumber === 99n) return 1_000_000n;
      return allowanceReads.length === 2 ? 0n : 1_000_000n;
    },
    1_000_000n,
    99n,
    { attempts: 3, delayMs: 0 },
  );
  assert.deepEqual(allowanceConfirmation, { allowance: 1_000_000n, source: "latest" });
  assert.deepEqual(allowanceReads, ["99", "latest", "latest"]);

  let statusReads = 0;
  const eventuallyCancelled = await waitForRuleStatus(
    async () => {
      statusReads += 1;
      return { ...normalizedRule, status: statusReads < 2 ? 0 : 1 };
    },
    1,
    { attempts: 3, delayMs: 0 },
  );
  assert.equal(eventuallyCancelled.status, 1);
  assert.equal(statusReads, 2);
  console.log("rule-builder assertions passed");
})().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
