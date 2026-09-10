"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { explorerTxUrl } from "@/lib/mainnet-config";
import { formatToken, formatUsdc } from "@/lib/format";
import type { ExecutionNotification } from "@/lib/execution-activity";
import { cx, focusRingClasses } from "./ui";

export function ExecutionToastViewport({
  notifications,
  onDismiss,
}: {
  notifications: readonly ExecutionNotification[];
  onDismiss: (key: string) => void;
}) {
  if (notifications.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-3 sm:left-auto sm:right-6 sm:w-[min(28rem,calc(100vw-3rem))]" aria-label="Execution notifications">
      {notifications.map((notification) => (
        <ExecutionToast key={notification.key} notification={notification} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ExecutionToast({
  notification,
  onDismiss,
}: {
  notification: ExecutionNotification;
  onDismiss: (key: string) => void;
}) {
  useAutoDismiss(notification.key, onDismiss);
  return (
    <div
      className="pointer-events-auto rounded-feature bg-ink p-5 text-white shadow-high"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-display text-xl leading-snug">Rule executed successfully</p>
            <p className="mt-1 text-sm leading-6 text-white/80">
              Bought {formatToken(notification.amountOut)} {notification.asset} for {formatUsdc(notification.amountIn)} USDC
            </p>
          </div>
        </div>
        <button
          type="button"
          className={cx("min-h-10 min-w-10 shrink-0 rounded-xs p-2 text-white/75 hover:bg-white/10 hover:text-white", focusRingClasses)}
          aria-label="Dismiss execution notification"
          onClick={() => onDismiss(notification.key)}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-4 font-mono text-xs tracking-[0.04em]">
        <Link
          href={`/receipts#receipt-${notification.transactionHash}`}
          className={cx("text-accent underline underline-offset-4 hover:text-white", focusRingClasses)}
        >
          View receipt
        </Link>
        <a
          href={explorerTxUrl(notification.transactionHash)}
          target="_blank"
          rel="noreferrer"
          className={cx("text-accent underline underline-offset-4 hover:text-white", focusRingClasses)}
        >
          View Base transaction
        </a>
      </div>
    </div>
  );
}

function useAutoDismiss(key: string, onDismiss: (key: string) => void) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(key), 8_000);
    return () => clearTimeout(timeout);
  }, [key, onDismiss]);
}
