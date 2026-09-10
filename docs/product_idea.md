# Enkrate — Product Idea

**Descriptor:** Programmable execution with onchain guardrails.  
**Tagline:** *Autopilot, within your rules.*  
**Hackathon focus:** Coinbase Tokenized Stocks on Base  
**Submission network:** Base Mainnet

---

## 1. The 10-Second Pitch

**Enkrate lets eligible users set recurring or conditional rules for Coinbase Tokenized Stocks on Base, then executes only when the user's B20-specific guardrails and real onchain settlement limits pass.**

Think less “trading bot,” more **programmable stock order with a contract-enforced boundary**.

---

## 2. Why This Exists

Coinbase Tokenized Stocks make equities programmable and tradable onchain. But putting a stock on Base does not automatically give a user a good automation experience.

A user still has to choose between:

- manually repeating the same stock swap; or
- delegating execution to software and trusting it not to exceed their intent.

Tokenized equities also introduce state that generic crypto automation can mishandle:

- B20 assets are identified canonically by address;
- their economic share ratio can change through multipliers;
- Coinbase/Chainlink reference feeds are 24/5 while onchain markets can remain active;
- corporate actions can freeze the official reference without globally freezing B20 transfers;
- transfer/policy state can matter even when an ERC-20 allowance exists.

Enkrate makes those facts part of the execution path.

---

## 3. The Product

A user creates one of two rules.

### Recurring

> “Every Friday, buy $25 of NVDAc. Never spend more than $100 in 24 hours. Maximum 1% slippage.”

### Conditional

> “Buy $25 of NVDAc if the actual execution can fill at or below my price. Expire next Wednesday. If the traditional reference is aged, only continue if the onchain price remains inside my deviation limit.”

Enkrate then monitors the rule and checks:

- Is this the canonical Coinbase B20 asset?
- Is the issuer oracle registry in a corporate-action pause?
- Is the rule active and unexpired?
- Is the user still inside the configured spend boundary?
- Is the Coinbase reference current enough for the selected mode?
- If the reference is aged, did the user explicitly permit that regime?
- Is the real Base quote sufficiently close to the last official reference?
- Will the user receive at least the minimum stock amount?
- Does the actual execution price satisfy the conditional trigger?

If not, it waits or blocks.

If yes, the swap executes and the B20 lands in the user's wallet.

---

## 4. The Key Insight: 24/7 Stock Trading Needs Two Different Kinds of Truth

Coinbase B20 markets can be active onchain while the official underlying-equity reference is not continuously updating.

That means a naive rule like:

```text
oracle older than 15 minutes → reject
```

is wrong for this asset class.

Enkrate distinguishes:

### Corporate-action hold

Coinbase's oracle registry is paused.

**Behavior:** hard block. The official price is intentionally frozen while the issuer synchronizes the underlying price and B20 multiplier.

### Current/acceptable reference

The reference is acceptable under the user's normal execution policy.

**Behavior:** use normal route/slippage constraints.

### Aged reference

The registry is not in a corporate-action hold, but `updatedAt` is old.

**Behavior:**

- no user opt-in → wait;
- user opted in → last reference becomes an anchor, while real onchain execution must remain inside a stricter deviation/min-output boundary.

Enkrate does not pretend an old 24/5 reference is a live 24/7 stock price.

---

## 5. Why This Is More Than a Generic Limit Order

1inch already supports RWA swaps and orders. Enso already aggregates B20 execution. Enkrate should not compete with them as another router.

Instead:

- **1inch / Enso answer:** “How do I execute this swap?”
- **Enkrate answers:** “Is this specific programmed B20 action still permitted under the user's rule and the stock's current issuer/reference state?”

Enkrate can use existing liquidity infrastructure underneath it.

---

## 6. Why B20 Matters

Without Coinbase B20, much of Enkrate would degrade into generic crypto automation.

The B20-specific moat is the combination of:

- canonical asset registry;
- B20 multiplier/corporate-action semantics;
- Coinbase oracle-registry pause;
- 24/5 total-return reference behavior;
- B20 transfer/policy preflight;
- 24/7 onchain execution against real stock liquidity.

That is what the product must visibly demonstrate.

---

## 7. Real Hackathon User Flow

```text
Connect Base wallet
   ↓
Choose real B20 stock
   ↓
Create recurring or conditional rule
   ↓
Set amount + spend limit + slippage + reference preference
   ↓
Approve finite USDC budget
   ↓
Rule becomes Active — Monitoring
   ↓
Keeper reads real B20/Chainlink/registry state
   ↓
Keeper gets real route + simulates execution
   ↓
WAIT / HOLD / BLOCK
or
EXECUTE
   ↓
Real B20 arrives in wallet
   ↓
Mainnet receipt
```

---

## 8. The Three Hackathon Proof Moments

### Moment 1 — The rule is real

Create a rule on Base Mainnet and show its immutable boundaries.

### Moment 2 — Failure is understandable

Show Enkrate refusing to broadcast because a real rule condition or execution constraint fails. The UI explains the exact reason.

### Moment 3 — The stock actually settles

A small real USDC → Coinbase B20 transaction succeeds through the approved adapter, and the product displays the actual Base transaction and received stock balance.

---

## 9. Existing Product Surfaces

### Overview
Portfolio state + rule state + B20 reference health.

### Rules
Create and manage recurring/conditional rules.

### Playbooks
Rule templates, not a marketplace.

### Receipts
Successful mainnet executions plus separately labeled evaluation history.

### Guardrail Status
Canonical B20 identity, multiplier, issuer pause, reference value/time, authorization, route health.

---

## 10. What We Are Deliberately Not Building Before September 9

- Naira rail
- generic brokerage
- AI stock picker
- natural-language agent
- personalized index
- stock rewards
- event/prediction triggers
- paycheck trigger
- lending product
- strategy marketplace
- new DEX
- testnet demo universe

Those are distractions until the core rule → guard → execution → receipt path is real.

---

## 11. Future Product Expansion

The architecture can later support additional triggers:

```text
TRIGGERS
• time
• price
• incoming USDC
• verified external event

        ↓
ENKRATE GUARD

        ↓
ACTIONS
• buy / sell B20
• allocate
• later: borrow / repay against supported collateral
```

The hackathon only proves the first two triggers and stock purchase execution.

---

## 12. Positioning

### Homepage

**Put your tokenized-stock rules on autopilot. Keep the control.**

Set a recurring or conditional rule. Enkrate executes only inside the stock, price, reference, slippage and spending boundaries you chose.

### Judge explanation

> “Coinbase made stocks programmable on Base. Enkrate makes the execution programmable too — without turning the user's wallet into a blank cheque.”

---

## 13. Eligibility

Coinbase Tokenized Stocks are only available to persons in eligible jurisdictions outside the United States. Enkrate must not enable or market U.S.-resident trading in the submitted experience.

---

## 14. Primary Sources

- https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- https://docs.chain.link/data-feeds/tokenized-equity-feeds/coinbase
- https://blog.base.org/tokenized-stocks
- https://blog.base.org/request-for-builders-tokenized-stocks
- https://blog.enso.build/enso-expands-tokenized-stock-infrastructure-on-base/
- https://1inch.com/blog/post/coinbase-tokenized-stocks
