# Enkrate Live Rule Repair Design

## Status

Approved design with the user's final corrections. This repair is for the existing
Next.js UI and read-only data paths only. It does not change Solidity, deployments,
the RPC provider, 1inch behavior, approvals, or execution behavior.

## Context and Root Cause

Rule 1 was created on Base Mainnet by transaction
`0x03ab65dfc8513e140eb08e33424e29a15e0618f854a165904856188e7450c57e`, but the
stored trigger, reference deviation, expiry, and aged-reference flag did not match
the approved Review & Sign preview.

The current rule builder keeps editable strings in React state and constructs the
`createRule` argument array inline inside `wallet.writeContract`. Review renders a
different set of state fields and does not render the final serialized object. This
allows a stale or differently transformed value to reach the ABI call without a
pre-sign equality check.

The approval status also relies on a pre-transaction allowance read and marks the
approval complete after a receipt without a post-receipt allowance read or receipt
status assertion. This can display confirmation without onchain evidence.

The `/rules` and `/receipts` readers query from the deployment block to the latest
block in one `getLogs` request. The configured RPC rejects ranges larger than
10,000 blocks. Both surfaces need the same bounded query helper.

## Scope

### In scope

- One `RuleDraft` to `RuleSubmission` source of truth for the rule builder.
- Exact serialized rule object rendered before signing and used for ABI arguments.
- Pre-sign snapshot mismatch blocking.
- Evidence-based bounded approval status.
- Shared 9,000-block owner-event log helper for `/rules` and `/receipts`.
- Visible helper text, live reference context, warnings, and validation for high-risk
  rule fields.
- Existing owner-only manual `cancelRule` flow for Rule 1.
- A corrected Rule 2 preview after cancellation, with no Rule 2 transaction.

### Out of scope

- Solidity or deployment changes.
- RPC provider changes.
- 1inch proposal, USDC approval, keeper, or execution requests.
- Automatic wallet signing or transaction submission.
- UI redesign or new component library dependencies.

## Single Source of Truth

Add a pure rule-builder module that defines:

- `RuleDraft`: editable strings, selected asset, rule type, cadence/trigger,
  expiry date, aged-reference choice, and the acknowledgement state used only by
  validation.
- `RuleSubmission`: typed values sent to `createRule`, including the target address,
  raw USDC values, numeric enum, raw price, interval, bps values, expiry timestamp,
  and aged-reference boolean.
- `buildRuleSubmission(draft, context)`: parses and validates the draft, converts
  human percentages to basis points, converts the date to the exact timestamp, and
  returns one typed object.
- `sameRuleSubmission(left, right)`: compares every serialized field, including
  bigint values and booleans.
- `ruleSubmissionArgs(submission)`: returns the ABI argument tuple in the exact
  `createRule` order.

The Review & Sign step builds one `RuleSubmission` and renders every field from it,
including raw values and human-readable values. Immediately before any wallet call,
the page builds the object again, stores/displays that final object in the review
surface, and compares it with the reviewed snapshot. A mismatch produces a visible
error and never calls `wallet.writeContract`.

The wallet call receives only `ruleSubmissionArgs(finalSubmission)`. No inline
second serializer is permitted.

## Approval Evidence

The builder will track allowance as unknown, insufficient, or confirmed.

- Read `USDC.allowance(account, engine)` for the current account and exact finite
  authorization amount.
- Show `Approval required` unless the fresh value is at least the required amount.
- After `approve` returns, require a successful receipt and perform a fresh allowance
  read before showing `Bounded approval confirmed`.
- A reverted receipt, rejected wallet request, failed read, or insufficient allowance
  must remain `Approval required`.
- The explanatory copy must say: `Enkrate may pull up to <amount> USDC under this
  authorization. This is a finite allowance, not custody.`

## Shared Event Discovery

Add a shared owner-event helper used by `/rules` and `/receipts`.

- Require the configured deployment block; do not silently scan from block zero.
- Read the latest block once.
- Query sequential 9,000-block windows, inclusive, from deployment block through the
  latest block. 9,000 remains below the provider's 10,000-block limit.
- Preserve the owner indexed argument.
- Merge, sort by block number and log index, and deduplicate by transaction hash plus
  log index.
- Convert RPC failures into the existing visible route error pattern.
- Do not change the configured RPC endpoint to conceal the range defect.

## Live Guidance and Validation

When a supported asset is selected, read the live engine asset snapshot and show the
current reference beside the trigger. If the live reference is unavailable, keep the
trigger warning state explicit and do not claim a current value.

