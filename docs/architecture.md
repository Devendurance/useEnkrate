# Enkrate Technical Architecture

**Product:** Enkrate  
**Descriptor:** *Programmable execution with onchain guardrails.*  
**Target deployment:** Base Mainnet (Chain ID `8453`)  
**Document status:** Hackathon Architecture Lock v2.0 — September 6, 2026

---

## 1. Architectural Goal

Enkrate is a non-custodial programmable execution layer for Coinbase Tokenized Stocks on Base. A user creates a recurring or conditional rule, grants a bounded USDC authorization, and Enkrate evaluates observable B20 state plus route-specific execution constraints before a real stock-token swap can occur.

The submitted product uses **real Coinbase B20 assets on Base Mainnet**. No mock stock, mock oracle, or testnet asset is part of the user-facing submission.

### Core invariant

```text
TRIGGER
  ↓
ENKRATE GUARD
  ↓
REAL B20 EXECUTION
  ↓
ONCHAIN RECEIPT
```

The rule can automate *when* an action is attempted. The guard determines *whether* the action is allowed to execute.

---

## 2. Non-Negotiable Invariants

1. **Mainnet reality**  
   The submitted app reads real B20 contracts, real Coinbase/Chainlink reference feeds, and real Base liquidity.

2. **Zero shared escrow**  
   Enkrate does not require users to pre-deposit assets into a pooled protocol vault. USDC remains in the user's wallet until an authorized execution pulls the exact amount required.

3. **Bounded authorization**  
   The hackathon MVP should prefer a finite USDC allowance tied to the user's configured budget. Unlimited approvals are not required for the MVP.

4. **Canonical assets by address**  
   B20 token identity is determined by canonical contract address, never ticker alone. B20 name/symbol metadata can change onchain.

5. **B20 state is part of execution**  
   A rule cannot treat a B20 as a generic ERC-20. Corporate-action pause state, token operation pauses, policy restrictions where applicable, multiplier state, and reference-feed behavior are relevant execution context.

6. **Reference aging is not automatically failure**  
   Coinbase B20 Chainlink feeds are 24/5 and can intentionally hold the last value off-hours. An aged reference and an issuer corporate-action pause are different states and must not be collapsed into one `ORACLE_STALE` error.

7. **Realized execution is authoritative for settlement**  
   The contract enforces amount spent, minimum stock received, recipient, approved asset, rule expiry, and budget limits against the actual transaction outcome.

8. **No false onchain rejection receipts**  
   A reverting EVM transaction cannot persist emitted events. Failed preflight evaluations are recorded by the app/keeper as evaluation records; successful executions emit durable onchain receipts.

---

## 3. Supported Mainnet Assets — MVP Registry

Initial product support is intentionally narrow:

| Asset | Symbol | Canonical B20 address | Chainlink feed |
|---|---|---|---|
| Apple | `AAPLc` | `0xb200000000000000000000C2e324d24d7eEcd1fb` | `0x787f13dEa48Db0897CbCDD985de77809D837F988` |
| Alphabet | `GOOGLc` | `0xb2000000000000000000002D0BA3164cc74f58B7` | `0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2` |
| Meta | `METAc` | `0xb2000000000000000000008bC8786B856E61707C` | `0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D` |
| NVIDIA | `NVDAc` | `0xb20000000000000000000078ee7ce2fE4908108C` | `0x04689a41629776563E6822F76f2e57D148d28513` |

**Coinbase B20 oracle registry:** `0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`

The registry must be data-driven so additional official B20 assets can be added without changing the rule-engine design.

---

