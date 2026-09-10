import assert from "node:assert/strict";

async function main() {
  const ruleBuilder = await import("../src/lib/rule-builder");
  const validateExecutionPreview = ruleBuilder.validateExecutionPreview;
  assert.equal(typeof validateExecutionPreview, "function", "execution preview validator must be exported");

  const valid = {
    sourceToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    expectedSourceToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    targetStock: "0xb20000000000000000000078ee7ce2fE4908108C",
    expectedTargetStock: "0xb20000000000000000000078ee7ce2fE4908108C",
    amountIn: 1_000_000n,
    expectedAmountIn: 1_000_000n,
    receiver: "0xC44685b7c78cC9C9b7f6623d7697Ac30ab0D6Dc9",
    expectedReceiver: "0xC44685b7c78cC9C9b7f6623d7697Ac30ab0D6Dc9",
    router: "0x111111125421cA6dc452d289314280a0f8842A65",
    expectedRouter: "0x111111125421cA6dc452d289314280a0f8842A65",
    txValue: 0n,
    minReturn: 439_941n,
    requiredMinimum: 438_546n,
    expectedAmountOut: 444_385n,
    referencePrice: 22_355_500_000n,
    triggerPrice: 22_917_000_000n,
    maxDeviationBps: 200n,
  } as const;

  assert.deepEqual(validateExecutionPreview(valid).errors, []);
  assert.equal(validateExecutionPreview(valid).ok, true);
  assert.ok(validateExecutionPreview(valid).impliedExecutionPriceRaw! <= valid.triggerPrice);
  assert.ok(validateExecutionPreview(valid).deviationBpsHundredths! <= 20_000n);

  const nonZeroValue = validateExecutionPreview({ ...valid, txValue: 1n });
  assert.equal(nonZeroValue.ok, false);
  assert.ok(nonZeroValue.errors.some((error) => error.includes("native value")));

  const priceAboveTrigger = validateExecutionPreview({ ...valid, expectedAmountOut: 400_000n });
  assert.equal(priceAboveTrigger.ok, false);
  assert.ok(priceAboveTrigger.errors.some((error) => error.includes("trigger")));
  assert.ok(priceAboveTrigger.errors.some((error) => error.includes("deviation")));
  console.log("execution preview assertions passed");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
