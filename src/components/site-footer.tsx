import Link from "next/link";
import { ButtonLink, Caption } from "./ui";
import { EnkrateWordmark } from "./enkrate-wordmark";

const footerLinks = [
  { href: "/", label: "Overview" },
  { href: "/rules", label: "Rules" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/receipts", label: "Receipts" },
] as const;

type SiteFooterProps = {
  variant?: "default" | "landing";
};

export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  if (variant === "landing") {
    return <LandingFooter />;
  }

  return (
    <footer className="border-t border-ink bg-canvas">
      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div>
            <p className="font-display text-2xl text-ink">Enkrate</p>
            <Caption className="mt-2 normal-case">
              Programmable execution with onchain guardrails
            </Caption>
            <p className="mt-4 max-w-sm text-sm text-ink-700">
              Autopilot, within your rules. Set the rule once; Enkrate checks
              the conditions before it runs.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-ink hover:text-link-hover"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 border-t border-line pt-6">
          <Caption>
            Designed for eligible non-US users · US-resident trading is not
            enabled · Base Mainnet
          </Caption>
          <p className="mt-2 text-xs text-muted">
            © 2026 Enkrate. Built on Base. Review the live guard state before
            each user-authorized action.
          </p>
        </div>
      </div>
    </footer>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-ink px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="overflow-hidden rounded-[24px] border border-white/15 bg-canvas">
        <div className="flex min-h-0 flex-col lg:min-h-[clamp(620px,78svh,820px)]">
          <div className="grid flex-1 gap-16 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-12 lg:gap-10 lg:px-20 lg:py-16">
            <div className="lg:col-span-5">
              <p className="font-display max-w-xl text-[clamp(2.2rem,4.5vw,5rem)] leading-[0.92] tracking-[-0.04em] text-ink">
                Autopilot, within your rules.
              </p>
              <Caption className="mt-8 normal-case">
                Programmable execution with onchain guardrails
              </Caption>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-700">
                Set the rule once. Enkrate checks the conditions before it runs.
              </p>
            </div>

            <div className="lg:col-span-5 lg:col-start-8">
              <Caption>Start with a rule</Caption>
              <h2 className="font-display mt-4 max-w-md text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                Keep the action inside the limits you set.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-700">
                Create a recurring or conditional rule for Coinbase Tokenized
                Stocks on Base.
              </p>
              <ButtonLink href="/rules/new" className="mt-7">
                Create a rule
              </ButtonLink>
            </div>

            <div className="mt-auto grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:col-span-8 lg:col-start-1 lg:gap-16">
              <div>
                <Caption>Network</Caption>
                <p className="mt-4 text-base text-ink">Base</p>
                <p className="mt-1 text-sm text-ink-700">
                  Coinbase Tokenized Stocks
                </p>
                <p className="mt-1 text-sm text-ink-700">Base Mainnet · chain 8453</p>
              </div>

              <nav aria-label="Footer" className="flex flex-col items-start">
                <Caption>Explore</Caption>
                <div className="mt-4 flex flex-col items-start gap-1">
                  {footerLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-base text-ink transition-colors hover:text-link-hover"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>

            <div className="mt-auto lg:col-span-4 lg:col-start-9 lg:self-end">
              <EnkrateWordmark
                aria-label="Enkrate"
                className="max-w-[520px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-ink px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-20">
            <Caption className="text-white/70">
              Designed for eligible non-US users · US-resident trading is not
              enabled · Base Mainnet
            </Caption>
            <p className="text-xs text-white/60">
              © 2026 Enkrate. Built on Base. Review the live guard state before
              each user-authorized action.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
