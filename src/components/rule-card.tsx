import type { ReactNode } from "react";
import { cx } from "./ui";

export type RuleCardState = "active" | "waiting" | "rejected" | "cancelled" | "executed";

const stateTone: Record<RuleCardState, string> = {
  active: "bg-primary text-white",
  waiting: "bg-accent text-ink",
  rejected: "bg-reject text-white",
  cancelled: "border border-line-disabled bg-canvas text-ink",
  executed: "bg-primary text-white",
};

type RuleCardProps = {
  ruleId: string;
  asset: string;
  amount: string;
  ruleType: string;
  cadenceOrTrigger: string;
  nextEvaluation: string;
  stateLabel: string;
  state: RuleCardState;
  dailyCap: string;
  lastEvaluation: string;
  onCancel?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Standard Rule Card. The main active object, not a generic dashboard tile.
 * Order: asset, amount, rule type, trigger/cadence, next evaluation, state,
 * daily cap, cancel action. Mono for IDs/evaluation, sans for decisions.
 */
export function RuleCard({
  ruleId,
  asset,
  amount,
  ruleType,
  cadenceOrTrigger,
  nextEvaluation,
  stateLabel,
  state,
  dailyCap,
  lastEvaluation,
  onCancel,
  children,
  className,
}: RuleCardProps) {
  return (
    <article
      className={cx(
        "rounded-card border border-line bg-surface p-6 shadow-subtle",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-ink">
            {asset} · {amount}
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {ruleType}: {cadenceOrTrigger}
          </p>
        </div>
        <span
          className={cx(
            "inline-flex shrink-0 items-center rounded-xs px-3 py-2 font-mono text-xs tracking-[0.04em]",
            stateTone[state],
          )}
        >
          {stateLabel}
        </span>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-700">Next evaluation</dt>
          <dd className="mt-0.5 font-medium text-ink">{nextEvaluation}</dd>
        </div>
        <div>
          <dt className="text-ink-700">Daily cap</dt>
          <dd className="mt-0.5 font-medium text-ink">{dailyCap}</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
        <p className="font-mono text-xs tracking-[0.04em] text-muted">
          {ruleId} · Last check {lastEvaluation}
        </p>
        {onCancel}
      </div>
      {children}
    </article>
  );
}
