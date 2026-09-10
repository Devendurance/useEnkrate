import { Check, Clock, X } from "lucide-react";
import { cx } from "./ui";

export type GuardState = "pass" | "waiting" | "rejected";

export const GUARD_NAMES = [
  "Market session",
  "Oracle freshness",
  "Slippage",
  "Approved token",
  "Spend cap",
] as const;

export type GuardName = (typeof GUARD_NAMES)[number];

const stateStyles: Record<GuardState, string> = {
  pass: "bg-primary text-white",
  waiting: "bg-accent text-ink",
  rejected: "bg-reject text-white",
};

const stateLabels: Record<GuardState, string> = {
  pass: "Pass",
  waiting: "Waiting",
  rejected: "Rejected",
};

const stateIcons: Record<GuardState, typeof Check> = {
  pass: Check,
  waiting: Clock,
  rejected: X,
};

/**
 * Guardrail Strip turns the high-risk execution moment into a readable
 * sequence. Every state is written, never colour-only (per DESIGN.md).
 */
export function GuardrailStrip({
  states,
  className,
  itemReveal = false,
}: {
  states: Partial<Record<GuardName, GuardState>>;
  className?: string;
  itemReveal?: boolean;
}) {
  return (
    <ul className={cx("flex flex-col gap-2 sm:flex-row sm:flex-wrap", className)}>
      {GUARD_NAMES.map((name) => {
        const state = states[name] ?? "waiting";
        const Icon = stateIcons[state];
        return (
          <li
            key={name}
            data-reveal-check={itemReveal ? true : undefined}
            className={cx(
              "inline-flex items-center gap-2 rounded-sm px-3 py-2 font-mono text-xs tracking-[0.04em]",
              stateStyles[state],
            )}
          >
            <Icon size={14} aria-hidden />
            <span>{name}</span>
            <span aria-hidden>·</span>
            <span className="font-bold">{stateLabels[state]}</span>
          </li>
        );
      })}
    </ul>
  );
}