### Trigger price

Visible helper text:

> Maximum reference price at which Enkrate may buy. Current live reference: <price>.

Validation and warning policy when a valid live reference exists:

- Positive value with no more than 8 decimal places is required.
- Difference greater than approximately 10% shows a visible material-deviation
  warning.
- Difference greater than approximately 25% shows a stronger warning.
- A clearly nonsensical order-of-magnitude value is blocked. The hard block applies
  only when the trigger is below one-thousandth of the live reference or above one
  thousand times the live reference.
- A material or strong warning does not by itself block a legitimate distant strategy.
  The user must explicitly acknowledge the warning before continuing/reviewing.
- The acknowledgement is UI validation state only and is not serialized onchain.

This blocks the previous `$0.000001`-style typo while allowing intentional distant
conditional strategies with an explicit acknowledgement.

### Reference deviation

Visible helper text:

> Allowed execution/reference divergence. The MVP recommendation is 1-2%.

Values above the contract's 100% limit are invalid. Values materially above the
recommended range receive a visible broad-bound warning but remain possible when
otherwise valid.

### Provider slippage

Visible helper text:

> Protects against quote deterioration between proposal and execution. The MVP
> recommendation is approximately 0.5-1%.

Values above the contract's 100% limit are invalid. Broad values receive a visible
warning but are not rejected solely for being broad.

### Aged reference

Visible helper text:

> OFF: require a fresh reference within the configured threshold. ON: permit the
> last 24/5 reference when it is aged, while the other guards still apply.

When ON, show a visible warning. Do not imply that aged data is a corporate-action
hold or that it represents a current market price.

### 24-hour spend limit

Visible helper text:

> Maximum Enkrate may spend for this rule during its current 24-hour spend window.

The copy must not call this a rolling or sliding window. It must describe the
production contract's fixed/tumbling window beginning at first spend.

### Expiry

Show the selected date and a human-readable remaining duration. Reject dates in the
past. Warn on unusually long expiry, using a documented threshold such as 30 days.
Do not describe an unset expiry as short-lived.

### Authorization budget

Visible helper text:

> Finite USDC allowance available to the engine for this rule. This is not custody.

The budget must cover the 24-hour spend limit. Approval language is evidence-based as
specified above.

### Info details

Optional info icons may expose deeper explanations, but the critical safety copy
above remains visible below each field. Icons must have accessible labels and keyboard
focus behavior, and must not be the only carrier of meaning.

## Manual Rule 1 Cancellation

After the code repair is verified, `/rules` must discover Rule 1 through the shared
bounded event helper. The existing owner-only cancel flow remains the transaction
path:

1. Show Rule 1 and its actual stored values.
2. User manually clicks the cancellation control.
3. Browser wallet presents `cancelRule(1)` to the user.
4. User manually approves or rejects the transaction.
5. After a successful receipt, read Rule 1 and verify status `CANCELLED`.
6. Read USDC allowance and verify it remains zero.
7. Read RuleExecuted logs for the owner/rule and verify none exist.

No cancellation transaction is submitted by application code outside the user's
manual wallet flow.

## Corrected Rule 2 Preview

Only after Rule 1 cancellation is verified, build a fresh preview from the current
live NVDAc reference. The expected MVP shape remains:

- exactly 1 USDC amount and 1 USDC fixed/tumbling 24-hour spend limit;
- `CONDITIONAL_PRICE`;
- trigger based on the current live reference and shown in raw and human units;
- 1-2% reference deviation, with the selected value visible;
- approximately 0.5-1% provider slippage, with the selected value visible;
- aged reference OFF unless the user explicitly changes it and acknowledges the
  warning;
- short, human-readable expiry;
- no `createRule`, approval, 1inch proposal, or execution request.

The final response will contain the exact Rule 2 preview and state that it has not
been created.

## Verification

Add focused pure tests for:

- exact raw amount and bps conversions;
- expiry serialization;
- every `RuleSubmission` field reaching the ABI tuple;
- mismatch detection;
- material/strong trigger warning thresholds;
- order-of-magnitude trigger blocking;
- acknowledgement behavior;
- fixed/tumbling spend-window wording;
- bounded event range generation and deduplication.

Run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- the focused rule-builder tests
- route smoke for `/rules`, `/rules/new`, and `/receipts`
- read-only Rule 1 cancellation-preflight checks

No live financial transaction beyond the separately manual Rule 1 cancellation is
permitted during this repair. Rule 2 remains preview-only.
