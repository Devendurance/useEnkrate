import { cx } from "./ui";

export type ReceiptOutcome = "executed" | "rejected";

type ExecutionReceiptProps = {
  id?: string;
  outcome: ReceiptOutcome;
  ruleId: string;
  asset: string;
  ruleType?: string;
  amount?: string;
  timestamp?: string;
  checks?: string[];
  reason?: string;
  txLabel?: string;
  txHref?: string;
  spent?: string;
  received?: string;
  realizedPrice?: string;
  referencePrice?: string;
  referenceAge?: string;
  multiplier?: string;
  guidance?: string;
  className?: string;
};

/**
 * Execution Receipt, the product's proof surface (per DESIGN.md):
 * off-black feature card, 32px padding, 20px radius, high elevation.
 * Shows outcome, rule + asset, amount + timestamp, checks or the exact
 * failed condition, transaction link, and guidance when relevant.
 */
export function ExecutionReceipt({
  id,
  outcome,
  ruleId,
  asset,
  ruleType,
  amount,
  timestamp,
  checks,
  reason,
  txLabel,
  txHref,
  spent,
  received,
  realizedPrice,
  referencePrice,
  referenceAge,
  multiplier,
  guidance,
  className,
}: ExecutionReceiptProps) {
  const executed = outcome === "executed";
  return (
    <article
      id={id}
      className={cx(
        "rounded-feature bg-ink p-8 text-white shadow-high",
        className,
      )}
    >
      <h3 className="font-display text-2xl leading-snug">
        {executed ? "Executed within your rules" : "Execution rejected"}
      </h3>

      <dl className="mt-6 space-y-2 font-mono text-xs tracking-[0.04em] text-white/70">
        <div className="flex gap-2">
          <dt className="shrink-0">Rule</dt>
          <dd className="text-white">{ruleId}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0">Asset</dt>
          <dd className="text-white">
            {asset}
            {ruleType ? ` · ${ruleType}` : ""}
          </dd>
        </div>
        {amount && (
          <div className="flex gap-2">
            <dt className="shrink-0">Amount</dt>
            <dd className="text-white">{amount}</dd>
          </div>
        )}
        {timestamp && (
          <div className="flex gap-2">
            <dt className="shrink-0">Time</dt>
            <dd className="text-white">{timestamp}</dd>
          </div>
        )}
        {spent && <div className="flex gap-2"><dt className="shrink-0">USDC spent</dt><dd className="text-white">{spent}</dd></div>}
        {received && <div className="flex gap-2"><dt className="shrink-0">B20 received</dt><dd className="text-white">{received}</dd></div>}
        {realizedPrice && <div className="flex gap-2"><dt className="shrink-0">Realized price</dt><dd className="text-white">{realizedPrice}</dd></div>}
        {referencePrice && <div className="flex gap-2"><dt className="shrink-0">Reference price</dt><dd className="text-white">{referencePrice}</dd></div>}
        {referenceAge && <div className="flex gap-2"><dt className="shrink-0">Reference age</dt><dd className="text-white">{referenceAge}</dd></div>}
        {multiplier && <div className="flex gap-2"><dt className="shrink-0">Multiplier</dt><dd className="text-white">{multiplier}</dd></div>}
      </dl>

      {executed && checks && checks.length > 0 && (
        <ul className="mt-6 space-y-1.5 font-mono text-xs tracking-[0.04em] text-white/80">
          {checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      )}

      {!executed && reason && (
        <p className="mt-6 border-l-2 border-reject pl-3 text-sm text-white/90">
          {reason}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/15 pt-6">
        {txLabel && (
          <a href={txHref} target="_blank" rel="noreferrer" className="font-mono text-xs tracking-[0.04em] text-accent underline underline-offset-4">
            {txLabel}
          </a>
        )}
        {guidance && (
          <span className="text-sm text-white/70">{guidance}</span>
        )}
      </div>
    </article>
  );
}
