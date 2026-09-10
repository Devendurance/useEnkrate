import { ButtonLink, Caption } from "@/components/ui";

const segments = [
  {
    who: "Remote earners and freelancers",
    headline: "Turn a USDC payday into a repeatable stock rule.",
    support:
      "Set the amount and cadence once. Enkrate checks the conditions before it runs, so the habit does not depend on remembering every payday.",
    cta: { label: "Create a recurring rule", href: "/rules/new" },
  },
  {
    who: "Cross-timezone traders",
    headline:
      "Set the conditions before sleep. Wake up to a receipt, not a mystery.",
    support:
      "Enkrate shows the market session, data freshness, slippage, and daily limit before a rule can execute.",
    cta: { label: "Set a conditional rule", href: "/rules/new" },
  },
  {
    who: "Neobrokers and wallets",
    headline:
      "Add bounded stock execution without building the guardrail layer from scratch.",
    support:
      "Offer programmable rules, visible limits, and readable execution outcomes through an integration designed around non-custodial execution.",
    cta: { label: "Explore the execution layer", href: "/playbooks" },
  },
  {
    who: "Agent builders",
    headline:
      "Give an agent a rule it can explain and a limit it cannot ignore.",
    support:
      "Define the approved asset, action, and allowance. Use the guardrail path to make automated execution inspectable.",
    cta: { label: "Review the agent execution model", href: "/rules" },
  },
] as const;

/** Audience segments from docs/enkrate-brand-messaging.md section 9. */
export function SegmentsSection() {
  return (
    <section className="border-t border-line bg-surface">
      <div
        data-reveal-section
        className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24"
      >
        <Caption>Who it is for</Caption>
        <h2 className="font-display mt-4 max-w-3xl text-3xl leading-tight tracking-[-0.01em] text-ink md:text-5xl">
          Built for eligible non-US users first.
        </h2>
        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {segments.map((segment) => (
            <div key={segment.who} className="border-t border-line pt-6">
              <Caption>{segment.who}</Caption>
              <h3 className="font-display mt-3 text-2xl leading-snug text-ink">
                {segment.headline}
              </h3>
              <p className="mt-3 text-ink-700">{segment.support}</p>
              <ButtonLink
                href={segment.cta.href}
                variant="secondary"
                className="mt-6"
              >
                {segment.cta.label}
              </ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
