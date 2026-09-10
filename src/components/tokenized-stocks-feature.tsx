import Image from "next/image";

import { Caption } from "./ui";

/** Wide supporting visual for the landing page's tokenized-stock explanation. */
export function TokenizedStocksFeature() {
  return (
    <figure className="mt-12">
      <div className="relative aspect-[16/9] overflow-hidden rounded-feature border border-line bg-surface shadow-subtle sm:aspect-[16/7] lg:aspect-[21/7]">
        <Image
          src="/sections/tokenized-stocks-display.jpg"
          alt="Tokenized stock representations arranged on a display"
          fill
          loading="lazy"
          sizes="(min-width: 1280px) 1184px, calc(100vw - 3rem)"
          className="object-cover object-center"
        />
      </div>
      <figcaption className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <Caption>Coinbase Tokenized Stocks on Base</Caption>
        <p className="max-w-xl text-sm text-ink-700">
          A programmable home for familiar assets, with execution bounded by
          rules you can see.
        </p>
      </figcaption>
    </figure>
  );
}
