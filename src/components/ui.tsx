import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "accent";

export const focusRingClasses =
  "outline-primary outline-offset-2 focus-visible:outline-2 focus-visible:ring-[3px] focus-visible:ring-accent/60 focus-visible:ring-offset-2";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  const shared =
    `inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-md px-6 font-sans text-[0.8125rem] font-medium leading-none tracking-[0.01em] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:border disabled:hover:border-line-disabled disabled:hover:bg-surface disabled:hover:text-ink-700 ${focusRingClasses}`;
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-ink text-white hover:bg-primary active:bg-black disabled:border disabled:border-line-disabled disabled:bg-surface disabled:text-ink-700",
    secondary:
      "border border-ink bg-transparent text-ink hover:border-link-hover hover:bg-primary/5 hover:text-link-hover disabled:border-line-disabled disabled:bg-surface disabled:text-ink-700",
    accent:
      "bg-accent text-ink hover:bg-accent-pressed disabled:border disabled:border-line-disabled disabled:bg-surface disabled:text-ink-700",
  };
  return cx(shared, variants[variant], className);
}

export function iconButtonClasses(className?: string) {
  return cx(
    "inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-none text-ink transition-colors hover:bg-surface hover:text-link-hover",
    focusRingClasses,
    className,
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link className={buttonClasses(variant, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Caption({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cx(
        "font-mono text-xs tracking-[0.04em] text-ink-700 uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

type StatusTone = "pass" | "waiting" | "rejected" | "neutral";

const statusStyles: Record<StatusTone, string> = {
  pass: "bg-primary text-white",
  waiting: "bg-accent text-ink",
  rejected: "bg-reject text-white",
  neutral: "border border-line-disabled bg-canvas text-ink",
};

export function StatusBadge({
  tone,
  label,
}: {
  tone: StatusTone;
  label: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-xs px-3 py-2 font-mono text-xs tracking-[0.04em]",
        statusStyles[tone],
      )}
    >
      {label}
    </span>
  );
}
