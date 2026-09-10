"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Wallet, X } from "lucide-react";
import { buttonClasses, cx, iconButtonClasses } from "./ui";
import { useWallet } from "./web3-provider";
import { BASE_CHAIN_ID, DEPLOYMENT_CONFIGURED } from "@/lib/mainnet-config";

type Variant = "primary" | "secondary" | "accent";

/**
 * Connect wallet after the non-US eligibility attestation (FEAT-05).
 * No transaction is requested by this control.
 */
export function ConnectWallet({
  label = "Connect wallet",
  variant = "primary",
  className,
}: {
  label?: string;
  variant?: Variant;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [attested, setAttested] = useState(false);
  const { account, connect, isConnecting, error } = useWallet();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (account) {
    return <span className={cx("inline-flex h-[52px] items-center rounded-md border border-line px-4 font-mono text-xs text-ink", className)}>{`${account.slice(0, 6)}…${account.slice(-4)}`}</span>;
  }

  return (
    <>
      <button
        type="button"
        className={buttonClasses(variant, className)}
        onClick={() => setOpen(true)}
      >
        <Wallet size={16} aria-hidden />
        {label}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="eligibility-title"
              className="relative w-full max-w-md rounded-feature bg-canvas p-8 shadow-high"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close eligibility dialog"
                className={iconButtonClasses(
                  "absolute top-4 right-4 text-ink-700 hover:bg-transparent hover:text-ink",
                )}
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden />
              </button>

              <p className="font-mono text-xs tracking-[0.04em] text-ink-700 uppercase">
                Eligibility check
              </p>
              <h2
                id="eligibility-title"
                className="font-display mt-2 text-3xl leading-tight text-ink"
              >
                Before you connect
              </h2>
              <p className="mt-3 text-ink-700">
                Coinbase Tokenized Stocks are available only to eligible users
                in permitted jurisdictions outside the United States. Enkrate
                does not determine legal eligibility.
              </p>

              <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(event) => setAttested(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#0F1596]"
                />
                <span>
                  I confirm I am not a US resident and I am not accessing Enkrate
                  from the United States.
                </span>
              </label>

              <button
                type="button"
                className={buttonClasses("primary", "mt-6 w-full")}
                disabled={!attested || isConnecting}
                onClick={async () => { if (await connect()) setOpen(false); }}
              >
                {isConnecting ? "Connecting…" : "Connect to Base Mainnet"}
              </button>
              {error && <p className="mt-4 text-sm text-reject">{error}</p>}
              {!DEPLOYMENT_CONFIGURED && (
                <p className="mt-4 text-xs text-ink-700">
                  Wallet connection is available on Base chain {BASE_CHAIN_ID}. Contract actions unlock when the verified deployment addresses are configured.
                </p>
              )}

              <p className="mt-4 font-mono text-xs tracking-[0.04em] text-muted uppercase">
                Mainnet · eligible non-US users only
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
