import Image from "next/image";
import { BaseMark } from "./base-mark";
import { cx } from "./ui";

const logos = [
  { name: "Base", kind: "base", offset: "min-[600px]:-translate-y-1" },
  { name: "Meta", src: "/stock-logos/meta.jpg", kind: "stock", offset: "min-[600px]:-translate-y-4" },
  { name: "Google", src: "/stock-logos/google.jpg", kind: "stock", offset: "min-[600px]:-translate-y-2" },
  { name: "Amazon", src: "/stock-logos/amazon.jpg", kind: "stock", offset: "min-[600px]:-translate-y-5" },
  { name: "NVIDIA", src: "/stock-logos/nvidia.png", kind: "stock", offset: "min-[600px]:-translate-y-1" },
  { name: "Apple", src: "/stock-logos/apple.jpg", kind: "stock", offset: "min-[600px]:-translate-y-3" },
] as const;

export function HeroStockLogos({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Base and tokenized stock brand examples shown on Base"
      className={cx(
        "relative z-10 flex items-end justify-center gap-1 min-[600px]:gap-5",
        className,
      )}
    >
      {logos.map((logo) => (
        <li
          key={logo.name}
          className={cx(
            "relative flex h-10 w-10 shrink-0 rounded-xl min-[600px]:h-14 min-[600px]:w-14",
            logo.offset,
          )}
        >
          <div
            data-stock-logo-card
            className="relative h-full w-full cursor-pointer overflow-hidden rounded-xl border border-white/80 bg-white shadow-[0_8px_24px_rgba(15,21,150,0.12)] transform-gpu"
          >
            {logo.kind === "base" ? (
              <span
                role="img"
                aria-label="Base logo"
                className="flex h-full w-full items-center justify-center"
              >
                <BaseMark className="h-6 w-6 min-[600px]:h-8 min-[600px]:w-8" />
              </span>
            ) : (
              <Image
                src={logo.src}
                alt={`${logo.name} logo`}
                fill
                sizes="(min-width: 600px) 56px, 40px"
                className="h-full w-full object-cover object-center mix-blend-multiply"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
