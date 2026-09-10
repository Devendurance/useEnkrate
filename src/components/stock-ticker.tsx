import Image from "next/image";
import { BaseMark } from "./base-mark";
import { cx } from "./ui";

const tickerItems = [
  { name: "Base", kind: "base" },
  { name: "Meta", src: "/stock-logos/meta.jpg", kind: "stock" },
  { name: "Google", src: "/stock-logos/google.jpg", kind: "stock" },
  { name: "Amazon", src: "/stock-logos/amazon.jpg", kind: "stock" },
  { name: "NVIDIA", src: "/stock-logos/nvidia.png", kind: "stock" },
  { name: "Apple", src: "/stock-logos/apple.jpg", kind: "stock" },
] as const;

function TickerSet() {
  return (
    <ul className="flex shrink-0 items-center gap-8 pr-8 min-[600px]:gap-12 min-[600px]:pr-12">
      {tickerItems.map((item) => (
        <li key={item.name} className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-line bg-canvas">
            {item.kind === "base" ? (
              <BaseMark />
            ) : (
              <Image
                src={item.src}
                alt=""
                width={36}
                height={36}
                sizes="36px"
                className="h-full w-full object-cover object-center mix-blend-multiply"
              />
            )}
          </span>
          <span className="font-sans text-sm font-medium text-ink">
            {item.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StockTicker({ className }: { className?: string }) {
  return (
    <section
      aria-label="Base and tokenized stock brand examples shown on Base"
      className={cx(
        "overflow-hidden border-y border-line bg-canvas py-3.5",
        className,
      )}
    >
      <p className="sr-only">
        Base, Meta, Google, Amazon, NVIDIA, and Apple logo examples shown on
        Base.
      </p>
      <div data-reveal-section aria-hidden="true" className="overflow-hidden">
        <div className="stock-ticker-track flex w-max items-center">
          <TickerSet />
          <TickerSet />
        </div>
      </div>
    </section>
  );
}
