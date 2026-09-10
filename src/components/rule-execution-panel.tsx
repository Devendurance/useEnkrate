"use client";

import { useCallback, useState } from "react";
import { decodeEventLog, parseAbi, type Address } from "viem";
import { engineAbi, erc20Abi } from "@/lib/enkrate-abi";
import { DEPLOYMENTS, MAINNET_ADDRESSES, SUPPORTED_ASSETS } from "@/lib/mainnet-config";
import { formatToken, formatUsdc, formatUsdPrice } from "@/lib/format";
import { manualExecutionObservation } from "@/lib/execution-activity";
import { validateExecutionPreview } from "@/lib/rule-builder";
import { firstErrorMessage, withReadOnlyRpcFallback } from "@/lib/web3";
import { buttonClasses, Caption, cx } from "./ui";
import { useWallet } from "./web3-provider";
import { Readiness, type ReadinessData } from "./readiness";

type Proposal = {
  ruleId: string;
  sourceToken: Address;
  targetStock: Address;
  receiver: Address;
  router: Address;
  amountIn: string;
  expectedAmountOut: string | null;
  estimatedExecutionPrice: string | null;
  minReturn: string;
  requiredMinimum: string;
  executionPriceRaw: string;
  executionDeviationBpsHundredths: string;
  triggerPrice: string;
  referenceDeviationBps: string;
  route: unknown;
  tx: { data: `0x${string}`; value: string; gas: string | null };
};

const transferEvent = parseAbi(["event Transfer(address indexed from,address indexed to,uint256 value)"])[0];
const ruleExecutedEvent = engineAbi.find((item) => item.type === "event" && item.name === "RuleExecuted");

