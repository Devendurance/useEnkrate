"use client";

import { useCallback, useEffect, useState } from "react";
import { ButtonLink, Caption, StatusBadge, buttonClasses } from "@/components/ui";
import { ConnectWallet } from "@/components/connect-wallet";
import { EligibilityNote } from "@/components/eligibility-note";
import { MainnetAssetStatus } from "@/components/mainnet-asset-status";
import { RuleCard } from "@/components/rule-card";
import { RuleExecutionPanel } from "@/components/rule-execution-panel";
import { engineAbi, erc20Abi } from "@/lib/enkrate-abi";
import { DEPLOYMENTS, MAINNET_ADDRESSES, SUPPORTED_ASSETS } from "@/lib/mainnet-config";
import { formatDate, formatUsdc } from "@/lib/format";
import { getOwnerEventLogs, type OwnerEventLog } from "@/lib/owner-events";
import { ruleRecordFromTuple, type RuleRecord, waitForRuleStatus } from "@/lib/rule-builder";
import { assertReceiptSucceeded, assertZeroAllowance, firstErrorMessage, publicClient, withReadOnlyRpcFallback } from "@/lib/web3";
import { useWallet } from "@/components/web3-provider";

type RuleCreatedLog = OwnerEventLog & { args?: { ruleId?: bigint } };

const states: Array<{ tone: "pass" | "waiting" | "rejected" | "neutral"; label: string; explanation: string }> = [
  { tone: "pass", label: "Active — Ready", explanation: "The rule is active and every current guard allows an attempt." },
  { tone: "waiting", label: "Waiting — Interval not elapsed", explanation: "A recurring rule remains active until its next interval." },
  { tone: "waiting", label: "Waiting — Reference aged", explanation: "The Chainlink reference is older than the configured threshold and the rule did not opt in." },
  { tone: "rejected", label: "Rejected — Corporate-action hold", explanation: "The Coinbase B20 oracle registry has paused this asset." },
  { tone: "rejected", label: "Rejected — Spend limit", explanation: "The fixed 24-hour spend window has no remaining room for this rule." },
  { tone: "rejected", label: "Rejected — Insufficient allowance", explanation: "Approve only the finite authorization budget shown in the rule flow." },
];

