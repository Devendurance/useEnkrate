import { cx } from "./ui";

type EnkrateWordmarkProps = {
  tone?: "ink" | "white";
  markOnly?: boolean;
  className?: string;
  "aria-label"?: string;
};

/** Monochrome Enkrate mark and wordmark for light and dark surfaces. */
export function EnkrateWordmark({
  tone = "ink",
  markOnly = false,
  className,
  "aria-label": ariaLabel,
}: EnkrateWordmarkProps) {
  return (
    <svg
      viewBox={markOnly ? "0 0 56 56" : "0 0 250 56"}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cx(
        tone === "white" ? "text-white" : "text-ink",
        markOnly ? "h-8 w-8" : "h-auto w-full",
        className,
      )}
      fill="currentColor"
    >
      <g fill="currentColor">
        <path d="M2.3 19.9 19.1 6.6h12.5v5.7L13.2 24.7v10.1l-10.9 4.4V19.9Z" />
        <path d="M7.2 42.1 22.1 33.5H25v11.1l-14.5 5.9H7.2V42.1Z" />
        <path d="M34.2 15.2h5.6l10.9 10.1v15.5L35.6 50.6H26.4v-7.9l13.1-8.2v-9.8l-5.3-3V15.2Z" />
        <path d="m17.1 24.7 5.3-3.8 11.2 6.7v7.9L17.1 26.2v-1.5Z" />
      </g>
      {!markOnly && (
        <text
          x="68"
          y="41"
          fill="currentColor"
          fontFamily="Arial Black, Arial, Helvetica, sans-serif"
          fontSize="39"
          fontWeight="800"
          letterSpacing="-2.4"
        >
          Enkrate
        </text>
      )}
    </svg>
  );
}
