# Product Requirements Document — Enkrate

**Product:** Enkrate  
**Descriptor:** *Programmable execution with onchain guardrails.*  
**Tagline:** *Autopilot, within your rules.*  
**Hackathon:** Base Builder Quests — Coinbase Tokenized Stocks  
**Target network:** Base Mainnet  
**Version:** 2.0 — Hackathon MVP Lock  
**Date:** September 6, 2026

---

## 1. Product Definition

Enkrate lets eligible users create recurring or conditional execution rules for real Coinbase Tokenized Stocks on Base. A rule does not give an automation service unlimited discretion. It commits the stock, amount, timing/price condition, spending boundary, expiry, and after-hours/reference-deviation preferences that must be satisfied before a real Base execution can settle.

### One-line thesis

> **Set the stock rule once. Enkrate executes only inside the boundaries you chose.**

### What makes the MVP specifically B20-native

Enkrate understands that Coinbase Tokenized Stocks are not generic ERC-20s:

- canonical identity is by B20 address;
- one token does not permanently equal one underlying share because of the multiplier;
- the official Chainlink price is already multiplier-adjusted total-return value;
- the issuer oracle registry can pause during corporate actions;
- the 24/5 reference feed can intentionally age while the B20 still trades onchain;
- B20 policies/pauses can affect whether transfers succeed.

---

## 2. Base Builder Quest Fit

The Quest asks builders to create a project that helps people **trade or use Coinbase Tokenized Stocks on Base**.

Enkrate directly helps users trade them by turning a one-off swap into a bounded programmable stock action:

- recurring stock purchase;
- conditional stock purchase;
- explicit after-hours/aged-reference policy;
- real mainnet settlement;
- transparent execution receipt.

The public Quest notice also says projects enabling trading for U.S. users are out of scope. Enkrate must not market or enable the submitted trading experience for U.S. users.

---

## 3. Problem

Tokenized stocks are now continuously transferable/tradable onchain, but a user who wants a repeatable action still has to either:

- execute each stock swap manually; or
- give automation software broad authority and trust it to act correctly.

Coinbase B20 also introduces execution context generic crypto automation may not understand. The official reference feed is 24/5 and holds its last value during closed sessions. Corporate actions are handled through multiplier changes and an issuer-controlled oracle pause. A naive automation system can therefore confuse an old-but-expected reference with a broken feed, or treat a corporate-action freeze as ordinary market inactivity.

### Product problem statement

> **How can a user automate a real tokenized-stock action without giving the executor discretion to ignore the stock's current B20 state or the user's limits?**

---

## 4. Primary User

### Eligible non-U.S. self-custody user holding USDC on Base

They already understand wallets/USDC enough to use Base, but do not want to manually repeat the same tokenized-stock action or remain online waiting for a price condition.

**Job:**

> “Let me define the stock, amount, trigger and limits now, then execute later only if those limits still hold.”

### Secondary user after the hackathon

Wallets, fintechs, and agent builders that want a B20-aware execution primitive. This is an expansion path, not the homepage's primary story.

---

## 5. MVP Experience

### Flow A — Recurring rule

1. Connect wallet on Base Mainnet.
2. Select a supported real B20 stock.
3. Choose `Recurring`.
4. Configure amount and cadence.
5. Configure budget/slippage/reference preferences.
6. Approve a finite amount of USDC.
7. Create rule onchain.
8. Rule appears as `Active — Monitoring`.
9. Keeper evaluates it when due.
10. If all guards and route simulation pass, real stock settles to user's wallet.
11. Enkrate displays a mainnet receipt.

### Flow B — Conditional-price rule

1. Select supported B20 stock.
2. Choose `Conditional price`.
3. Enter maximum realized buy price.
4. Set amount, expiry, spend cap, slippage and after-hours preference.
5. Approve finite USDC amount.
6. Create rule.
7. Keeper monitors and obtains live Base execution quotes.
8. Execution occurs only if the actual settlement can satisfy the trigger and all guards.

---

## 6. MVP Supported Assets

Initial support:

- `AAPLc`
- `GOOGLc`
- `METAc`
- `NVDAc`

These are verified current Coinbase B20 assets supported by 1inch on Base and listed in Base's canonical B20 documentation.

Do not identify assets by ticker alone. The UI may show the ticker, but the protocol registry keys by canonical B20 address.

