"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { HeroLandscape } from "./hero-landscape";
import { LandingMotion } from "./landing-motion";
import { EnkrateWordmark } from "./enkrate-wordmark";
import { iconButtonClasses } from "./ui";

function PageColumn({ children, isLanding }: { children: ReactNode; isLanding: boolean }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <SiteHeader isLanding={isLanding} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const isLanding = usePathname() === "/";

  if (!isLanding) {
    return <PageColumn isLanding={false}>{children}</PageColumn>;
  }

  return (
    <div className="relative isolate min-h-dvh bg-canvas lg:grid lg:grid-cols-[96px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(auto,1fr)_auto]">
      <HeroLandscape className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[calc(100svh+8rem)] w-full" />
      <LandingMotion />
      <aside className="relative z-10 hidden border-r-0 bg-transparent lg:col-start-1 lg:row-span-2 lg:flex lg:min-h-full lg:flex-col lg:items-center">
        <div className="flex h-[92px] w-full items-center justify-center">
          <Link
            href="/"
            aria-label="Enkrate home"
            className={iconButtonClasses("hover:bg-transparent")}
          >
            <EnkrateWordmark markOnly />
          </Link>
        </div>
      </aside>
      <div className="relative z-10 min-w-0 lg:col-start-2 lg:row-start-1">
        <SiteHeader isLanding />
      </div>
      <main className="relative z-10 min-w-0 lg:col-start-2 lg:row-start-2">{children}</main>
      <div className="relative z-10 min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-3">
        <SiteFooter variant="landing" />
      </div>
    </div>
  );
}