export function RuleExecutionPanel({ ruleId, targetStock, amountIn, triggerPrice, onExecuted }: { ruleId: bigint; targetStock: Address; amountIn: bigint; triggerPrice: bigint; onExecuted?: () => void }) {
  const { account, getWalletClient, reportExecution } = useWallet();
  const [readiness, setReadiness] = useState<ReadinessData>();
  const [proposal, setProposal] = useState<Proposal>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const asset = Object.values(SUPPORTED_ASSETS).find((candidate) => candidate.address.toLowerCase() === targetStock.toLowerCase());
  const handleReadiness = useCallback((next: ReadinessData) => setReadiness(next), []);

  async function requestProposal() {
    setBusy(true); setMessage(undefined);
    try {
      if (!account || !readiness) throw new Error("Readiness is not available yet.");
      const response = await fetch("/api/oneinch/proposal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ruleId: ruleId.toString() }) });
      const body = (await response.json()) as Proposal & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "1inch could not build a route.");
      if (body.ruleId !== ruleId.toString()) throw new Error("The proposal rule ID does not match Rule 2.");
      const validation = validateExecutionPreview({
        sourceToken: parseAddress(body.sourceToken, "source token"),
        expectedSourceToken: MAINNET_ADDRESSES.usdc,
        targetStock: parseAddress(body.targetStock, "target stock"),
        expectedTargetStock: targetStock,
        amountIn: parseRaw(body.amountIn, "amount in"),
        expectedAmountIn: amountIn,
        receiver: parseAddress(body.receiver, "receiver"),
        expectedReceiver: account,
        router: parseAddress(body.router, "router"),
        expectedRouter: MAINNET_ADDRESSES.oneInchRouter,
        txValue: parseRaw(body.tx?.value, "native value"),
        minReturn: parseRaw(body.minReturn, "minimum return"),
        requiredMinimum: parseRaw(body.requiredMinimum, "required minimum"),
        expectedAmountOut: parseRaw(body.expectedAmountOut, "expected output"),
        referencePrice: readiness.referencePrice,
        triggerPrice,
        maxDeviationBps: 200n,
      });
      if (!validation.ok) throw new Error(`Execution proposal failed validation: ${validation.errors.join(" ")}`);
      setProposal(body);
    } catch (error) { setMessage(firstErrorMessage(error)); } finally { setBusy(false); }
  }

  async function execute() {
    const executionEngine = DEPLOYMENTS.executionEngine;
    if (!account || !proposal || !executionEngine) return;
    setBusy(true); setMessage(undefined);
    try {
      const wallet = getWalletClient();
      const hash = await wallet.writeContract({ address: executionEngine, abi: engineAbi, functionName: "executeRule", args: [ruleId, proposal.tx.data] });
      const receipt = await withReadOnlyRpcFallback((client) => client.waitForTransactionReceipt({ hash }));
      if (receipt.status !== "success") throw new Error("Base rejected the execution transaction.");
      if (!ruleExecutedEvent) throw new Error("RuleExecuted ABI is unavailable.");
      let executionArgs: Record<string, unknown> | undefined;
      let executionLog: (typeof receipt.logs)[number] | undefined;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== executionEngine.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: [ruleExecutedEvent], data: log.data, topics: log.topics });
          if (decoded.eventName === "RuleExecuted") {
            executionArgs = decoded.args as unknown as Record<string, unknown>;
            executionLog = log;
            break;
          }
        } catch {
          // Ignore unrelated engine logs in the same receipt.
        }
      }
      if (!executionArgs || !executionLog?.transactionHash || executionLog.logIndex === null || executionLog.logIndex === undefined) throw new Error("Execution succeeded but no indexed RuleExecuted event was found.");
      if (
        executionArgs.ruleId !== ruleId
        || String(executionArgs.owner).toLowerCase() !== account.toLowerCase()
        || String(executionArgs.targetStock).toLowerCase() !== targetStock.toLowerCase()
        || executionArgs.amountIn !== amountIn
        || (executionArgs.amountOut as bigint) <= 0n
      ) throw new Error("RuleExecuted did not match Rule 2's owner, asset, or amount.");

      const transfers = receipt.logs.flatMap((log) => {
        if (log.address.toLowerCase() !== MAINNET_ADDRESSES.usdc.toLowerCase()) return [];
        try {
          const decoded = decodeEventLog({ abi: [transferEvent], data: log.data, topics: log.topics });
          return decoded.eventName === "Transfer" ? [decoded.args as unknown as Record<string, unknown>] : [];
        } catch {
          return [];
        }
      });
      const ownerPull = transfers.find((transfer) => String(transfer.from).toLowerCase() === account.toLowerCase() && String(transfer.to).toLowerCase() === executionEngine.toLowerCase());
      const engineTransfers = transfers.filter((transfer) => String(transfer.from).toLowerCase() === executionEngine.toLowerCase());
      const actualSpent = engineTransfers.filter((transfer) => String(transfer.to).toLowerCase() !== account.toLowerCase()).reduce((total, transfer) => total + (transfer.value as bigint), 0n);
      const refunded = engineTransfers.filter((transfer) => String(transfer.to).toLowerCase() === account.toLowerCase()).reduce((total, transfer) => total + (transfer.value as bigint), 0n);
      if (!ownerPull || ownerPull.value !== amountIn || actualSpent <= 0n || actualSpent > amountIn || actualSpent + refunded !== amountIn) {
        throw new Error("USDC transfer logs did not prove the Rule 2 spend.");
      }
      const [engineStockBalance, engineUsdcBalance, routerAllowance, spendWindow] = await Promise.all([
        withReadOnlyRpcFallback((client) => client.readContract({ address: targetStock, abi: erc20Abi, functionName: "balanceOf", args: [executionEngine] })),
        withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.usdc, abi: erc20Abi, functionName: "balanceOf", args: [executionEngine] })),
        withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.usdc, abi: erc20Abi, functionName: "allowance", args: [executionEngine, MAINNET_ADDRESSES.oneInchRouter] })),
        withReadOnlyRpcFallback((client) => client.readContract({ address: executionEngine, abi: engineAbi, functionName: "getSpendWindow", args: [ruleId] })),
      ]);
      const [windowStartedAt, windowSpent] = spendWindow as readonly [bigint, bigint];
      if (engineStockBalance !== 0n) throw new Error("Execution left NVDAc on the engine.");
      if (engineUsdcBalance !== 0n) throw new Error("Execution left unintended USDC on the engine.");
      if (routerAllowance !== 0n) throw new Error("Execution left a 1inch allowance on the engine.");
      if (windowStartedAt === 0n || windowSpent < amountIn) throw new Error("The Rule 2 spend window was not updated.");
      const execution = manualExecutionObservation(receipt.status, {
        transactionHash: executionLog.transactionHash,
        logIndex: BigInt(executionLog.logIndex),
        ruleId: executionArgs.ruleId as bigint,
        owner: executionArgs.owner as Address,
        targetStock: executionArgs.targetStock as Address,
        amountIn: executionArgs.amountIn as bigint,
        amountOut: executionArgs.amountOut as bigint,
        timestamp: executionArgs.timestamp as bigint,
      });
      if (!execution) throw new Error("Execution did not produce a verified success event.");
      reportExecution(execution);
      setMessage(`Execution confirmed on Base: ${hash.slice(0, 10)}… USDC spent ${formatUsdc(actualSpent)}, ${asset?.symbol ?? "B20"} received ${formatToken(executionArgs.amountOut as bigint)}. Post-state checks passed.`);
      setProposal(undefined);
      onExecuted?.();
    } catch (error) { setMessage(firstErrorMessage(error)); } finally { setBusy(false); }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Caption>Manual execution</Caption><p className="mt-1 text-sm text-ink-700">No keeper runs this rule. You choose when to request and submit the guarded transaction.</p></div>
        <Readiness ruleId={ruleId} onLoaded={handleReadiness} />
      </div>
      {readiness?.canAttempt && !proposal && <button type="button" className={buttonClasses("secondary", "mt-4")} disabled={busy || !account} onClick={() => void requestProposal()}>{busy ? "Requesting route…" : "Request execution proposal"}</button>}
      {!account && <p className="mt-3 text-sm text-ink-700">Connect a Base wallet to request or submit execution.</p>}
      {proposal && (
        <div className="mt-4 rounded-md border border-line bg-canvas p-4">
          <p className="font-medium text-ink">Execution preview · {asset?.symbol ?? "B20"}</p>
           <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
             <div><dt className="text-ink-700">Amount in</dt><dd className="font-medium text-ink">{formatUsdc(proposal.amountIn)} USDC</dd></div>
             <div><dt className="text-ink-700">Expected B20</dt><dd className="font-medium text-ink">{proposal.expectedAmountOut ? `${formatToken(proposal.expectedAmountOut)} ${asset?.symbol ?? ""}` : "Provider did not return an amount"}</dd></div>
             <div><dt className="text-ink-700">Estimated execution price</dt><dd className="font-medium text-ink">{proposal.estimatedExecutionPrice ? `$${proposal.estimatedExecutionPrice}` : "Unavailable"}</dd></div>
             <div><dt className="text-ink-700">Trigger ceiling</dt><dd className="font-medium text-ink">{formatUsdPrice(proposal.triggerPrice)}</dd></div>
             <div><dt className="text-ink-700">Minimum return</dt><dd className="font-medium text-ink">{formatToken(proposal.minReturn)} {asset?.symbol ?? ""}</dd></div>
             <div><dt className="text-ink-700">Required minimum</dt><dd className="font-medium text-ink">{formatToken(proposal.requiredMinimum)} {asset?.symbol ?? ""}</dd></div>
             <div><dt className="text-ink-700">Reference</dt><dd className="font-medium text-ink">{readiness?.referencePrice ? formatUsdPrice(readiness.referencePrice) : "Unavailable"}</dd></div>
             <div><dt className="text-ink-700">Execution deviation</dt><dd className="font-medium text-ink">{(Number(proposal.executionDeviationBpsHundredths) / 100).toFixed(2)} bps / 200 bps</dd></div>
           </dl>
           <p className="mt-3 text-xs text-primary">Validated: canonical USDC to {asset?.symbol ?? "B20"}, Rule owner receiver, canonical router, zero native value, output floor, price at or below trigger.</p>
           <p className="mt-3 font-mono text-xs text-muted">Route: {routeSummary(proposal.route)}</p>
          <button type="button" className={cx(buttonClasses("primary"), "mt-5")} disabled={busy} onClick={() => void execute()}>{busy ? "Waiting for Base…" : "Run guarded execution"}</button>
        </div>
      )}
       {message && <p className="mt-4 rounded-md bg-surface p-3 text-sm text-ink-700" role="status" aria-live="polite">{message}</p>}
    </div>
  );
}

function routeSummary(route: unknown) {
  if (!route) return "Authenticated 1inch route";
  try { return JSON.stringify(route).slice(0, 180); } catch { return "Authenticated 1inch route"; }
}

function parseRaw(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error(`Proposal ${label} is invalid.`);
  return BigInt(value);
}

function parseAddress(value: unknown, label: string): Address {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`Proposal ${label} is invalid.`);
  return value as Address;
}