---

## 7. Core Product Requirements

### P0 — must work before submission

#### REQ-01 Real B20 reads
The app must read real metadata/state for supported B20 contracts on Base Mainnet.

#### REQ-02 Real Coinbase reference data
The app must read each supported asset's official Chainlink B20 feed via `latestRoundData()` and show the value plus `updatedAt`.

#### REQ-03 Coinbase oracle-registry state
The app/guard must read the issuer oracle registry's pause state and multiplier for the target token.

#### REQ-04 Rule creation
User can create one of two rule types:

- `RECURRING`
- `CONDITIONAL_PRICE`

#### REQ-05 Rule cancellation
User can cancel their own active rule.

#### REQ-06 Finite USDC authorization
The mainnet flow must not require an unlimited USDC approval.

#### REQ-07 Spend boundary
A rule must have an enforceable maximum amount per execution and a bounded 24h spend limit.

#### REQ-08 Corporate-action hold
When the Coinbase oracle registry is paused for the target B20, execution must not proceed.

#### REQ-09 Aged-reference behavior
An aged `updatedAt` must not automatically be labeled “broken oracle.”

- user did not allow aged-reference execution → `Waiting — reference aged`
- user allowed it → Enkrate may proceed only under the configured reference-deviation and minimum-output constraints

#### REQ-10 Conditional realized-price enforcement
For a conditional purchase, the realized settlement price must not exceed the user's trigger price.

#### REQ-11 Approved execution adapter
Only the locked mainnet execution adapter can settle rules.

#### REQ-12 Pre-broadcast simulation
The keeper must simulate the real transaction before broadcasting.

#### REQ-13 Mainnet settlement
At least one supported stock must complete a real USDC → Coinbase B20 execution through the product before submission.

#### REQ-14 Durable receipt
Successful execution emits an onchain receipt and the UI links the Base transaction.

#### REQ-15 Honest rejection/evaluation state
Failed simulations/waiting states must not be presented as persisted onchain receipts.

---

## 8. Guard Model

### Guard 1 — canonical B20
The rule's target address must be enabled in the Enkrate B20 registry.

### Guard 2 — lifecycle
The rule must be active and unexpired; recurring intervals must have elapsed.

### Guard 3 — corporate-action pause
`paused == true` in Coinbase's B20 oracle registry is a hard hold.

### Guard 4 — transfer/policy preflight
Where applicable, inspect B20 operation pause/policy state before attempting the transfer. ERC-20 approval alone does not prove a transfer is authorized.

### Guard 5 — spending
Execution amount and cumulative 24h spend must remain inside the user's configured limits.

### Guard 6 — reference behavior
Read Chainlink total-return value and `updatedAt`.

Do not use the previous fixed “15 minutes = stale” rule. The feeds are 24/5, may update on deviation rather than continuously, and hold the last value off-hours.

### Guard 7 — aged-reference permission
If reference age exceeds the selected normal threshold, require user opt-in before continuing.

### Guard 8 — max reference deviation
When aged-reference execution is enabled, the simulated/realized onchain price must remain inside the user's configured deviation from the last published B20 reference.

### Guard 9 — minimum output
The transaction must deliver at least the user's minimum B20 amount.

### Guard 10 — conditional price
For a conditional-price purchase, realized execution price must satisfy the rule's trigger.

---

## 9. Why the After-Hours Model Matters

Enkrate does **not** assume `market closed = block everything`.

The design recognizes three different situations:

1. **Issuer corporate-action hold** — hard block.
2. **Current/acceptable reference** — normal execution constraints.
3. **Aged reference with user opt-in** — execution can continue, but the old reference becomes a bounded anchor and stricter onchain quote protections apply.

This lets Enkrate respect the 24/7 nature of onchain B20 markets without pretending a 24/5 traditional-equity reference is live when it is not.

---

## 10. Execution Integration

### Verified candidates

- **Enso**: supports Coinbase Tokenized Stock swaps through Aerodrome and exposes simulation infrastructure.
- **1inch**: supports AAPLc, GOOGLc, METAc and NVDAc on Base via dApp, wallet and APIs.

### Lock rule

The repo must not declare a final router until a real mainnet quote and simulation have been reproduced for NVDAc and AAPLc.

The chosen integration must prove:

