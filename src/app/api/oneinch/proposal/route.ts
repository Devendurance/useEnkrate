import { NextResponse } from "next/server";
import { decodeFunctionData, type Address } from "viem";
import { engineAbi, oneInchAbi, reasonName } from "@/lib/enkrate-abi";
import { DEPLOYMENTS, MAINNET_ADDRESSES, BASE_CHAIN_ID, SUPPORTED_ASSETS } from "@/lib/mainnet-config";
import { validateExecutionPreview } from "@/lib/rule-builder";
import { withReadOnlyRpcFallback } from "@/lib/web3";

export const runtime = "nodejs";

type Rule = readonly unknown[];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ruleId?: unknown };
    const ruleId = parseRuleId(body.ruleId);
    const engine = DEPLOYMENTS.executionEngine;
    if (!engine) return failure("CONTRACTS_NOT_CONFIGURED", "Enkrate Mainnet contracts are not configured yet.", 503);

    let rule: Rule;
    try {
      rule = (await withReadOnlyRpcFallback((client) => client.readContract({
        address: engine,
        abi: engineAbi,
        functionName: "getRule",
        args: [ruleId],
      }))) as unknown as Rule;
    } catch {
      return failure("RULE_NOT_FOUND", "That rule does not exist.", 404);
    }
    const id = rule[0] as bigint;
    const owner = rule[1] as Address;
    const targetStock = rule[2] as Address;
    const amountIn = rule[3] as bigint;
    const maxReferenceDeviationBps = rule[9] as bigint;
    const maxSlippageBps = rule[10] as bigint;
    const status = rule[13] as number;
    if (id === 0n) return failure("RULE_NOT_FOUND", "That rule does not exist.", 404);
    if (status !== 0) return failure("RULE_NOT_ACTIVE", "Only active rules can receive an execution proposal.", 409);

    const asset = Object.values(SUPPORTED_ASSETS).find(
      (candidate) => candidate.address.toLowerCase() === targetStock.toLowerCase(),
    );
    if (!asset) return failure("ASSET_NOT_APPROVED", "This rule targets an unsupported B20 asset.", 400);

    const readiness = await withReadOnlyRpcFallback((client) => client.readContract({
      address: engine,
      abi: engineAbi,
      functionName: "canAttemptExecution",
      args: [ruleId],
    }));
    const [canAttempt, reason, state] = readiness as readonly [boolean, number, { referencePrice: bigint }];
    if (!canAttempt) return failure(reasonName(reason), `The rule is not ready: ${reasonName(reason).replaceAll("_", " ").toLowerCase()}.`, 409);

    const apiKey = process.env.ONEINCH_API_KEY;
    if (!apiKey) return failure("PROVIDER_NOT_CONFIGURED", "The authenticated 1inch provider is not configured.", 503);

    const slippage = Math.min(Number(maxSlippageBps) / 100, 50);
    const url = new URL(`https://api.1inch.dev/swap/v6.1/${BASE_CHAIN_ID}/swap`);
    for (const [key, value] of Object.entries({
      src: MAINNET_ADDRESSES.usdc,
      dst: targetStock,
      amount: amountIn.toString(),
      from: engine,
      origin: engine,
      destReceiver: owner,
      slippage: slippage.toString(),
      includeProtocols: "true",
      disableEstimate: "true",
    })) url.searchParams.set(key, value);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });
    const responseBody = (await response.json().catch(() => ({}))) as OneInchResponse;
    if (!response.ok || !responseBody.tx?.data) {
      return failure("QUOTE_UNAVAILABLE", providerMessage(responseBody, response.status), 502);
    }

    const calldata = responseBody.tx.data as `0x${string}`;
    if (!responseBody.tx.to || !/^0x[0-9a-fA-F]{40}$/.test(responseBody.tx.to) || responseBody.tx.to.toLowerCase() !== MAINNET_ADDRESSES.oneInchRouter.toLowerCase()) {
      return failure("INVALID_PROVIDER_TARGET", "The 1inch route did not target the official Base router.", 502);
    }
    let txValue = 0n;
    try {
      txValue = responseBody.tx.value ? BigInt(responseBody.tx.value) : 0n;
    } catch {
      return failure("INVALID_PROVIDER_VALUE", "The 1inch route returned an invalid native value.", 502);
    }
    if (txValue !== 0n) {
      return failure("INVALID_PROVIDER_VALUE", "The 1inch route unexpectedly requires native ETH value.", 502);
    }
    const decoded = decodeFunctionData({ abi: oneInchAbi, data: calldata });
    const args = decoded.args;
    if (!args || args.length !== 3) return failure("INVALID_PROVIDER_CALldata", "1inch returned an unsupported swap payload.", 502);
    const [executor, description] = args;
    if (
      description.srcToken.toLowerCase() !== MAINNET_ADDRESSES.usdc.toLowerCase() ||
      description.dstToken.toLowerCase() !== targetStock.toLowerCase() ||
      description.dstReceiver.toLowerCase() !== owner.toLowerCase() ||
      description.amount !== amountIn ||
      description.flags & 1n
    ) {
      return failure("INVALID_PROVIDER_CALldata", "The 1inch route did not match the stored rule boundaries.", 502);
    }
    const requiredMinimum = await withReadOnlyRpcFallback((client) => client.readContract({
      address: engine,
      abi: engineAbi,
      functionName: "requiredMinOut",
      args: [ruleId, state.referencePrice, asset.decimals],
    }));
    if (description.minReturnAmount < requiredMinimum) {
      return failure("MINIMUM_OUTPUT_TOO_LOW", "The 1inch quote minimum is below the onchain reference guard.", 409);
    }

    const expectedAmountOut = responseBody.dstAmount ?? responseBody.toTokenAmount ?? responseBody.amountOut;
    if (!expectedAmountOut || !/^\d+$/.test(expectedAmountOut)) {
      return failure("INVALID_PROVIDER_OUTPUT", "1inch did not return a positive expected output.", 502);
    }
    const preview = validateExecutionPreview({
      sourceToken: description.srcToken,
      expectedSourceToken: MAINNET_ADDRESSES.usdc,
      targetStock: description.dstToken,
      expectedTargetStock: targetStock,
      amountIn: description.amount,
      expectedAmountIn: amountIn,
      receiver: description.dstReceiver,
      expectedReceiver: owner,
      router: responseBody.tx.to as Address,
      expectedRouter: MAINNET_ADDRESSES.oneInchRouter,
      txValue,
      minReturn: description.minReturnAmount,
      requiredMinimum,
      expectedAmountOut: BigInt(expectedAmountOut),
      referencePrice: state.referencePrice,
      triggerPrice: rule[6] as bigint,
      maxDeviationBps: 200n,
    });
    if (!preview.ok) return failure("PROPOSAL_VALIDATION_FAILED", preview.errors.join(" "), 409);

    return NextResponse.json({
      ruleId: ruleId.toString(),
      sourceToken: description.srcToken,
      targetStock: description.dstToken,
      receiver: description.dstReceiver,
      router: responseBody.tx.to,
      amountIn: amountIn.toString(),
      expectedAmountOut,
      estimatedExecutionPrice: expectedAmountOut && amountIn > 0n
        ? ((Number(amountIn) / 1e6) / (Number(expectedAmountOut) / 1e8)).toFixed(8)
        : null,
      minReturn: description.minReturnAmount.toString(),
      requiredMinimum: requiredMinimum.toString(),
      referenceDeviationBps: maxReferenceDeviationBps.toString(),
      executionPriceRaw: preview.impliedExecutionPriceRaw!.toString(),
      executionDeviationBpsHundredths: preview.deviationBpsHundredths!.toString(),
      triggerPrice: (rule[6] as bigint).toString(),
      slippageBps: maxSlippageBps.toString(),
      executor,
      route: responseBody.protocols ?? responseBody.route ?? null,
      tx: { data: calldata, value: txValue.toString(), gas: responseBody.tx.gas ?? null },
      providerRequestId: response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? null,
      asset: asset.key,
    });
  } catch (error) {
    return failure("PROPOSAL_ERROR", error instanceof Error ? error.message.split("\n")[0] : "Unable to build an execution proposal.", 500);
  }
}

type OneInchResponse = {
  tx?: { to?: string; data?: string; value?: string; gas?: string };
  dstAmount?: string;
  toTokenAmount?: string;
  amountOut?: string;
  protocols?: unknown;
  route?: unknown;
  description?: string;
  error?: string;
  message?: string;
};

function parseRuleId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("ruleId is required");
  const text = String(value);
  if (!/^\d+$/.test(text) || BigInt(text) === 0n) throw new Error("ruleId must be a positive integer");
  return BigInt(text);
}

function providerMessage(body: OneInchResponse, status: number) {
  const detail = body.message ?? body.error ?? body.description;
  return detail ? `1inch could not build this route: ${detail}` : `1inch could not build this route (HTTP ${status}).`;
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}
