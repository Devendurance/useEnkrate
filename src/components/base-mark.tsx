import { cx } from "./ui";

type BaseMarkProps = {
  className?: string;
};

/** Compact Base network mark used by the noninteractive logo treatments. */
export function BaseMark({ className }: BaseMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cx("h-7 w-7", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="7" fill="#0052FF" />
      <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="3" />
      <path d="M8 16h16" stroke="white" strokeWidth="3" />
    </svg>
  );
}
