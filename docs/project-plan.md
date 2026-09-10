# Enkrate — Base Builder Quest Execution Plan

**Deadline:** September 9, 2026, 11:59 PM EST (per Base Builder Quest notice)  
**Network:** Base Mainnet  
**Product state:** UI shell and routes already built  
**Plan version:** Mainnet Lock v2.0 — September 6, 2026

---

## 1. Goal

Ship one polished, working Base Mainnet product that proves:

> **A user can create a bounded rule for a real Coinbase Tokenized Stock, Enkrate can evaluate the stock's real B20/reference state and a real execution route, and a passing rule can settle a real B20 into the user's wallet with a verifiable Base receipt.**

No submitted user flow uses mock equities or Base Sepolia.

Internal unit tests and mainnet-fork tests may use mocks/forks where appropriate.

---

## 2. Scope Lock

### Build now

- real Base Mainnet wallet connection
- canonical B20 registry
- initial assets: AAPLc, GOOGLc, METAc, NVDAc
- real Chainlink Coinbase B20 feeds
- Coinbase oracle-registry pause + multiplier read
- recurring rule
- conditional-price rule
- finite USDC authorization
- spend limit
- rule expiry
- aged-reference opt-in
- max reference deviation
- min output / slippage protection
- execution adapter
- keeper/resolver
- real mainnet execution
- onchain execution receipt
- clearly labeled evaluation history
- existing UI route wiring

### Do not build before submission

- Base Sepolia experience
- mock stock UI
- NGN/onramp
- paycheck trigger
- AI/natural-language rule input
- agent SDK
- event triggers
- personalized baskets
- lending/credit
- strategy marketplace
- creator fees
- B2B SDK
- Pyth
- cross-chain

---

## 3. Phase 0 — Mainnet Reality Gate (DO FIRST)

**Do not start the final execution contract until this passes.**

### Objective

Prove one real quote/simulation path for NVDAc and AAPLc.

### Tasks

- [ ] Read Base USDC address from a canonical source/current repo config.
- [ ] Request real USDC → NVDAc quote from Enso.
- [ ] Record route target, calldata format, recipient semantics, quote amount, and simulation behavior.
- [ ] Request real USDC → NVDAc quote from 1inch if needed for comparison/fallback.
- [ ] Repeat for AAPLc.
- [ ] Confirm a tiny amount can be quoted without pathological slippage.
- [ ] Confirm how min output / slippage is encoded/enforced.
- [ ] Confirm exact contract(s) Enkrate must approve/call.
- [ ] Decide **one** primary execution adapter.
- [ ] Write `docs/mainnet-reality-gate.md` with evidence.

### Gate

Proceed only when at least one provider gives a reproducible real quote + successful transaction simulation for NVDAc and AAPLc.

---

## 4. Phase 1 — B20 Data Layer

### Objective

Make the current UI read real Coinbase stock state before writing any trading logic.

### Tasks

- [ ] Add central `B20_ASSETS` registry keyed by contract address.
- [ ] Add AAPLc, GOOGLc, METAc, NVDAc canonical addresses.
- [ ] Add official Chainlink feed addresses.
- [ ] Add Coinbase oracle-registry address.
- [ ] Read `name`, `symbol`, `decimals`, balances.
- [ ] Read multiplier/scaled state required by the UI.
- [ ] Read registry `paused` state.
- [ ] Read Chainlink `latestRoundData()` and expose `updatedAt`.
- [ ] Verify no code multiplies the Chainlink B20 price by the multiplier again.
- [ ] Surface data in Guardrail Status.

### Done when

The live app can show, for NVDAc:

```text
Canonical address
Wallet balance
Multiplier
Issuer registry pause
Coinbase/Chainlink reference value
Reference updatedAt
```

from Base Mainnet.

---

## 5. Phase 2 — Contract Core

### Contracts

Suggested minimal split:

```text
EnkrateAssetRegistry.sol
EnkrateExecutionEngine.sol
EnkrateGuard.sol
IExecutionAdapter.sol
<LockedProvider>ExecutionAdapter.sol
```

Do not create modularity that is not needed for the deadline.

### Tasks

- [ ] `createRule()`
- [ ] `cancelRule()`
- [ ] rule ownership checks
- [ ] recurring interval
- [ ] conditional price
- [ ] expiry
- [ ] spend-window accounting
- [ ] corporate-action hold
- [ ] canonical asset validation
- [ ] aged-reference opt-in state
- [ ] reference deviation check
- [ ] min output
- [ ] realized execution-price check
- [ ] successful `ExecutionReceipt`

### Important correction

Do **not** implement:

```text
if updatedAt older than 15 minutes → ORACLE_STALE revert
```

The official B20 feeds are 24/5 and may intentionally hold the last value. Use the new current/aged/corporate-action model.

---

## 6. Phase 3 — Mainnet-Fork Verification

Run before deploying the Enkrate contracts to mainnet.

### Required tests

- [ ] create/cancel rule
- [ ] rule expiry
- [ ] interval not reached
- [ ] spend cap reached
- [ ] unknown B20 rejected
- [ ] corporate-action pause rejected/held using controlled unit fixture
- [ ] reference aged + opt-out waits
- [ ] reference aged + opt-in but excessive deviation rejects
- [ ] conditional price not met rejects
- [ ] min output rejects
- [ ] keeper cannot change recipient
- [ ] keeper cannot change stock
- [ ] keeper cannot increase spend
- [ ] real mainnet-fork route executes through chosen adapter
- [ ] user's B20 balance increases
- [ ] execution receipt fields match settlement

