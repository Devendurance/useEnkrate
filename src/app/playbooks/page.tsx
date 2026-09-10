import { ButtonLink, Caption } from "@/components/ui";

export default function PlaybooksPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24">
      <Caption>Shareable strategy templates</Caption>
      <h1 className="font-display mt-4 text-4xl leading-tight tracking-[-0.01em] text-ink md:text-6xl">
        Playbooks
      </h1>
      <p className="mt-4 max-w-[720px] text-lg text-ink-700">
        Playbooks are ready-made rule templates you can clone into your
        dashboard. Adjust the amount, cadence, and limits before activating.
        The guard always reads your values, not the template&apos;s.
      </p>

      {/* Empty state */}
      <section className="mt-12">
        <div className="rounded-card border border-line bg-surface p-8 text-center shadow-subtle lg:p-12">
          <h2 className="font-display text-2xl text-ink md:text-3xl">
            No playbooks published yet
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-ink-700">
            Publishing and one-click cloning arrive with the strategy
            marketplace. For now, create a rule directly and shape it to your
            own conditions.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/rules/new">Create a rule</ButtonLink>
            <ButtonLink href="/rules" variant="secondary">
              View your rules
            </ButtonLink>
          </div>
          <Caption className="mt-8">
            Strategy marketplace is a post-hackathon release
          </Caption>
        </div>
      </section>

      {/* What a playbook will carry */}
      <section className="mt-16">
        <h2 className="font-display text-2xl leading-snug text-ink md:text-3xl">
          What every playbook will carry
        </h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {[
            "The rule's intent in plain language: what happens and when.",
            "The approved asset and the amount or trigger to start from.",
            "The daily spend cap and slippage limit the creator used.",
            "A one-click clone that copies the structure, not the authority.",
          ].map((item, index) => (
            <li key={item} className="flex gap-4 py-5">
              <span className="font-mono text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-ink-700">{item}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