export default function RulesPage() {
  const { account, executionRefreshKey } = useWallet();
  const [rules, setRules] = useState<RuleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const loadRules = useCallback(async () => {
    if (!account || !DEPLOYMENTS.executionEngine) { setRules([]); return; }
     const executionEngine = DEPLOYMENTS.executionEngine;
     setLoading(true); setError(undefined);
    try {
      const event = engineAbi.find((item) => item.type === "event" && item.name === "RuleCreated");
      if (!event) throw new Error("RuleCreated ABI is unavailable.");
       const logs = await getOwnerEventLogs<RuleCreatedLog>({ address: DEPLOYMENTS.executionEngine, event, owner: account, fromBlock: DEPLOYMENTS.deploymentBlock });
       const loaded = await Promise.all(logs.map(async (log) => {
         const ruleId = log.args?.ruleId;
        if (ruleId === undefined) return undefined;
          const value = await withReadOnlyRpcFallback((client) => client.readContract({ address: executionEngine, abi: engineAbi, functionName: "getRule", args: [ruleId] }));
          return ruleRecordFromTuple(value as readonly unknown[]);
      }));
       setRules(loaded.filter((rule): rule is RuleRecord => Boolean(rule)));
    } catch (loadError) { setError(firstErrorMessage(loadError)); } finally { setLoading(false); }
  }, [account]);
  // Initial chain reads are intentionally started from an effect when the wallet or refresh key changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadRules(); }, [executionRefreshKey, loadRules, refreshKey]);

  return <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24">
    <div className="flex flex-wrap items-end justify-between gap-6"><div><Caption>Your automations · Base Mainnet</Caption><h1 className="font-display mt-4 text-4xl leading-tight tracking-[-0.01em] text-ink md:text-6xl">Rules</h1><p className="mt-4 max-w-[720px] text-lg text-ink-700">Every rule shows what it will do, what must be true, and what happens next, before anything executes.</p></div><ButtonLink href="/rules/new">Create a rule</ButtonLink></div>
    <EligibilityNote className="mt-10 max-w-3xl" />
    <MainnetAssetStatus className="mt-12" refreshKey={refreshKey} />
    <section className="mt-12" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="font-display text-2xl text-ink md:text-3xl">Your active rules</h2>{account && <button type="button" className={buttonClasses("secondary", "h-10 px-4")} onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>}</div>
      {!account && <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center"><h3 className="font-display text-2xl text-ink">Connect to read your rules</h3><p className="mx-auto mt-3 max-w-[560px] text-ink-700">Rules are read from the Base Mainnet engine for the connected wallet. No rule data is fabricated in this app.</p><div className="mt-8"><ConnectWallet variant="secondary" /></div></div>}
      {account && !DEPLOYMENTS.executionEngine && <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center"><h3 className="font-display text-2xl text-ink">Mainnet contracts are not configured</h3><p className="mt-3 text-ink-700">Set the verified Enkrate deployment addresses before reading or writing rules.</p></div>}
      {error && <p className="mt-6 rounded-md bg-reject p-4 text-sm text-white">{error}</p>}
      {account && DEPLOYMENTS.executionEngine && !loading && !error && rules.length === 0 && <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center"><h3 className="font-display text-2xl text-ink">No rules yet</h3><p className="mx-auto mt-3 max-w-[560px] text-ink-700">Create a recurring or conditional rule. It will appear here after the Base receipt confirms.</p><div className="mt-8"><ButtonLink href="/rules/new">Create a rule</ButtonLink></div></div>}
      <div className="mt-6 space-y-5">{rules.map((rule) => <LiveRule key={rule.id.toString()} rule={rule} refreshKey={refreshKey} onChanged={() => setRefreshKey((value) => value + 1)} />)}</div>
    </section>
    <section className="mt-16"><h2 className="font-display text-2xl leading-snug text-ink md:text-3xl">How guard states read</h2><ul className="mt-6 divide-y divide-line border-y border-line">{states.map((state) => <li key={state.label} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:gap-6"><div className="sm:w-80 sm:shrink-0"><StatusBadge tone={state.tone} label={state.label} /></div><p className="text-sm text-ink-700">{state.explanation}</p></li>)}</ul></section>
  </div>;
}

function LiveRule({ rule, refreshKey, onChanged }: { rule: RuleRecord; refreshKey: number; onChanged: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string>();
  const [allowance, setAllowance] = useState<bigint>();
  const [allowanceLoading, setAllowanceLoading] = useState(false);
  const [allowanceError, setAllowanceError] = useState<string>();
  const [allowanceNotice, setAllowanceNotice] = useState<string>();
  const [revoking, setRevoking] = useState(false);
  const [spent, setSpent] = useState(0n);
   const { account, executionRefreshKey, getWalletClient } = useWallet();
  const asset = Object.values(SUPPORTED_ASSETS).find((candidate) => candidate.address.toLowerCase() === rule.targetStock.toLowerCase());
  const active = rule.status === 0;
  const cadence = rule.ruleType === 0 ? `${Math.max(1, Math.floor(Number(rule.intervalSeconds) / 86_400))} day interval` : `Trigger ≤ $${(Number(rule.triggerPrice) / 1e8).toFixed(2)}`;
  useEffect(() => {
     if (!DEPLOYMENTS.executionEngine) return;
     const executionEngine = DEPLOYMENTS.executionEngine;
     void withReadOnlyRpcFallback((client) => client.readContract({ address: executionEngine, abi: engineAbi, functionName: "getSpendWindow", args: [rule.id] })).then((window) => setSpent((window as readonly [bigint, bigint])[1])).catch(() => setSpent(0n));
   }, [executionRefreshKey, refreshKey, rule.id]);

  useEffect(() => {
    void readAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [account, executionRefreshKey, refreshKey, rule.id]);

  async function readAllowance() {
     if (!account || !DEPLOYMENTS.executionEngine) return undefined;
     const executionEngine = DEPLOYMENTS.executionEngine;
     setAllowanceLoading(true);
     try {
       const value = await withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.usdc, abi: erc20Abi, functionName: "allowance", args: [account, executionEngine] }));
      setAllowance(value);
      setAllowanceError(undefined);
      return value;
    } catch (error) {
      setAllowance(undefined);
      setAllowanceError(firstErrorMessage(error));
      return undefined;
    } finally {
      setAllowanceLoading(false);
    }
  }

  async function revokeAllowance() {
    if (!DEPLOYMENTS.executionEngine || !account || account.toLowerCase() !== rule.owner.toLowerCase()) return;
    setRevoking(true); setAllowanceError(undefined); setAllowanceNotice("Review the wallet prompt: set the USDC allowance to the Enkrate engine to exactly 0.");
    try {
      const hash = await getWalletClient().writeContract({ address: MAINNET_ADDRESSES.usdc, abi: erc20Abi, functionName: "approve", args: [DEPLOYMENTS.executionEngine, 0n] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assertReceiptSucceeded(receipt.status);
      const confirmedAllowance = await readAllowance();
      assertZeroAllowance(confirmedAllowance);
      setAllowanceNotice("USDC allowance confirmed at exactly 0. Rule 1 cancellation is now available for manual signing.");
    } catch (error) {
      setAllowanceNotice(undefined);
      setAllowanceError(firstErrorMessage(error));
    } finally {
      setRevoking(false);
    }
  }

  async function cancel() {
    const executionEngine = DEPLOYMENTS.executionEngine;
    if (!executionEngine) return;
    setCancelling(true); setCancelError(undefined);
    try {
      if (!account || account.toLowerCase() !== rule.owner.toLowerCase()) throw new Error("Connect the Rule 1 owner wallet before cancelling.");
      const confirmedAllowance = await readAllowance();
      assertZeroAllowance(confirmedAllowance);
      const hash = await getWalletClient().writeContract({ address: executionEngine, abi: engineAbi, functionName: "cancelRule", args: [rule.id] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assertReceiptSucceeded(receipt.status);
       await waitForRuleStatus(
          () => withReadOnlyRpcFallback((client) => client.readContract({ address: executionEngine, abi: engineAbi, functionName: "getRule", args: [rule.id], blockNumber: receipt.blockNumber })).then((value) => ruleRecordFromTuple(value as readonly unknown[])),
         1,
       );
       onChanged();
    } catch (error) { setCancelError(firstErrorMessage(error)); } finally { setCancelling(false); }
  }
  const allowanceLabel = allowanceLoading ? "Reading..." : allowance === undefined ? "Unavailable" : `${formatUsdc(allowance)} USDC`;
  const allowanceIsZero = allowance === 0n;
  return <RuleCard ruleId={`Rule ${rule.id.toString()}`} asset={asset?.symbol ?? rule.targetStock} amount={`${formatUsdc(rule.amountIn)} USDC`} ruleType={rule.ruleType === 0 ? "Recurring" : "Conditional"} cadenceOrTrigger={cadence} nextEvaluation={active ? "Guard checks on request" : "No further evaluation"} state={active ? "active" : rule.status === 1 ? "cancelled" : "executed"} stateLabel={active ? "Active — Monitoring" : rule.status === 1 ? "Cancelled" : "Executed"} dailyCap={`${formatUsdc(rule.maxSpendPerWindow)} USDC / 24h · ${formatUsdc(spent)} spent`} lastEvaluation={rule.lastExecutedAt ? formatDate(rule.lastExecutedAt) : "Not executed"} onCancel={active ? <div className="flex flex-col items-end gap-2"><p className="max-w-xs text-right text-xs text-ink-700">Engine allowance, shared across rules: <strong className="text-ink">{allowanceLabel}</strong></p>{!allowanceIsZero && <><p className="max-w-xs text-right text-xs text-reject">Revoke the allowance before cancelling this active rule.</p><button type="button" className={buttonClasses("secondary", "h-10 px-4")} disabled={revoking || allowanceLoading || allowance === undefined} onClick={() => void revokeAllowance()}>{revoking ? "Waiting for wallet..." : "Revoke allowance to 0"}</button></>}{allowanceIsZero && <p className="max-w-xs text-right text-xs text-primary">Allowance is exactly 0. Cancellation can be signed manually.</p>}<button type="button" className={buttonClasses("secondary", "h-10 px-4")} disabled={cancelling || revoking || allowanceLoading || !allowanceIsZero} onClick={() => void cancel()}>{cancelling ? "Waiting for wallet..." : `Cancel Rule ${rule.id.toString()}`}</button><button type="button" className="font-mono text-xs text-ink-700 underline underline-offset-2 hover:text-primary" onClick={() => void readAllowance()} disabled={allowanceLoading}>Refresh allowance</button>{allowanceNotice && <p className="max-w-xs text-right text-xs text-primary" role="status" aria-live="polite">{allowanceNotice}</p>}{allowanceError && <p className="max-w-xs text-right text-xs text-reject" role="alert">{allowanceError}</p>}{cancelError && <p className="max-w-xs text-right text-xs text-reject" role="alert">{cancelError}</p>}</div> : undefined}><RuleExecutionPanel ruleId={rule.id} targetStock={rule.targetStock} amountIn={rule.amountIn} triggerPrice={rule.triggerPrice} onExecuted={onChanged} /></RuleCard>;
}
