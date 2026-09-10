import type { Address } from "viem";
import { parsePrice, parseUsdc } from "./format";

export type RuleType = "recurring" | "conditional";

export type RuleDraft = {
  ruleType: RuleType | null;
  assetAddress: Address;
  amount: string;
  dailyCap: string;
  approvalBudget: string;
  cadenceDays: number;
  triggerPrice: string;
  referenceDeviation: string;
  slippage: string;
  expires: string;
  allowAged: boolean;
  triggerAcknowledged: boolean;
};

export type LiveReference = {
  referencePrice: bigint;
  referenceUpdatedAt: bigint;
  referenceAge: bigint;
};

export type RuleValidationContext = {
  liveReference?: LiveReference;
  nowSeconds: bigint;
};

export type RuleWarning = {
  code:
    | "TRIGGER_MATERIAL"
    | "TRIGGER_STRONG"
    | "REFERENCE_DEVIATION_BROAD"
    | "SLIPPAGE_BROAD"
    | "AGED_REFERENCE"
    | "EXPIRY_LONG";
  severity: "warning" | "strong";
  message: string;
};

export type RuleSubmission = {
  targetStock: Address;
  amountIn: bigint;
  maxSpendPerWindow: bigint;
  ruleType: 0 | 1;
  triggerPrice: bigint;
  intervalSeconds: bigint;
  maxReferenceDeviationBps: bigint;
  maxSlippageBps: bigint;
  expiresAt: bigint;
  allowAgedReference: boolean;
};

export type RuleRecord = {
  id: bigint;
  owner: Address;
  targetStock: Address;
  amountIn: bigint;
  maxSpendPerWindow: bigint;
  ruleType: number;
  triggerPrice: bigint;
  intervalSeconds: bigint;
  lastExecutedAt: bigint;
  maxReferenceDeviationBps: bigint;
  maxSlippageBps: bigint;
  expiresAt: bigint;
  allowAgedReference: boolean;
  status: number;
};

export type RuleValidation = {
  submission?: RuleSubmission;
  authorizationUnits?: bigint;
  errors: string[];
  warnings: RuleWarning[];
  requiresTriggerAcknowledgement: boolean;
};

export const SPEND_WINDOW_GUIDANCE =
  "Maximum Enkrate may spend for this rule during its current 24-hour spend window.";

