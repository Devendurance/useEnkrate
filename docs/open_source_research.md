# Enkrate Open-Source & Integration Research

**Purpose:** architectural precedents and current integration constraints for Enkrate  
**Version:** Mainnet Lock v2.0 — September 6, 2026

This file replaces the earlier `ApexStock (AegisFi)` framing. Enkrate is the only product name used in the project.

---

## 1. Architecture Patterns Worth Reusing

| Project / standard | Relevant pattern | Enkrate use |
|---|---|---|
| Composable CoW | conditional intent validation | inspiration for rule eligibility / deferred execution |
| Uniswap Permit2 | bounded/time-scoped token authorization | post-MVP or if simpler than direct finite approval |
| Gelato Automate / resolver pattern | cheap offchain condition evaluation before broadcast | keeper architecture |
| Safe / Zodiac guards | pre-execution policy checks | invariant design reference |
| Safe spending limits | bounded repeated spending | spend-window design reference |
| Rhinestone / ERC-7579 ecosystem | account-level execution policies | future wallet/agent integration, not MVP requirement |
| Coinbase Smart Wallet / Base accounts | user-friendly Base account model | wallet UX; do not force session-key complexity into MVP |
| Chainlink Data Feeds | official B20 total-return reference | required mainnet B20 reference source |
| Base B20 interfaces | multiplier, policies, pauses, metadata | required asset-state integration |

---

## 2. Current B20 Facts That Override Older Assumptions

### B20 identity

B20 stock tokens must be identified by **contract address**, not ticker. Name and symbol are mutable onchain.

### Multipliers

One B20 token does not permanently equal one underlying share. Corporate actions such as dividends and splits update the multiplier.

### Chainlink B20 reference

The Coinbase B20 Chainlink feed is already:

```text
underlying equity market price × B20 multiplier
```

It is a total-return value. **Do not multiply it by the multiplier again.**

### Feed timing

The Coinbase B20 feeds are 24/5 and can hold the last published value off-hours. `latestRoundData()` remaining callable does not mean the reference is fresh.

The previous project assumption that “older than 15 minutes = stale/broken” is invalid.

### Corporate actions

Coinbase's onchain oracle registry exposes a pause flag and multiplier. When `paused == true`, the Chainlink feed holds the last good value while Coinbase coordinates the corporate action.

This is distinct from ordinary off-hours aging.

### Transfers and policies

An ERC-20 allowance is not proof a B20 transfer will succeed. B20 can apply policy and function-specific pause state.

---

## 3. Execution Infrastructure — Current Verified Options

### Enso

Source: https://blog.enso.build/enso-expands-tokenized-stock-infrastructure-on-base/

Verified current capability:

- Coinbase Tokenized Stock swaps through Aerodrome pools;
- add/remove liquidity support;
- transaction simulation as part of Enso execution infrastructure.

**Use:** primary candidate for Enkrate's real execution adapter.

**Do not assume:** exact production calldata/interface until the Mainnet Reality Gate reproduces a quote and simulation.

### 1inch

Source: https://1inch.com/blog/post/coinbase-tokenized-stocks

Verified current capability:

- Coinbase B20 trading on Base;
- initial named support: AAPLc, GOOGLc, METAc, NVDAc;
- dApp, wallet and API access.

**Use:** strong execution candidate/fallback.

**Do not assume:** every B20 ticker has equal liquidity or identical route mechanics.

---

## 4. What Not to Rebuild

### Generic router

Enkrate should not compete with 1inch/Enso at route discovery.

### Generic wallet spend-permission system

Finite allowances, Permit2, Safe modules and account-policy systems already exist. Enkrate's differentiation must stay at the **B20-aware rule/execution layer**, not “we invented spending caps.”

### Generic portfolio automation

Glider/Bitwise and other portfolio systems already cover recurring/rebalancing territory. Enkrate's recurring rule is a useful user action, not the sole moat.

### Generic limit order

A conditional price alone is not enough. Enkrate's differentiated behavior is combining the user's rule with B20 issuer/reference state and actual settlement constraints.

---

## 5. Recommended MVP Authorization Pattern

For the Quest, prefer the lowest-complexity bounded mechanism that works reliably:

```text
finite Base USDC approval
→ Enkrate pulls exact amount only during successful execution
→ rule cannot exceed spend limit
```

Only add Permit2 / Smart Wallet spend permissions before submission if they materially reduce implementation risk and are already working in the codebase.

Do not introduce multiple authorization systems simultaneously.

---

## 6. Resolver / Keeper Pattern

Reusable pattern:

```text
read rule
→ read B20 / registry / Chainlink
→ obtain real quote
→ simulate execution
→ broadcast only if simulation passes
```

Unlike the earlier pure `canExecute()` design, route-dependent constraints cannot be fully known from a no-argument view function. Split evaluation into:

1. **static/onchain rule eligibility**;
2. **quote-aware transaction simulation**.

This avoids pretending the contract can know current DEX execution output without route data.

---

## 7. Guard Pattern

### Pre-execution facts

- rule ownership/status/expiry;
- canonical B20 address;
- spend window;
- issuer registry pause;
- reference value / `updatedAt`;
- B20 transfer/policy state where relevant;
- approved execution adapter.

### Quote-aware facts

- expected B20 output;
- effective route price;
- max reference deviation;
- conditional trigger;
- minimum output.

### Post-execution invariant

- actual B20 received by the user >= required minimum.

---

## 8. Receipt Pattern Correction

The earlier architecture said every rejected execution could emit an onchain receipt. That is incorrect if the transaction reverts: all emitted logs revert too.

Use:

- **evaluation record** for wait/reject/simulation outcomes;
- **onchain ExecutionReceipt event** for successful settlements.

If a future version wants durable onchain rejection records, it would need a non-reverting state-changing recording path, which would cost gas and is not needed for the Quest.

---

## 9. Testing References

Internal tests may use:

- Foundry mocks for corporate-action pause and edge cases;
- Base mainnet fork for real B20 / Chainlink / route integration;
- fuzz tests for spend windows, expiry, min output, deviation calculations.

Production UI must use real mainnet assets only.

---

## 10. Current Source Set

### Base / Coinbase B20

- https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- https://github.com/base/base-std/tree/main/src/interfaces
- https://blog.base.org/tokenized-stocks

### Chainlink

- https://docs.chain.link/data-feeds/tokenized-equity-feeds/coinbase

### Execution

- https://blog.enso.build/enso-expands-tokenized-stock-infrastructure-on-base/
- https://1inch.com/blog/post/coinbase-tokenized-stocks

### Architectural precedents

- https://github.com/cowprotocol/composable-cow
- https://github.com/Uniswap/permit2
- https://github.com/gelatodigital/automate
- https://github.com/rhinestone-wtfs/core-modules
- https://github.com/gnosisguild/zodiac
- https://github.com/safe-global/safe-modules

---

## 11. Research Rule for Coding Agents

If a technical assumption affects a real mainnet transaction, do not infer it from this document or from an older blog post. Verify the current contract/API behavior first and record the result.

Especially verify:

- execution adapter target/calldata;
- current B20 asset address;
- current Chainlink proxy;
- token policy/pause state;
- quote/min-output semantics;
- wallet authorization behavior.
