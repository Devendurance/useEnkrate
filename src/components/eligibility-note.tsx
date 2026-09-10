import { cx } from "./ui";

/**
 * Persistent eligibility disclosure (FEAT-05 UI).
 * The boundary stays visible wherever onboarding and trading actions appear.
 */
export function EligibilityNote({ className }: { className?: string }) {
  return (
    <div className={cx("rounded-highlight bg-accent p-6 text-ink", className)}>
      <p className="font-medium">
        Coinbase Tokenized Stocks are available only to eligible users in
        permitted jurisdictions outside the United States.
      </p>
      <p className="mt-1 text-sm text-ink-700">
        Enkrate does not determine legal eligibility. Confirm your own
        eligibility before connecting a wallet or taking a live stock action.
      </p>
    </div>
  );
}