export function validateRuleDraft(
  draft: RuleDraft,
  context: RuleValidationContext,
): RuleValidation {
  const errors: string[] = [];
  const warnings: RuleWarning[] = [];
  let amountIn: bigint | undefined;
  let maxSpendPerWindow: bigint | undefined;
  let authorizationUnits: bigint | undefined;
  let triggerPrice = 0n;
  let maxReferenceDeviationBps = 0n;
  let maxSlippageBps = 0n;
  let expiresAt = 0n;
  let intervalSeconds = 0n;

  try {
    amountIn = parseUsdc(draft.amount);
  } catch (error) {
    errors.push(error instanceof Error ? `Amount: ${error.message}` : "Amount is invalid.");
  }

  try {
    maxSpendPerWindow = parseUsdc(draft.dailyCap);
  } catch (error) {
    errors.push(error instanceof Error ? `Spend limit: ${error.message}` : "Spend limit is invalid.");
  }

  if (maxSpendPerWindow !== undefined && amountIn !== undefined && maxSpendPerWindow < amountIn) {
    errors.push("Spend limit must cover the amount spent each time.");
  }

  try {
    authorizationUnits = parseUsdc(draft.approvalBudget.trim() || draft.dailyCap);
    if (maxSpendPerWindow !== undefined && authorizationUnits < maxSpendPerWindow) {
      errors.push("Authorization budget must cover the 24-hour spend limit.");
    }
  } catch (error) {
    errors.push(error instanceof Error ? `Authorization budget: ${error.message}` : "Authorization budget is invalid.");
  }

  if (!draft.ruleType) {
    errors.push("Choose a rule type.");
  } else if (draft.ruleType === "recurring") {
    if (!Number.isInteger(draft.cadenceDays) || draft.cadenceDays <= 0) {
      errors.push("Recurring rules need a positive interval.");
    } else {
      intervalSeconds = BigInt(draft.cadenceDays) * 86_400n;
    }
  } else {
    try {
      triggerPrice = parsePrice(draft.triggerPrice);
    } catch (error) {
      errors.push(error instanceof Error ? `Trigger price: ${error.message}` : "Trigger price is invalid.");
    }

    const livePrice = context.liveReference?.referencePrice ?? 0n;
    if (triggerPrice > 0n && livePrice > 0n) {
      if (triggerPrice * 1_000n < livePrice || triggerPrice > livePrice * 1_000n) {
        errors.push("Trigger price is an order-of-magnitude mismatch with the live reference.");
      } else {
        const difference = triggerPrice > livePrice ? triggerPrice - livePrice : livePrice - triggerPrice;
        const differenceBps = (difference * 10_000n) / livePrice;
        if (differenceBps > 2_500n) {
          warnings.push({
            code: "TRIGGER_STRONG",
            severity: "strong",
            message: "Trigger is more than 25% from the current live reference. Confirm this distant strategy intentionally.",
          });
        } else if (differenceBps > 1_000n) {
          warnings.push({
            code: "TRIGGER_MATERIAL",
            severity: "warning",
            message: "Trigger is more than 10% from the current live reference. Confirm this distance intentionally.",
          });
        }
      }
    }
  }

  try {
    maxReferenceDeviationBps = parsePercentBps(draft.referenceDeviation, "Reference deviation");
    if (maxReferenceDeviationBps > 200n) {
      warnings.push({
        code: "REFERENCE_DEVIATION_BROAD",
        severity: "warning",
        message: "Reference deviation is broader than the recommended 1-2% MVP range.",
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Reference deviation is invalid.");
  }

  try {
    maxSlippageBps = parsePercentBps(draft.slippage, "Provider slippage");
    if (maxSlippageBps > 100n) {
      warnings.push({
        code: "SLIPPAGE_BROAD",
        severity: "warning",
        message: "Provider slippage is broader than the recommended approximately 0.5-1% MVP range.",
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Provider slippage is invalid.");
  }

  if (draft.allowAged) {
    warnings.push({
      code: "AGED_REFERENCE",
      severity: "strong",
      message: "Aged-reference permission may use the last 24/5 reference outside fresh-reference periods.",
    });
  }

  if (draft.expires.trim()) {
    const parsedExpiry = new Date(`${draft.expires}T23:59:59`);
    const timestamp = parsedExpiry.getTime();
    if (!Number.isFinite(timestamp)) {
      errors.push("Expiry date is invalid.");
    } else {
      expiresAt = BigInt(Math.floor(timestamp / 1_000));
      if (expiresAt <= context.nowSeconds) errors.push("Expiry must be in the future.");
      if (expiresAt - context.nowSeconds > 30n * 86_400n) {
        warnings.push({
          code: "EXPIRY_LONG",
          severity: "warning",
          message: "Expiry is longer than 30 days. Confirm that this duration is intentional.",
        });
      }
    }
  }

  const requiresTriggerAcknowledgement = warnings.some(
    (warning) => warning.code === "TRIGGER_MATERIAL" || warning.code === "TRIGGER_STRONG",
  );

  if (requiresTriggerAcknowledgement && !draft.triggerAcknowledged) {
    errors.push("Acknowledge the trigger distance before continuing.");
  }

  if (errors.length > 0 || amountIn === undefined || maxSpendPerWindow === undefined) {
    return { authorizationUnits, errors, warnings, requiresTriggerAcknowledgement };
  }

  return {
    authorizationUnits,
    errors,
    warnings,
    requiresTriggerAcknowledgement,
    submission: {
      targetStock: draft.assetAddress,
      amountIn,
      maxSpendPerWindow,
      ruleType: draft.ruleType === "conditional" ? 1 : 0,
      triggerPrice,
      intervalSeconds,
      maxReferenceDeviationBps,
      maxSlippageBps,
      expiresAt,
      allowAgedReference: draft.allowAged,
    },
  };
}

export function ruleSubmissionArgs(submission: RuleSubmission) {
  return [
    submission.targetStock,
    submission.amountIn,
    submission.maxSpendPerWindow,
    submission.ruleType,
    submission.triggerPrice,
    submission.intervalSeconds,
    submission.maxReferenceDeviationBps,
    submission.maxSlippageBps,
    submission.expiresAt,
    submission.allowAgedReference,
  ] as const;
}

export function ruleRecordFromTuple(value: readonly unknown[]): RuleRecord {
  if (value.length !== 14) throw new Error("The engine returned an invalid rule record.");
  const [id, owner, targetStock, amountIn, maxSpendPerWindow, ruleType, triggerPrice, intervalSeconds, lastExecutedAt, maxReferenceDeviationBps, maxSlippageBps, expiresAt, allowAgedReference, status] = value;
  return {
    id: tupleBigInt(id, "id"),
    owner: tupleAddress(owner, "owner"),
    targetStock: tupleAddress(targetStock, "targetStock"),
    amountIn: tupleBigInt(amountIn, "amountIn"),
    maxSpendPerWindow: tupleBigInt(maxSpendPerWindow, "maxSpendPerWindow"),
    ruleType: Number(tupleBigInt(ruleType, "ruleType")),
    triggerPrice: tupleBigInt(triggerPrice, "triggerPrice"),
    intervalSeconds: tupleBigInt(intervalSeconds, "intervalSeconds"),
    lastExecutedAt: tupleBigInt(lastExecutedAt, "lastExecutedAt"),
    maxReferenceDeviationBps: tupleBigInt(maxReferenceDeviationBps, "maxReferenceDeviationBps"),
    maxSlippageBps: tupleBigInt(maxSlippageBps, "maxSlippageBps"),
    expiresAt: tupleBigInt(expiresAt, "expiresAt"),
    allowAgedReference: tupleBoolean(allowAgedReference, "allowAgedReference"),
    status: Number(tupleBigInt(status, "status")),
  };
}

export async function waitForRuleStatus(
  readRule: () => Promise<RuleRecord>,
  expectedStatus: number,
  options: { attempts?: number; delayMs?: number } = {},
) {
  const attempts = Math.max(1, options.attempts ?? 5);
  const delayMs = Math.max(0, options.delayMs ?? 500);
  let latest: RuleRecord | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    latest = await readRule();
    if (latest.status === expectedStatus) return latest;
    if (attempt < attempts - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Rule did not reach status ${expectedStatus} onchain.`);
}

export function sameRuleSubmission(left: RuleSubmission, right: RuleSubmission) {
  return (
    left.targetStock.toLowerCase() === right.targetStock.toLowerCase()
    && left.amountIn === right.amountIn
    && left.maxSpendPerWindow === right.maxSpendPerWindow
    && left.ruleType === right.ruleType
    && left.triggerPrice === right.triggerPrice
    && left.intervalSeconds === right.intervalSeconds
    && left.maxReferenceDeviationBps === right.maxReferenceDeviationBps
    && left.maxSlippageBps === right.maxSlippageBps
    && left.expiresAt === right.expiresAt
    && left.allowAgedReference === right.allowAgedReference
  );
}

export type ExecutionPreviewInput = {
  sourceToken: Address;
  expectedSourceToken: Address;
  targetStock: Address;
  expectedTargetStock: Address;
  amountIn: bigint;
  expectedAmountIn: bigint;
  receiver: Address;
  expectedReceiver: Address;
  router: Address;
  expectedRouter: Address;
  txValue: bigint;
  minReturn: bigint;
  requiredMinimum: bigint;
  expectedAmountOut: bigint;
  referencePrice: bigint;
  triggerPrice: bigint;
  maxDeviationBps: bigint;
};

export type ExecutionPreviewValidation = {
  ok: boolean;
  errors: string[];
  impliedExecutionPriceRaw?: bigint;
  deviationBpsHundredths?: bigint;
};

export function validateExecutionPreview(input: ExecutionPreviewInput): ExecutionPreviewValidation {
  const errors: string[] = [];
  if (input.sourceToken.toLowerCase() !== input.expectedSourceToken.toLowerCase()) errors.push("Source token does not match canonical USDC.");
  if (input.targetStock.toLowerCase() !== input.expectedTargetStock.toLowerCase()) errors.push("Destination token does not match the Rule asset.");
  if (input.amountIn !== input.expectedAmountIn) errors.push("Swap amount does not match the Rule.");
  if (input.receiver.toLowerCase() !== input.expectedReceiver.toLowerCase()) errors.push("Receiver does not match the Rule owner.");
  if (input.router.toLowerCase() !== input.expectedRouter.toLowerCase()) errors.push("Router is not the canonical 1inch router.");
  if (input.txValue !== 0n) errors.push("The 1inch route unexpectedly requires native value.");
  if (input.minReturn < input.requiredMinimum) errors.push("Minimum return is below Enkrate's required minimum.");

  let impliedExecutionPriceRaw: bigint | undefined;
  let deviationBpsHundredths: bigint | undefined;
  if (input.expectedAmountOut <= 0n) {
    errors.push("Provider did not return a positive expected output.");
  } else if (input.referencePrice <= 0n) {
    errors.push("The live reference price is unavailable.");
  } else {
    const priceNumerator = input.amountIn * 10_000_000_000n;
    const priceDenominator = input.expectedAmountOut * input.referencePrice;
    impliedExecutionPriceRaw = priceNumerator / input.expectedAmountOut;
    const priceDifference = priceNumerator > priceDenominator ? priceNumerator - priceDenominator : priceDenominator - priceNumerator;
    deviationBpsHundredths = (priceDifference * 1_000_000n) / priceDenominator;
    if (priceNumerator > input.expectedAmountOut * input.triggerPrice) errors.push("Implied execution price is above the Rule trigger.");
    if (priceDifference * 10_000n > priceDenominator * input.maxDeviationBps) errors.push("Execution/reference deviation exceeds the 200 bps limit.");
  }

  return { ok: errors.length === 0, errors, impliedExecutionPriceRaw, deviationBpsHundredths };
}

export function blockRanges(fromBlock: bigint, toBlock: bigint, maxRange = 9_000n) {
  if (fromBlock < 0n || toBlock < 0n || maxRange <= 0n) throw new Error("Block range values must be non-negative.");
  if (fromBlock > toBlock) return [] as Array<{ fromBlock: bigint; toBlock: bigint }>;

  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let start = fromBlock; start <= toBlock; start += maxRange) {
    ranges.push({ fromBlock: start, toBlock: start + maxRange - 1n > toBlock ? toBlock : start + maxRange - 1n });
  }
  return ranges;
}

function parsePercentBps(value: string, label: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error(`${label} must be a percentage from 0 to 100.`);
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) throw new Error(`${label} must be a percentage from 0 to 100.`);
  return BigInt(Math.round(numeric * 100));
}

function tupleBigInt(value: unknown, label: string) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`The engine returned an invalid ${label}.`);
}

function tupleAddress(value: unknown, label: string) {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)) return value as Address;
  throw new Error(`The engine returned an invalid ${label}.`);
}

function tupleBoolean(value: unknown, label: string) {
  if (typeof value === "boolean") return value;
  throw new Error(`The engine returned an invalid ${label}.`);
}
