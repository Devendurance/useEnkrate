# Enkrate Documentation Replacement Notes

Use this folder to replace the older project documents before continuing implementation.

## Replace these files

| Old uploaded file | Replace with |
|---|---|
| `architecture(1).md` | `architecture.md` |
| `PRD(2).md` | `PRD.md` |
| `product_idea.md` | `product_idea.md` |
| `project-plan(1).md` | `project-plan.md` |
| `enkrate-brand-messaging.md` | `enkrate-brand-messaging.md` |
| `open_source_research.md` | `open_source_research.md` |

## Why all six changed

- **Architecture:** Sepolia/mocks removed; Base Mainnet + real B20 + mainnet execution adapter added.
- **PRD:** unsupported market statistics removed; MVP narrowed; after-hours/reference model corrected.
- **Product idea:** no “dumb bricks,” fake universal-access claims, or generic anti-bot framing; B20-specific thesis made explicit.
- **Project plan:** rewritten around the existing UI shell and a Mainnet Reality Gate rather than rebuilding frontend/mock contracts.
- **Brand messaging:** replaces `market closed → reject` and generic `oracle stale` language with current/aged/corporate-action states.
- **Open-source research:** renames ApexStock/AegisFi references, removes stale Pyth/Synthetix assumptions from the core path, and adds current Enso/1inch execution evidence.

## One implementation rule

Do not let a coding agent implement from the old documents after these replacements are committed. The six files in this folder are intended to be the current source of truth for the Base Builder Quest build.
