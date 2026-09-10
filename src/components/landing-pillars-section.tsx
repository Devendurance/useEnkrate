import { Caption } from "@/components/ui";

const pillars = [
  {
    title: "Make the habit automatic",
    message:
      "Set recurring rules once and remove repeated manual steps from the routine.",
    proofs: [
      "Define an amount and a cadence.",
    "The rule stays visible as Active: Monitoring.",
      "No rebuilding the same instruction every cycle.",
    ],
    outcome: "A calmer, more consistent investing habit.",
  },
  {
    title: "Make execution context-aware",
    message: "A rule should know what must be true before it runs.",
    proofs: [
      "Market-session status is visible.",
      "Stale oracle data can be rejected, not treated as current.",
      "Slippage and daily-limit conditions are explicit.",
    ],
    outcome:
      "Understandable execution while you are offline or in another timezone.",
  },
  {
    title: "Keep autonomy bounded",
    message:
      "Automation can act, but only inside the authority the user defines.",
    proofs: [
      "Daily spend caps you configure.",
      "Approved-token restrictions.",
      "Cancel any active rule.",
    ],
    outcome: "Boundaries that are visible and testable.",
  },
] as const;

/** The three messaging pillars use ruled columns, not rounded cards. */
export function PillarsSection() {
  return (
    <section className="border-t border-line bg-canvas">
      <div
        data-reveal-section
        className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24"
      >
        <Caption>Why Enkrate</Caption>
        <h2 className="font-display mt-4 max-w-3xl text-3xl leading-tight tracking-[-0.01em] text-ink md:text-5xl">
          Autonomy without surrendering control.
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="border-t-2 border-ink pt-6">
              <h3 className="text-xl font-semibold text-ink">{pillar.title}</h3>
              <p className="mt-3 text-ink-700">{pillar.message}</p>
              <ul className="mt-5 space-y-2 text-sm text-ink-700">
                {pillar.proofs.map((proof) => (
                  <li key={proof} className="flex gap-2">
                    <span aria-hidden className="text-primary">
                      •
                    </span>
                    {proof}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-sm text-ink">
                {pillar.outcome}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
