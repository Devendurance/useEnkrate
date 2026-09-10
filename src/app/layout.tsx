import type { Metadata } from "next";
import { Fraunces, Space_Mono } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import { Web3Provider } from "@/components/web3-provider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
    title: "Enkrate | Programmable execution with onchain guardrails",
  description:
    "Set a recurring or conditional rule once. Enkrate executes only when your price, market-session, data-freshness, slippage, and daily-limit checks pass.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Web3Provider>
          <SiteShell>{children}</SiteShell>
        </Web3Provider>
      </body>
    </html>
  );
}