Use mocks for hard-to-trigger issuer states in **tests only**. They must not appear in the production app.

---

## 7. Phase 4 — Deploy Mainnet Contracts

### Safety rules

- [ ] deploy with the smallest practical functionality
- [ ] verify source on explorer where possible
- [ ] owner/admin cannot move user funds arbitrarily
- [ ] only canonical asset registry entries enabled
- [ ] only locked execution adapter enabled
- [ ] no unlimited approval requirement
- [ ] start with tiny personal test amounts

### First real execution

Run one manual/controlled Enkrate rule with a tiny amount before enabling the keeper loop.

Record:

- rule creation tx
- authorization tx
- execution tx
- B20 received
- effective price
- receipt event

---

## 8. Phase 5 — Wire Existing UI Shell

### Overview

- [ ] Base Mainnet state only
- [ ] real wallet USDC/B20 balances
- [ ] active rule counts/status
- [ ] current reference summary

### Rules

- [ ] Recurring
- [ ] Conditional price
- [ ] finite authorization prompt
- [ ] cancel rule
- [ ] clear after-hours/aged-reference option

### Playbooks

Keep to three templates:

- [ ] Weekly Builder
- [ ] Dip Buyer
- [ ] After-Hours Guard

Templates must only pre-fill rule parameters.

### Receipts

- [ ] real Base tx link
- [ ] amount spent
- [ ] amount B20 received
- [ ] realized price
- [ ] reference + updatedAt
- [ ] aged-reference flag
- [ ] evaluation records clearly labeled as non-onchain

### Guardrail Status

- [ ] canonical address
- [ ] multiplier
- [ ] corporate-action/registry pause
- [ ] reference price + age
- [ ] USDC allowance remaining
- [ ] route availability / latest quote state

---

## 9. Phase 6 — Keeper

### MVP behavior

```text
poll active rules
→ static eligibility
→ B20 + registry + Chainlink reads
→ get real quote
→ simulate executeRule
→ broadcast only on successful simulation
→ persist tx/result
```

### Requirements

- [ ] no user private keys
- [ ] keeper cannot alter rule recipient
- [ ] keeper cannot alter target stock
- [ ] keeper cannot exceed rule amount
- [ ] failed simulations are not broadcast
- [ ] retry logic does not cause duplicate executions
- [ ] recurring rule timestamp updates atomically after successful execution

---

## 10. Phase 7 — End-to-End Product Gate

Test with a fresh/clean browser state.

### Required path

- [ ] open deployed app
- [ ] Base Mainnet selected
- [ ] connect wallet
- [ ] eligibility disclosure visible
- [ ] select real NVDAc or AAPLc
- [ ] create rule
- [ ] approve finite USDC
- [ ] rule appears active
- [ ] keeper evaluates
- [ ] real quote obtained
- [ ] simulation passes
- [ ] execution broadcasts
- [ ] B20 arrives
- [ ] receipt renders with Base tx
- [ ] page refresh preserves onchain state
- [ ] no console errors

---

## 11. Demo Story

The demo should prove the product, not every roadmap idea.

### Beat 1 — Context

“Coinbase stocks now trade on Base, but programmable execution needs to understand both the user's limits and B20-specific reference/corporate-action state.”

### Beat 2 — Create a rule

Create a real NVDAc recurring or conditional rule with a small amount.

### Beat 3 — Show the guard

Show the exact observable conditions Enkrate checks. If a natural real waiting condition exists, use it. Otherwise show a rule condition such as price not met / authorization boundary rather than fabricating issuer state.

### Beat 4 — Real execution

Execute a tiny real mainnet purchase.

### Beat 5 — Receipt

Show B20 in wallet + Basescan transaction + Enkrate receipt.

### Beat 6 — Why Enkrate

“Onchain stocks can keep moving while the traditional reference behaves differently. Enkrate lets automation act, but only inside rules the user can inspect.”

---

## 12. Submission Checklist

- [ ] live production URL
- [ ] public GitHub repository
- [ ] README matches mainnet product
- [ ] no mock/testnet screenshots in product claims
- [ ] current architecture/PRD committed
- [ ] contract addresses documented
- [ ] mainnet execution tx documented
- [ ] Loom recorded
- [ ] X post published tagging required Base account
- [ ] official submission form completed before deadline
- [ ] U.S.-trading exclusion stated

---

## 13. Kill Criteria

If the mainnet reality gate cannot produce a safe real route for the chosen stock, **do not fake execution**.

Fallback order:

1. switch from Enso to verified 1inch route or vice versa;
2. reduce supported stocks to the exact asset with a proven route;
3. keep real B20 reads and rule creation, but be transparent that execution is disabled if no safe route can be proven.

A smaller truthful product is better than a fabricated live trade.

---

## 14. Primary Sources

- Base B20 guide: https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- Chainlink B20 feeds: https://docs.chain.link/data-feeds/tokenized-equity-feeds/coinbase
- Base Builder RFB: https://blog.base.org/request-for-builders-tokenized-stocks
- Enso support: https://blog.enso.build/enso-expands-tokenized-stock-infrastructure-on-base/
- 1inch support: https://1inch.com/blog/post/coinbase-tokenized-stocks
