import { Caption } from "@/components/ui";
import { EligibilityNote } from "@/components/eligibility-note";
import { LiveReceipts } from "@/components/live-receipts";

const receiptAnatomy = ["Rule ID and canonical B20 asset.", "USDC spent and B20 received.", "Realized price, reference value, age, and multiplier.", "Successful Base transaction link."];

export default function ReceiptsPage() {
  return <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24"><Caption>Proof of what happened · Base Mainnet</Caption><h1 className="font-display mt-4 text-4xl leading-tight tracking-[-0.01em] text-ink md:text-6xl">Receipts</h1><p className="mt-4 max-w-[720px] text-lg text-ink-700">Successful executions leave a receipt from the engine. Waiting and evaluation states remain separate and never appear as fabricated onchain outcomes.</p><EligibilityNote className="mt-10 max-w-3xl" /><LiveReceipts /><section className="mt-16"><h2 className="font-display text-2xl leading-snug text-ink md:text-3xl">What every receipt records</h2><ul className="mt-6 divide-y divide-line border-y border-line">{receiptAnatomy.map((item, index) => <li key={item} className="flex gap-4 py-5"><span className="font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span><p className="text-ink-700">{item}</p></li>)}</ul></section></div>;
}