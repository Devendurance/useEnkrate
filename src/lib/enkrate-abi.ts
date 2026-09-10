import { parseAbi } from "viem";

export const engineAbi = parseAbi([
  "function createRule(address targetStock,uint256 amountIn,uint256 maxSpendPerWindow,uint8 ruleType,uint256 triggerPrice,uint256 intervalSeconds,uint256 maxReferenceDeviationBps,uint256 maxSlippageBps,uint256 expiresAt,bool allowAgedReference) returns (uint256 ruleId)",
  "function cancelRule(uint256 ruleId)",
  "function getRule(uint256 ruleId) view returns (uint256 id,address owner,address targetStock,uint256 amountIn,uint256 maxSpendPerWindow,uint8 ruleType,uint256 triggerPrice,uint256 intervalSeconds,uint256 lastExecutedAt,uint256 maxReferenceDeviationBps,uint256 maxSlippageBps,uint256 expiresAt,bool allowAgedReference,uint8 status)",
  "function getSpendWindow(uint256 ruleId) view returns (uint64 startedAt,uint192 spent)",
  "function canAttemptExecution(uint256 ruleId) view returns (bool canAttempt,uint8 reason,(uint256 referencePrice,uint256 referenceUpdatedAt,uint256 referenceAge,uint256 multiplier,bool oraclePaused,bool transferPaused) state)",
  "function requiredMinOut(uint256 ruleId,uint256 referencePrice,uint8 targetDecimals) view returns (uint256)",
  "function inspectAsset(address targetStock) view returns ((uint256 referencePrice,uint256 referenceUpdatedAt,uint256 referenceAge,uint256 multiplier,bool oraclePaused,bool transferPaused) state,bool approved)",
  "function assetRegistry() view returns (address)",
  "function executeRule(uint256 ruleId,bytes oneInchSwapCalldata) returns (uint256 amountOut,uint256 realizedPrice)",
  "function referenceAgeThreshold() view returns (uint256)",
  "event RuleCreated(uint256 indexed ruleId,address indexed owner,address indexed targetStock,uint8 ruleType,uint256 amountIn,uint256 expiresAt)",
  "event RuleExecuted(uint256 indexed ruleId,address indexed owner,address indexed targetStock,uint256 amountIn,uint256 amountOut,uint256 realizedPrice,uint256 referencePrice,uint256 referenceUpdatedAt,uint256 multiplier,uint256 timestamp)",
]);

export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
]);

export const b20Abi = parseAbi([
  "function isPaused(uint8 feature) view returns (bool)",
  "function multiplier() view returns (uint256)",
]);

export const b20FactoryAbi = parseAbi([
  "function isB20(address token) view returns (bool)",
  "function isB20Initialized(address token) view returns (bool)",
]);

export const feedAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
]);

export const oracleRegistryAbi = parseAbi([
  "function getOracleParams(address token) view returns (uint256 multiplier,bool paused)",
]);

export const oneInchAbi = parseAbi([
  "function swap(address executor,(address srcToken,address dstToken,address srcReceiver,address dstReceiver,uint256 amount,uint256 minReturnAmount,uint256 flags) desc,bytes permit) returns (uint256 returnAmount,uint256 spentAmount)",
]);

export const EXECUTION_BLOCK_REASONS = [
  "NONE",
  "RULE_NOT_ACTIVE",
  "RULE_EXPIRED",
  "INTERVAL_NOT_ELAPSED",
  "SPEND_LIMIT",
  "INSUFFICIENT_BALANCE",
  "INSUFFICIENT_ALLOWANCE",
  "ASSET_NOT_APPROVED",
  "CORPORATE_ACTION_HOLD",
  "REFERENCE_TOO_OLD",
  "REFERENCE_UNAVAILABLE",
  "TRANSFER_PAUSED",
  "B20_STATE_UNAVAILABLE",
  "INVALID_RULE",
] as const;

export type ExecutionBlockReason = (typeof EXECUTION_BLOCK_REASONS)[number];

export function reasonName(value: number | bigint): ExecutionBlockReason {
  return EXECUTION_BLOCK_REASONS[Number(value)] ?? "INVALID_RULE";
}