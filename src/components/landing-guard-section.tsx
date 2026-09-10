import { Caption } from "@/components/ui";
import { GuardrailStrip } from "@/components/guardrail-strip";

/** "How the guard works" with the Guardrail Strip and rejection copy. */
export function GuardSection() {
  return (
    <section
      id="how-the-guard-works"
      className="border-t border-line bg-surface"
    >
      <div
        data-reveal-feature
        className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24"
      >
        <div data-reveal-intro>
          <Caption>The guard</Caption>
        </div>
        <h2
          data-reveal-intro
          className="font-display mt-4 max-w-3xl text-3xl leading-tight tracking-[-0.01em] text-ink md:text-5xl"
        >
          A rule should know what must be true before it runs.
        </h2>
        <p data-reveal-intro className="mt-6 max-w-[720px] text-lg text-ink-700">
          Before any execution, Enkrate checks the market session, oracle
          freshness, slippage, approved asset, and daily spend cap. Each check
          is a written state, never just a colour.
        </p>

        <div
          data-reveal-guard-card
          className="mt-10 rounded-card border border-line bg-canvas p-6 shadow-subtle lg:p-8"
        >
          <GuardrailStrip
            itemReveal
            states={{
              "Market session": "pass",
              "Oracle freshness": "pass",
              Slippage: "pass",
              "Approved token": "pass",
              "Spend cap": "pass",
            }}
          />
          <div
            data-reveal-rejection
            className="mt-8 rounded-highlight bg-accent p-6 text-ink"
          >
            <p className="font-medium">
              Execution rejected: oracle data is 21 minutes old.
            </p>
            <p className="mt-1 text-sm text-ink-700">
              When a check fails, the receipt records the exact condition. The
              rejection path is as legible as the success path.
            </p>
          </div>
          <p data-reveal-waiting className="mt-6 text-sm text-ink-700">
            Waiting is also a controlled state:{" "}
            <span className="text-ink">
              &ldquo;Market closed. Your rule has not been cancelled.&rdquo;
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
