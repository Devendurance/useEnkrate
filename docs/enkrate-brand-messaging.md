# Enkrate Brand Messaging

**Master brand:** Enkrate  
**Pronunciation:** `EN-krate`  
**Descriptor:** *Programmable execution with onchain guardrails.*  
**Tagline:** *Autopilot, within your rules.*  
**Version:** Mainnet Hackathon Lock v2.0

---

## 1. Brand Core

### What Enkrate is

Enkrate is a non-custodial programmable execution layer for Coinbase Tokenized Stocks on Base. Eligible users create recurring or conditional stock rules, and Enkrate executes only when the rule's spending, price, B20 reference, corporate-action and settlement boundaries pass.

### The idea to remember

**Automation should be able to act without being able to ignore the user's boundaries.**

### Purpose

Make programmable tokenized-stock actions understandable and controllable.

### Vision

Tokenized equities should be able to respond to rules and events without forcing users to choose between constant manual execution and unbounded automation.

### Mission

Turn Coinbase Tokenized Stocks on Base from assets a user manually swaps into assets they can program with visible, enforceable execution conditions.

### Emotional payoff

**Calm control:** “It can run without me watching it, but it can't silently rewrite the rule.”

### Strategic enemy

**Blind execution** — treating every ERC-20, every reference price and every automated action as if the context never changes.

---

## 2. Primary Audience

### Eligible non-U.S. Base users who already hold USDC

They want to automate a stock action without manually repeating it or handing an executor broad discretion.

**Job:**

> “Let me define the stock, amount and conditions once, then execute later only if those conditions still hold.”

### Expansion audiences

- wallets and fintechs embedding B20 execution;
- agent builders that need B20-aware policy enforcement.

These are roadmap narratives, not the first homepage message.

---

## 3. Positioning

### Positioning statement

> For eligible users who want programmable Coinbase Tokenized Stock actions on Base, Enkrate is a non-custodial execution layer that commits the stock, amount and limits before automation runs, then checks B20-specific issuer/reference state and real settlement constraints before funds move.

### Simple version

**Set the stock rule once. Enkrate executes only inside the boundaries you chose.**

### What Enkrate is not

- an AI stock picker;
- a brokerage;
- a new DEX;
- an investment-advice engine;
- a promise of “safe” or profitable trades;
- a generic wallet spending-limit product.

---

## 4. Message Hierarchy

### Five-second explanation

**Put your tokenized-stock rules on autopilot. Keep the control.**

### Supporting line

Create a recurring or conditional Coinbase Tokenized Stock rule on Base. Enkrate checks the asset, budget, issuer state, reference context and settlement limits before it executes.

### Tagline

**Autopilot, within your rules.**

### 30-second pitch

Coinbase Tokenized Stocks can trade onchain around the clock, while their official equity reference behaves on a different schedule and corporate actions can temporarily freeze that reference. Enkrate lets an eligible user program a recurring or conditional stock purchase without giving the executor unlimited discretion. The stock, amount, expiry, spend limit, reference tolerance and minimum output are defined up front; if the rule still passes, Enkrate executes a real Base transaction and leaves a receipt.

### Short pitch

Enkrate is programmable execution for Coinbase Tokenized Stocks on Base, with the user's limits and B20-specific guardrails built into the execution path.

---

## 5. Messaging Pillars

### Pillar 1 — Program the action

Set a recurring or conditional rule once instead of rebuilding the same transaction every time.

**Proof:**

- recurring rule;
- conditional-price rule;
- expiry;
- cancel at any time.

### Pillar 2 — Respect the asset's actual state

Coinbase B20 stocks carry state a generic token bot can miss.

**Proof:**

- canonical B20 address;
- multiplier/reference display;
- Coinbase oracle-registry corporate-action hold;
- aged-reference handling instead of a fake “always-live” stock price.

### Pillar 3 — Bound execution

Automation gets a specific job, not a blank cheque.

**Proof:**

- finite USDC authorization;
- maximum spend;
- minimum output/slippage;
- expiry;
- approved target stock and execution adapter.

### Pillar 4 — Show what actually happened

A successful execution ends in a real Base transaction and readable receipt.

**Proof:**

- amount spent;
- stock received;
- realized price;
- reference/time used;
- Base transaction link.

---

## 6. The After-Hours Story — Correct Language

Do **not** say:

> “The market is closed, so Enkrate blocks the trade.”

That contradicts the value of 24/7 onchain stocks.

Use:

> “The official B20 reference is aged. Your rule decides whether to wait or continue under a stricter deviation limit.”

And distinguish it from:

> “Coinbase's oracle registry is paused for a corporate action. Enkrate is holding execution until the issuer reference resumes.”

### Why this matters

An aged 24/5 reference is not automatically a broken oracle. Enkrate should tell the user what was actually observed instead of claiming knowledge it does not have.

---

## 7. Feature-to-Value Language

### Recurring rule

**UI:** `Repeat this rule`  
**Value:** Remove repeated manual stock swaps while preserving an amount and cadence the user chose.

### Conditional-price rule

**UI:** `Execute only at or below my price`  
**Value:** Define the maximum realized price before walking away.

### Finite authorization

**UI:** `Authorized budget`  
**Value:** The product does not need an unlimited USDC approval to prove the MVP.

