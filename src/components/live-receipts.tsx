"use client";

import { useCallback, useEffect, useState } from "react";
import { decodeEventLog, type Address, type Log } from "viem";
import { ExecutionReceipt } from "./execution-receipt";
import { engineAbi } from "@/lib/enkrate-abi";
import { DEPLOYMENTS, explorerTxUrl, SUPPORTED_ASSETS } from "@/lib/mainnet-config";
import { formatAge, formatDate, formatToken, formatUsdc, formatUsdPrice } from "@/lib/format";
import { getOwnerEventLogs } from "@/lib/owner-events";
import { firstErrorMessage } from "@/lib/web3";
import { useWallet } from "./web3-provider";

type Receipt = {
  ruleId: bigint; owner: Address; targetStock: Address; amountIn: bigint; amountOut: bigint;
  realizedPrice: bigint; referencePrice: bigint; referenceUpdatedAt: bigint; multiplier: bigint;
  timestamp: bigint; hash: `0x${string}`; referenceAge: number;
};

export function LiveReceipts() {
  const { account, executionRefreshKey } = useWallet();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    if (!account || !DEPLOYMENTS.executionEngine) { setReceipts([]); return; }
    setLoading(true); setError(undefined);
    try {
      const event = engineAbi.find((item) => item.type === "event" && item.name === "RuleExecuted");
      if (!event) throw new Error("RuleExecuted ABI is unavailable.");
       const logs = await getOwnerEventLogs<Log>({ address: DEPLOYMENTS.executionEngine, event, owner: account, fromBlock: DEPLOYMENTS.deploymentBlock });
      const now = Math.floor(Date.now() / 1000);
      setReceipts(logs.map((log) => decodeReceipt(log, event, now)).reverse());
    } catch (readError) { setError(firstErrorMessage(readError)); } finally { setLoading(false); }
  }, [account]);
  // Initial chain reads are intentionally started from an effect when the wallet changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [executionRefreshKey, load]);
  if (!account) return <p className="mt-8 rounded-card border border-line bg-surface p-8 text-center text-ink-700">Connect a Base wallet to read successful RuleExecuted receipts for that wallet.</p>;
  if (!DEPLOYMENTS.executionEngine) return <p className="mt-8 rounded-card border border-line bg-surface p-8 text-center text-ink-700">Configure the verified execution engine address to read receipts.</p>;
  if (error) return <p className="mt-8 rounded-md bg-reject p-4 text-sm text-white">{error}</p>;
  if (loading) return <p className="mt-8 font-mono text-xs text-muted">Reading successful execution receipts…</p>;
  if (receipts.length === 0) return <p className="mt-8 rounded-card border border-line bg-surface p-8 text-center text-ink-700">No successful onchain executions yet. Waiting and evaluation states are not receipts.</p>;
  return <div className="mt-8 space-y-6">{receipts.map((receipt) => { const asset = Object.values(SUPPORTED_ASSETS).find((candidate) => candidate.address.toLowerCase() === receipt.targetStock.toLowerCase()); return <ExecutionReceipt id={`receipt-${receipt.hash}`} key={receipt.hash} outcome="executed" ruleId={receipt.ruleId.toString()} asset={asset?.symbol ?? receipt.targetStock} amount={`${formatUsdc(receipt.amountIn)} USDC`} timestamp={formatDate(receipt.timestamp)} spent={`${formatUsdc(receipt.amountIn)} USDC`} received={`${formatToken(receipt.amountOut)} ${asset?.symbol ?? "B20"}`} realizedPrice={formatUsdPrice(receipt.realizedPrice)} referencePrice={formatUsdPrice(receipt.referencePrice)} referenceAge={`${formatAge(receipt.referenceAge)} · updated ${formatDate(receipt.referenceUpdatedAt)}`} multiplier={`${(Number(receipt.multiplier) / 1e18).toFixed(4)}×`} checks={["Reference read", "Corporate-action state clear", "Bounded spend and allowance", "Minimum output and realized price"]} txLabel={`View Base transaction · ${receipt.hash.slice(0, 10)}…`} txHref={explorerTxUrl(receipt.hash)} guidance="Successful onchain receipt" />; })}</div>;
}

function decodeReceipt(log: Log, event: Parameters<typeof decodeEventLog>[0]["abi"][number], now: number) {
  const decoded = decodeEventLog({ abi: [event], data: log.data, topics: log.topics });
  const args = decoded.args as unknown as Record<string, bigint | Address>;
  const referenceUpdatedAt = args.referenceUpdatedAt as bigint;
  return { ruleId: args.ruleId as bigint, owner: args.owner as Address, targetStock: args.targetStock as Address, amountIn: args.amountIn as bigint, amountOut: args.amountOut as bigint, realizedPrice: args.realizedPrice as bigint, referencePrice: args.referencePrice as bigint, referenceUpdatedAt, multiplier: args.multiplier as bigint, timestamp: args.timestamp as bigint, hash: log.transactionHash!, referenceAge: Math.max(0, now - Number(referenceUpdatedAt)) };
}