## 4. End-to-End Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ CLIENT — existing Enkrate UI shell                         │
│ Next.js + Wagmi/Viem + Coinbase OnchainKit                 │
│                                                             │
│ Overview · Rules · Playbooks · Receipts · Guardrail Status │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    create/cancel rule
                    approve bounded USDC
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ ENKRATE EXECUTION ENGINE — Base Mainnet                    │
│                                                             │
│ createRule()                                                │
│ cancelRule()                                                │
│ canExecuteStatic()                                          │
│ executeRule(ruleId, executionData)                          │
│                                                             │
│ Stores rule terms + spend state                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ ENKRATE GUARD                                               │
│                                                             │
│ • canonical B20 address                                     │
│ • rule active / not expired                                 │
│ • recurring interval / trigger eligibility                  │
│ • issuer oracle-registry pause                              │
│ • B20 operation pause / policy preflight where applicable   │
│ • bounded daily spend                                       │
│ • after-hours / aged-reference permission                   │
│ • max deviation from last Coinbase reference                │
│ • approved execution adapter                                │
│ • minimum B20 received                                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ pass
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ EXECUTION ADAPTER                                           │
│                                                             │
│ Candidate production routes:                                │
│ • Enso → Aerodrome                                          │
│ • 1inch Base routing                                        │
│                                                             │
│ Exactly one adapter is locked after the Mainnet Reality Gate│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                    USER RECEIVES REAL B20
                            │
                            ▼
                 ExecutionReceipt event + tx hash

OFFCHAIN KEEPER / RESOLVER
• discovers active rules
• reads B20 + Chainlink state
• obtains real execution quote
• simulates executeRule() before broadcast
• broadcasts only when simulation passes
```

---

## 5. Rule Model

Hackathon MVP supports exactly two rule types.

```solidity
enum RuleType {
    RECURRING,
    CONDITIONAL_PRICE
}

enum RuleStatus {
    ACTIVE,
    CANCELLED
}

struct Rule {
    uint256 id;
    address user;
    address targetB20;
    uint256 amountInUSDC;
    RuleType ruleType;

    // Conditional rule only. 8-decimal USD convention recommended.
    uint256 triggerPrice;

    // Recurring rule only.
    uint256 intervalSeconds;
    uint256 lastExecutedAt;

    // User boundaries.
    uint256 maxSpendPer24h;
    uint256 maxSlippageBps;
    uint256 maxReferenceDeviationBps;
    uint256 expiresAt;
    bool allowAgedReferenceExecution;

    RuleStatus status;
}
```

Do not add natural-language rule parsing, income-event triggers, prediction-market triggers, basket allocation, lending, or agent SDK behavior before submission.

---

## 6. Reference-State Model

### 6.1 What the Chainlink feed means

Coinbase B20 feeds publish a **Total Return Value**:

```text
Token Reference Price = Underlying Equity Market Price × B20 Multiplier
```

Therefore Enkrate must never multiply the Chainlink value by the B20 multiplier a second time.

### 6.2 Reference states

The contract/app should distinguish at least:

```text
CORPORATE_ACTION_HOLD
  oracle registry paused == true
  → hard block execution

REFERENCE_CURRENT
  registry not paused
  reference accepted by configured execution policy
  → normal guard path

REFERENCE_AGED
  registry not paused
  updatedAt is older than the normal reference threshold
  → wait unless user explicitly allows aged-reference execution
  → if allowed, require stricter maxReferenceDeviationBps + minOut
