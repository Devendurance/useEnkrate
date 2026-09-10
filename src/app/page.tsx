import { ButtonLink } from "@/components/ui";
import { EligibilityNote } from "@/components/eligibility-note";
import { GuardSection } from "@/components/landing-guard-section";
import { PillarsSection } from "@/components/landing-pillars-section";
import { SegmentsSection } from "@/components/landing-segments-section";
import { HeroStockLogos } from "@/components/hero-stock-logos";
import { StockTicker } from "@/components/stock-ticker";
import { TokenizedStocksFeature } from "@/components/tokenized-stocks-feature";
import { MainnetAssetStatus } from "@/components/mainnet-asset-status";

export default function OverviewPage() {
  return (
    <>
      <div data-landing-stack className="relative isolate">
        <section
          data-landing-hero
          className="landing-hero relative isolate min-h-[calc(100svh-89px)] overflow-hidden lg:sticky lg:top-0 lg:z-0 lg:min-h-svh"
        >
          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-89px)] max-w-[1440px] flex-col items-center justify-start px-6 pb-16 pt-8 text-center min-[600px]:px-10 min-[600px]:pb-20 min-[600px]:pt-12 min-[1024px]:pb-24 min-[1024px]:pt-16">
            <HeroStockLogos />
            <div className="mt-7 flex max-w-[760px] flex-col items-center">
              <h1 className="font-display max-w-[760px] text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.98] font-normal tracking-[-0.03em] text-ink text-balance">
                A programmable stock execution layer for Coinbase Tokenized
                Stocks on Base
              </h1>
              <p className="hero-support-copy mt-6 max-w-[640px] text-base leading-relaxed text-ink min-[600px]:text-lg">
                Set rules for how your tokenized stocks should behave, and Base
                executes them safely even when traditional markets are closed.
              </p>
              <ButtonLink href="/rules/new" className="mt-8">
                Create a rule
              </ButtonLink>
            </div>
          </div>
        </section>

        <div className="relative z-10 isolate bg-canvas">
          <StockTicker className="landing-ticker relative z-30" />

          {/* What Enkrate is */}
          <section
            data-landing-first-sheet
            className="landing-sheet relative border-t border-line bg-canvas shadow-[0_-20px_42px_rgba(10,10,10,0.08)] lg:-mt-[12vh]"
          >
            <div
              data-reveal-section
              className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24"
            >
              <h2 className="font-display max-w-3xl text-3xl leading-tight tracking-[-0.01em] text-ink md:text-5xl">
                Automation is useful only when it remains bounded by rules you can
                see and control.
              </h2>
              <div className="mt-8 max-w-[720px] space-y-5 text-lg leading-relaxed text-ink-700">
                <p>
                  Enkrate gives people a way to automate tokenized-stock actions
                  without turning trust into a blank cheque. You define the intent,
                  the limits, and the approved asset. Enkrate checks the execution
                  context and leaves a readable record of what happened.
                </p>
                <p>
                  Tokenized stocks on Base are programmable, but most users still
                  manage them manually or hand too much authority to bots. Enkrate
                  keeps the rule inside a non-custodial execution path. If a
                  condition fails, the trade is rejected rather than guessed.
                </p>
              </div>
              <TokenizedStocksFeature />
            </div>
          </section>
        </div>
      </div>

      <div className="relative z-10 isolate bg-canvas">
        <EligibilityNote className="mx-auto max-w-[1280px] px-6 pt-10 lg:px-12 lg:pt-16" />
        <MainnetAssetStatus className="mx-auto max-w-[1280px] px-6 lg:px-12" />
        <GuardSection />
        <PillarsSection />
        <SegmentsSection />

        {/* Final CTA + eligibility */}
        <section className="border-t border-line bg-canvas">
          <div
            data-reveal-section
            className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24"
          >
            <h2 className="font-display text-3xl leading-tight tracking-[-0.01em] text-ink md:text-5xl">
              Autopilot, within your rules.
            </h2>
            <p className="mt-4 max-w-[720px] text-lg text-ink-700">
              Build a repeatable rule. Enkrate checks the market, price data,
              slippage, and daily limit before it executes.
            </p>
            <div className="mt-8">
              <ButtonLink href="/rules/new">Create a rule</ButtonLink>
            </div>
            <EligibilityNote className="mt-12 max-w-2xl" />
          </div>
        </section>
      </div>
    </>
  );
}