### Corporate-action hold

**UI:** `Issuer reference paused`  
**Value:** Avoid executing against a reference Coinbase has intentionally frozen during a corporate action.

### Aged-reference preference

**UI:** `When the official reference is aged`  
Options:

- `Wait for a newer reference`
- `Allow execution within my deviation limit`

### Reference deviation

**UI:** `Max distance from last official reference`  
**Value:** If the reference is old, the user chooses how far the real onchain execution may move away from it.

### Minimum output

**UI:** `Minimum stock received` / `Max slippage`  
**Value:** A passing rule still cannot settle at an output below the user's boundary.

### Receipt

**UI:** `Executed within your rules`  
**Value:** Show the real Base transaction and execution facts.

---

## 8. Product States

Use:

- `Draft`
- `Active — Monitoring`
- `Waiting — Recurring interval not reached`
- `Waiting — Price condition not met`
- `Waiting — Reference aged`
- `Hold — Coinbase corporate action in progress`
- `Blocked — Spend limit reached`
- `Blocked — Authorization exhausted`
- `Blocked — Price outside your limit`
- `Blocked — Reference deviation exceeded`
- `Blocked — Minimum output not met`
- `Executed within your rules`
- `Cancelled`

### Avoid

- `Rejected — Oracle stale` as a catch-all;
- `Market closed` unless a separate verified session source actually establishes that state;
- `safe trade`;
- `best execution`;
- `guaranteed price`.

---

## 9. Surface Copy

### Navigation

- `Overview`
- `Rules`
- `Playbooks`
- `Receipts`
- `Guardrail Status`

### Primary actions

- `Create a rule`
- `Activate rule`
- `Authorize budget`
- `Cancel rule`
- `View receipt`
- `Review guardrails`

### Empty rules state

**No active rules yet**  
Create a recurring or conditional Coinbase Tokenized Stock rule. Enkrate will show what must still be true before it can execute.

### Authorization exhausted

**Your rule is still active, but its USDC authorization is exhausted.**  
Increase the bounded authorization to let future executions continue.

### Aged reference

**Official reference is aged**  
The Coinbase B20 feed has not published a newer value. Your rule is configured to wait.

Or:

**Aged-reference execution enabled**  
Enkrate can continue only if the real onchain execution remains within your configured deviation from the last official reference.

### Corporate action

**Execution on hold**  
Coinbase's B20 oracle registry is paused for this asset. Enkrate will not execute this rule while the issuer reference is frozen.

### Successful receipt

**Executed within your rules**  
`Rule R-0042 · NVDAc · $5.00 USDC`  
`Received: … NVDAc`  
`Realized price: …`  
`Official reference: … · updated …`  
`View Base transaction`

---

## 10. Playbook Copy

Playbooks are templates, not investment recommendations.

### Weekly Builder

A recurring fixed-amount template.

> Choose the stock, amount and cadence. Review the limits before activating.

### Dip Buyer

A conditional maximum-price template.

> Define the highest realized price you're willing to accept, plus expiry and execution limits.

### After-Hours Guard

A template for users who choose to allow execution when the official 24/5 reference is aged.

> Continue only inside a tighter maximum deviation from the last official reference.

Do not label a playbook “recommended,” “best,” or “high return.”

---

## 11. Eligibility & Prototype Discipline

Persistent disclosure:

> **Coinbase Tokenized Stocks are available only to eligible users in permitted jurisdictions outside the United States. Enkrate does not enable U.S.-resident trading.**

Do not claim Enkrate independently determines a user's complete legal eligibility. Issuer, venue and jurisdictional restrictions still apply.

---

## 12. Demo Messaging

### 90-second skeleton

**0–12s**  
“Coinbase made stocks programmable on Base. But programmable execution still needs to understand both the user's limits and the stock's B20 state.”

**12–30s**  
Create a real NVDAc rule with a small budget.

**30–48s**  
Show the guardrail panel: canonical address, Coinbase reference, multiplier/issuer state, finite authorization and execution limits.

**48–70s**  
Show a real evaluation state or execution simulation. Explain why Enkrate waits/blocks if a condition fails.

**70–85s**  
Execute the tiny real Base purchase and show NVDAc received + Base transaction.

**85–90s**  
“Enkrate: autopilot, within your rules.”

---

## 13. Claims Discipline

Do not publish unsupported claims from the earlier PRD/product document, including unverified percentages about bot fear, DCA abandonment, off-hours slippage, or speculative market-size forecasts.

Prefer observable claims:

- “This rule is stored on Base.”
- “The target is the canonical NVDAc B20 address.”
- “Coinbase's registry is not paused.”
- “The official reference was last updated at …”
- “This rule cannot spend more than …”
- “The transaction delivered … NVDAc.”

---

## 14. Final Brand Recommendation

Lead with:

# **Put your tokenized-stock rules on autopilot. Keep the control.**

Then:

**Enkrate is programmable execution with onchain guardrails for Coinbase Tokenized Stocks on Base. Set a recurring or conditional rule; Enkrate executes only inside the boundaries you chose.**

The brand still owns the original tension — **autonomy without surrendering control** — but the proof is now unmistakably B20-native and mainnet-real.