- USDC input;
- exact B20 output address;
- exact recipient;
- quote and min output;
- transaction target/calldata;
- simulation result;
- successful tiny mainnet execution.

---

## 11. Existing UI Routes — Required Behavior

### Overview

- connected Base wallet
- real USDC balance
- real supported B20 balances
- active rules
- B20 reference status summary

### Rules

- create recurring rule
- create conditional-price rule
- configure limits
- finite authorization state
- cancel rule

### Playbooks

Templates only:

- `Weekly Builder`
- `Dip Buyer`
- `After-Hours Guard`

A playbook pre-fills a rule. It is not a marketplace and carries no creator fees in the MVP.

### Receipts

- successful mainnet execution receipts
- Base transaction link
- exact amount spent and received
- realized price
- reference price/time used
- whether aged-reference mode was used
- separate clearly labeled evaluation history

### Guardrail Status

Per asset:

- canonical B20 address
- multiplier
- issuer registry pause
- Chainlink total-return value
- `updatedAt`
- user's authorization
- execution-route availability

---

## 12. Product Language / Statuses

Use:

- `Active — Monitoring`
- `Waiting — Recurring interval not reached`
- `Waiting — Price condition not met`
- `Waiting — Reference aged`
- `Hold — Coinbase corporate action in progress`
- `Blocked — Rule spend limit reached`
- `Blocked — Authorization exhausted`
- `Blocked — Execution price outside your limit`
- `Blocked — Minimum output not met`
- `Executed within your rules`

Do not say `Market closed` when the contract has only observed an aged feed. Market-session UI can be informational if sourced separately.

---

## 13. Non-Functional Requirements

- TypeScript strict mode.
- All supported token addresses configured centrally.
- No private key in client or repository.
- Keeper signer isolated in environment variables/secrets.
- Mainnet write actions require explicit wallet/rule authorization.
- Clear transaction preview before user creates/authorizes a rule.
- Mobile responsive existing shell preserved.
- No fabricated trade, balance, receipt or oracle state in production.

---

## 14. Hackathon Demo Acceptance Criteria

The submission is ready only when the following is true:

1. User connects to Base Mainnet.
2. UI reads a real supported B20 and real Chainlink feed.
3. User creates a real onchain rule.
4. User gives finite USDC authorization.
5. Enkrate can show a meaningful waiting/hold state from real observable data or configured rule conditions.
6. Keeper obtains a real executable route.
7. Preflight simulation passes.
8. A small real USDC → B20 execution succeeds.
9. B20 arrives in user's wallet.
10. Receipts page displays the real Base transaction.

A single flawless real execution is more important than a large feature list.

---

## 15. Explicitly Not in Hackathon Scope

- testnet/mocked stock user experience
- NGN onramp
- incoming-paycheck trigger
- natural-language/AI rule builder
- agent SDK
- event/prediction-market triggers
- personalized basket/index creation
- lending/borrowing
- strategy marketplace
- creator fee sharing
- B2B API
- cross-chain support
- Pyth integration

---

## 16. Success Definition

### Hackathon north star

**One understandable rule → one real guarded B20 execution → one undeniable Base mainnet receipt.**

### Post-hackathon possibilities

After the Quest, the trigger/action model can expand into incoming-USDC allocation, external-event triggers, stock-backed credit actions, agent integrations and fintech APIs without changing the core Enkrate Guard abstraction.

---

## 17. Claims Discipline

Do not use unsupported user-behavior percentages, fabricated slippage statistics, invented willingness-to-pay figures, or speculative TAM/SAM/SOM as facts.

Use only claims supported by the implementation or current sources.

Persistent eligibility language:

> **Coinbase Tokenized Stocks are available only to eligible users in permitted jurisdictions outside the United States. Enkrate does not enable U.S.-resident trading.**

---

## 18. Primary Sources

- Base B20 integration guide: https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- Chainlink Coinbase B20 feeds: https://docs.chain.link/data-feeds/tokenized-equity-feeds/coinbase
- Base tokenized-stocks launch: https://blog.base.org/tokenized-stocks
- Base RFB: https://blog.base.org/request-for-builders-tokenized-stocks
- Enso B20 execution: https://blog.enso.build/enso-expands-tokenized-stock-infrastructure-on-base/
- 1inch B20 execution: https://1inch.com/blog/post/coinbase-tokenized-stocks