```

**Important:** `REFERENCE_AGED` must not be presented as proof that the underlying market is closed. The frontend may show market-session information from a separate calendar/status source, but the contract should enforce only facts it can verify.

### 6.3 Corporate actions

When Coinbase's registry reports `paused == true`, Enkrate blocks new execution. B20 token transfers themselves may remain possible during a corporate action, so the guard must read the oracle-registry pause explicitly rather than assuming the token is globally paused.

---

## 7. Guard Specification

### Gate A — canonical asset

```text
targetB20 must equal an enabled canonical B20 address in EnkrateAssetRegistry
```

### Gate B — rule lifecycle

- rule status is `ACTIVE`
- current timestamp <= `expiresAt` when an expiry exists
- recurring interval has elapsed when `RECURRING`

### Gate C — issuer/corporate-action state

- query Coinbase oracle registry
- if `paused == true`: return `CORPORATE_ACTION_HOLD`

### Gate D — B20 transfer capability preflight

Where the official B20 interfaces expose the relevant pause/policy state for the operation, preflight the user's destination/executor. Never infer transfer permission from ERC-20 allowance alone.

### Gate E — budget

```text
spentInWindow(user) + amountInUSDC <= rule.maxSpendPer24h
```

The exact implementation may use a fixed UTC day or rolling window. Choose one, name it accurately in the UI, and test boundary behavior.

### Gate F — reference mode

- read Chainlink `latestRoundData()`
- reject invalid/non-positive values
- read `updatedAt`
- if reference exceeds normal age threshold:
  - `allowAgedReferenceExecution == false` → WAIT
  - true → route can proceed only under the user's tighter deviation constraint

The default age threshold must be chosen from the actual feed behavior; do **not** hard-code the old 15-minute assumption.

### Gate G — execution quote / conditional trigger

The keeper obtains and simulates a real Base route.

For a conditional-price rule, the eventual realized price must satisfy the user's trigger. A stale traditional-market reference must not be treated as a live trigger price during an aged-reference regime.

### Gate H — reference deviation

When aged-reference execution is enabled:

```text
abs(realizedPrice - lastReferencePrice) / lastReferencePrice
    <= maxReferenceDeviationBps
```

This turns the last 24/5 reference into an anchor, not a fake live market price.

### Gate I — minimum output / slippage

Execution must deliver at least the user-approved `minAmountOut` of the canonical B20 to the user's wallet.

---

## 8. Execution Adapter Boundary

Do not hard-code a venue until the **Mainnet Reality Gate** has passed.

Verified current infrastructure:

- 1inch supports AAPLc, GOOGLc, METAc, and NVDAc on Base through its dApp, wallet, and APIs.
- Enso supports Coinbase Tokenized Stock swaps through Aerodrome and transaction simulation.

### Adapter requirements

The locked adapter must make the following enforceable or verifiable:

- source token is Base USDC
- destination token is the rule's canonical B20
- recipient is the rule owner
- source amount cannot exceed rule amount
- router/adapter target is approved
- minimum output is enforced
- transaction can be simulated before broadcast

If the selected aggregator returns arbitrary calldata, Enkrate must not blindly forward arbitrary keeper-supplied calls. Use a narrow adapter or validate the permitted call surface.

---

## 9. Authorization Model — Hackathon MVP

Prefer the simplest bounded model that works reliably on Base Mainnet:

1. User creates/configures rule.
2. User approves Enkrate for a finite USDC amount.
3. Enkrate can pull only the exact amount during successful execution.
4. When allowance/budget is exhausted, the rule shows `Authorization required` and cannot execute again.

Permit2, Smart Wallet spend permissions, or session keys are valid post-MVP improvements but are not required to prove Enkrate's core value.

---

## 10. Keeper / Resolver

Pseudo-flow:

```text
for each ACTIVE rule:
  1. Read static rule eligibility.
  2. Read canonical B20 state.
  3. Read Coinbase registry pause + multiplier.
  4. Read Chainlink latestRoundData().
  5. If a hard gate fails, record evaluation and stop.
  6. Obtain a real route quote from the locked adapter provider.
  7. Derive minAmountOut and expected execution price.
  8. Simulate executeRule(ruleId, executionData) using eth_call.
  9. Broadcast only if simulation passes.
 10. Persist tx hash and receipt metadata.
