# QWEN.md — Project Context for AI Agents

## Agent Session State (READ FIRST)

`agent-state/` holds the live session state: `left-off.md` (current work + next steps), `project-state.md` (what's built / architecture), `memory.md` (durable decisions). Read all three at session start and update them at milestones and before the session ends or is compacted — see the AGENT STATE PROTOCOL in `AGENTS.md`.

## Project Overview

**ApexStock (AegisFi)** — a hackathon entry for the Base Builder Quests (Sep 2026). A non-custodial, programmable execution and risk-protection engine for **Coinbase Tokenized Stocks on Base** (Coinbase L2). Users define intent-based rules ("buy $100 of cbNVDA if price ≤ $115", "DCA $25 of cbSPY weekly") that are executed by offchain keepers, gated by the onchain **Aegis risk layer** (oracle staleness ≤ 15 min, daily spend caps, slippage guards, market-hours awareness, token whitelist). Authorization via Permit2 / Coinbase Smart Wallet — funds never leave the user's wallet until execution.

Target users: non-US retail investors (strictly non-US by regulatory mandate), emerging-market freelancers paid in USDC, cross-timezone traders, and B2B neobrokers.

**Current state:** early scaffold stage. A fresh create-next-app exists (default landing page, no app logic yet). Smart contracts, keeper bot, and web3 integrations are not yet started.

## Commands

Package manager is **npm**. Windows (win32) environment — mind CRLF/PATH quirks.

```bash
npm run dev     # dev server at http://localhost:3000 (Turbopack)
npm run build   # production build (also runs TypeScript checks)
npm run start   # serve production build
npm run lint    # ESLint (flat config)
```

No test framework is configured yet. If asked to verify changes without a test setup, ask the user whether to skip testing (per AGENTS.md rules).

## Tech Stack

- **Next.js 16.3.4** (App Router, Turbopack, typed routes) + **React 19.2.8**
- **TypeScript 5** (`strict: true`), `@/*` import alias → `src/*`
- **Tailwind CSS v4** — CSS-first config in `src/app/globals.css` via `@theme inline` (no `tailwind.config` file)
- **ESLint 9** flat config (`eslint.config.mjs`): `eslint-config-next/core-web-vitals` + TypeScript preset

Planned additions (per PRD §11 — not yet installed):

- Frontend: `wagmi` v2, `viem`, Coinbase **OnchainKit**
- Contracts: Foundry, Solidity ^0.8.24, OpenZeppelin v5, Uniswap **Permit2**
- Oracles: **Pyth Network** pull oracle (staleness + confidence gating), Chainlink fallback
- Keeper: Node.js/TypeScript worker using Viem (`canExecute()` resolver pattern)

## Architecture & Layout

```
src/app/            # App Router root — layout.tsx (Geist fonts), page.tsx, globals.css
docs/               # Product documentation (see below)
public/             # Static assets
```

Key patterns:

- App lives in `src/` (src-dir convention). Layout uses `next/font` Geist Sans/Mono with CSS variables `--font-geist-sans` / `--font-geist-mono`.
- Typed routes are generated (`.next/types`); components receive typed props e.g. `LayoutProps<"/">`.
- `next.config.ts` is empty/default — extend as needed.

### Product architecture (target, from PRD)

User → Next.js dashboard (OnchainKit wallet) → rules committed onchain to `ApexExecutionEngine.sol` → keepers poll read-only `canExecute(ruleId)` → Aegis invariant checks (fresh oracle price, spend cap, slippage, market session, token whitelist) → swap routed via Aerodrome/Uniswap v3 → stock tokens delivered to user wallet. Custom `Aegis__OracleStale()`, `Aegis__SpendCapExceeded()` revert errors.

## Documentation Map

| File | Contents |
|---|---|
| `docs/PRD.md` | Full product requirements: personas, MoSCoW features (FEAT-01…FEAT-10), user stories, architecture, hackathon phases. **Read before scoping features.** |
| `docs/product_idea.md` | Non-technical product explanation (plain-English pitch, feature narratives). |
| `docs/open_source_research.md` | Deep architectural precedents: Composable CoW, Gelato resolver pattern, Rhinestone/Zodiac guards, Synthetix circuit breakers, Pyth SDK, Mean Finance DCA, Permit2. Includes "reuse vs avoid" guidance. |
| `open_source_research.md` | Identical copy of the docs/ version (exists in both places). |
| `AGENTS.md` | Critical working rules (see below). `CLAUDE.md` just references it. |

## Development Conventions (from AGENTS.md — must follow)

- **Responses:** concise, to the point.
- **Planning:** always ask clarifying questions; never assume design/stack/features.
- **Edits:** never spawn subagents for file modifications, migrations, or terminal commands — execute inline.
- **After completing any feature:** run `npm run lint` + type check + `npm run build` to verify.
- **Database:** if a schema is ever added (Drizzle expected), ALWAYS run `drizzle generate` + migrate; NEVER `drizzle push`.
- **Testing:** never assume changes work — test; ask user if no tooling exists.
- **UI:** follow the design system in `DESIGN.md` (not yet created).

## Hackathon Timeline (from PRD)

- **Phase 1:** `ApexExecutionEngine.sol` + Aegis guardrails on Base Sepolia, minimal keeper bot.
- **Phase 2:** Next.js OnchainKit dashboard (Rule Builder, Aegis HUD), Loom demo.
- **Phase 3 (post-hackathon):** audits, Strategy Store, B2B neobroker API.
