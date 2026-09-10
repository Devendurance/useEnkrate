"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ConnectWallet } from "./connect-wallet";
import { cx, iconButtonClasses } from "./ui";

const links = [
  { href: "/", label: "Overview" },
  { href: "/rules", label: "Rules" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/receipts", label: "Receipts" },
] as const;

export function SiteHeader({ isLanding = false }: { isLanding?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cx(
        "relative z-10",
        isLanding ? "border-b-0 bg-transparent" : "border-b border-ink bg-canvas",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-6 py-5 min-[1024px]:px-12">
        <div className="flex min-w-0 items-center gap-4 min-[600px]:gap-6">
          <Link
            href="/"
            className={cx(
              "font-display text-xl font-medium text-ink",
              isLanding && "min-[1024px]:hidden",
            )}
            onClick={() => setOpen(false)}
          >
            Enkrate
          </Link>
          {/* Single vertical divider immediately after the mark (per DESIGN.md) */}
          <span
            aria-hidden
            className={cx(
              "h-6 w-px shrink-0 bg-ink",
              isLanding && "min-[1024px]:hidden",
            )}
          />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-4 min-[600px]:flex min-[1024px]:gap-6"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "text-sm font-medium",
                  pathname === link.href
                    ? isLanding
                      ? "text-ink underline underline-offset-4"
                      : "text-primary underline underline-offset-4"
                    : "text-ink hover:text-link-hover",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden shrink-0 min-[600px]:block">
          <ConnectWallet />
        </div>

        <button
          type="button"
          className={iconButtonClasses("min-[600px]:hidden")}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </div>

      {open && (
        <div
          className={cx(
            "min-[600px]:hidden",
            isLanding
              ? "border-t-0 bg-canvas/95 backdrop-blur-sm"
              : "border-t border-line",
          )}
        >
          <nav
            aria-label="Primary mobile"
            className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-6"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "text-base font-medium",
                  pathname === link.href
                    ? isLanding
                      ? "text-ink underline underline-offset-4"
                      : "text-primary underline underline-offset-4"
                    : "text-ink hover:text-link-hover",
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <ConnectWallet className="w-full" />
          </nav>
        </div>
      )}
    </header>
  );
}