```

The keeper must not be able to change the rule owner, target B20, permitted spend, expiry, or destination wallet.

---

## 11. Receipts & Evaluation History

### Onchain receipt — successful execution only

```solidity
event ExecutionReceipt(
    uint256 indexed ruleId,
    address indexed user,
    address indexed targetB20,
    uint256 amountInUSDC,
    uint256 amountOutRaw,
    uint256 realizedPrice,
    uint256 referencePrice,
    uint256 referenceUpdatedAt,
    bool usedAgedReference,
    address executionAdapter
);
```

### Offchain evaluation record

Used for `WAIT`, failed simulations, and rejected keeper evaluations:

```text
ruleId
observedAt
status
reasonCode
referencePrice
referenceUpdatedAt
registryPaused
quote / simulation id when applicable
```

The UI must distinguish a durable onchain execution receipt from a local/server evaluation record.

---

## 12. Existing UI Route Contract

| Route | Required live behavior |
|---|---|
| Overview | connected-wallet B20 balances, active rules, current reference/registry state |
| Rules | create/cancel recurring and conditional rules; bounded USDC authorization |
| Playbooks | pre-filled rule templates only; no marketplace |
| Receipts | successful mainnet execution receipts + clearly labeled evaluation history |
| Guardrail Status | canonical address, multiplier, registry pause, reference value/age, allowance, route availability |

---

## 13. Security & Threat Model

| Threat | Enkrate response |
|---|---|
| Keeper changes recipient | recipient derived from immutable rule owner |
| Keeper changes stock | destination B20 derived from rule and canonical registry |
| Keeper overspends | rule amount + 24h cap + bounded token authorization |
| Corporate-action mismatch | hard block when Coinbase registry is paused |
| Double multiplier | Chainlink B20 feed is already total-return/multiplier-adjusted; never multiply again |
| Aged off-hours reference | user opt-in + strict deviation anchor + min output |
| Malicious route calldata | narrow approved adapter / validated call surface |
| Bad quote / sandwich | pre-broadcast simulation + min output + realized-price checks |
| Metadata spoofing | address-based canonical token registry |
| Reverted tx advertised as receipt | only successful transaction emits onchain receipt |

---

## 14. Testing Strategy

Tests may use mocks and a mainnet fork internally. The submitted product must not expose mock stock assets.

Required test categories:

- canonical-token allowlist
- rule create/cancel/expiry
- recurring interval
- spend-window boundary
- corporate-action registry pause
- reference current vs aged
- aged-reference opt-out
- aged-reference deviation rejection
- conditional realized-price rejection
- min-output rejection
- authorization exhausted
- keeper cannot change recipient/asset/amount
- successful execution receipt
- mainnet-fork integration against the selected real route

---

## 15. Mainnet Reality Gate — Must Pass Before Contract Lock

Before implementing the final execution adapter, verify for **NVDAc** and **AAPLc**:

```text
Base USDC
  → live quote
  → real B20 token
  → transaction simulation
  → exact router/adapter target
  → exact calldata shape
  → recipient behavior
  → min-output behavior
```

Record the evidence in `docs/mainnet-reality-gate.md`.

If one route cannot be proven, do not design around it. Use the other verified provider.

---

## 16. Explicitly Out of Scope Before September 9

- Base Sepolia user flow
- mock equities in submitted app
- Naira/onramp
- paycheck/incoming-USDC trigger
- AI/natural-language rule parser
- agent SDK
- prediction/event triggers
- personalized indexes
- strategy marketplace / creator fees
- Morpho borrowing
- Pyth integration
- cross-chain support
- B2B SDK

---

## 17. Primary Sources

- Base B20 Tokenized Stocks: https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- Chainlink Coinbase B20 feeds: https://docs.chain.link/data-feeds/tokenized-equity-feeds/coinbase
- Base tokenized-stocks launch: https://blog.base.org/tokenized-stocks
- Base Request for Builders: https://blog.base.org/request-for-builders-tokenized-stocks
- Enso B20/Aerodrome support: https://blog.enso.build/enso-expands-tokenized-stock-infrastructure-on-base/
- 1inch Coinbase Tokenized Stocks support: https://1inch.com/blog/post/coinbase-tokenized-stocks
