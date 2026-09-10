"use client";

import { useEffect, useState } from "react";
import { engineAbi, reasonName, type ExecutionBlockReason } from "@/lib/enkrate-abi";
import { DEPLOYMENTS } from "@/lib/mainnet-config";
import { formatAge, formatUsdPrice } from "@/lib/format";
import { withReadOnlyRpcFallback } from "@/lib/web3";
import { StatusBadge } from "./ui";
import { useWallet } from "./web3-provider";

const labels: Record<ExecutionBlockReason, { tone: "pass" | "waiting" | "rejected"; label: string }> = {
  NONE: { tone: "pass", label: "Active — Ready" },
  RULE_NOT_ACTIVE: { tone: "rejected", label: "Rejected — Rule not active" },
  RULE_EXPIRED: { tone: "rejected", label: "Rejected — Rule expired" },
  INTERVAL_NOT_ELAPSED: { tone: "waiting", label: "Waiting — Interval not elapsed" },
  SPEND_LIMIT: { tone: "rejected", label: "Rejected — Spend limit" },
  INSUFFICIENT_BALANCE: { tone: "rejected", label: "Rejected — Insufficient balance" },
  INSUFFICIENT_ALLOWANCE: { tone: "rejected", label: "Rejected — Insufficient allowance" },
  ASSET_NOT_APPROVED: { tone: "rejected", label: "Rejected — Asset unavailable" },
  CORPORATE_ACTION_HOLD: { tone: "rejected", label: "Rejected — Corporate-action hold" },
  REFERENCE_TOO_OLD: { tone: "waiting", label: "Waiting — Reference aged" },
  REFERENCE_UNAVAILABLE: { tone: "rejected", label: "Rejected — Asset unavailable" },
  TRANSFER_PAUSED: { tone: "rejected", label: "Rejected — Asset unavailable" },
  B20_STATE_UNAVAILABLE: { tone: "rejected", label: "Rejected — Asset unavailable" },
  INVALID_RULE: { tone: "rejected", label: "Rejected — Rule unavailable" },
};

export type ReadinessData = {
  canAttempt: boolean;
  reason: ExecutionBlockReason;
  referencePrice: bigint;
  referenceAge: bigint;
};

export function Readiness({ ruleId, onLoaded }: { ruleId: bigint; onLoaded?: (data: ReadinessData) => void }) {
  const { executionRefreshKey } = useWallet();
  const [data, setData] = useState<ReadinessData>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!DEPLOYMENTS.executionEngine) {
        setError("Contract deployment is not configured.");
        return;
      }
      const executionEngine = DEPLOYMENTS.executionEngine;
      try {
        const result = await withReadOnlyRpcFallback((client) => client.readContract({ address: executionEngine, abi: engineAbi, functionName: "canAttemptExecution", args: [ruleId] }));
        const [canAttempt, reason, state] = result as readonly [boolean, number, { referencePrice: bigint; referenceAge: bigint }];
        const next = { canAttempt, reason: reasonName(reason), referencePrice: state.referencePrice, referenceAge: state.referenceAge };
        if (!cancelled) { setData(next); onLoaded?.(next); }
      } catch (readError) {
        if (!cancelled) setError(readError instanceof Error ? readError.message.split("\n")[0] : "Unable to read readiness.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [executionRefreshKey, onLoaded, ruleId]);

  if (error) return <p className="text-sm text-reject">{error}</p>;
  if (!data) return <p className="font-mono text-xs text-muted">Checking guard state…</p>;
  const copy = labels[data.reason];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone={copy.tone} label={copy.label} />
      {data.referencePrice > 0n && <span className="font-mono text-xs text-muted">Ref {formatUsdPrice(data.referencePrice)} · {formatAge(data.referenceAge)}</span>}
    </div>
  );
}

export { labels as readinessLabels };
