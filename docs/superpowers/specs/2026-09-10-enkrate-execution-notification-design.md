# Enkrate Execution Notification Design

## Status

Approved implementation design for the post-execution UI polish. This change is
frontend-only. It does not modify contracts, deployments, wallet behavior, 1inch,
keepers, or AI functionality.

## Goal

Give the connected owner an immediate, global success notification when a verified
`RuleExecuted` event is observed, whether the execution was manually submitted from
the app or was later produced by an automatic executor. The notification remains
available across route changes, auto-dismisses after 8 seconds, and links to the
internal receipts surface and Basescan.

## Provider-Owned Activity

Extend the existing `Web3Provider` with a typed execution activity context. The
context owns:

- the active notification queue;
- a `reportExecution` function used by the manual execution panel and the event monitor;
- a monotonic refresh version consumed by mounted rule, asset, balance, allowance,
  and receipt readers;
- a bounded in-memory deduplication set keyed by `${transactionHash}:${logIndex}`.

The provider renders the toast viewport around the existing application children,
so the notification survives navigation and is available on every Enkrate route.
No standalone event bus or third-party toast dependency is added.

## Event Flow

When the wallet account changes, the monitor reads the current Base block once and
uses it as its baseline. It does not replay deployment history. While an account is
connected, a modest interval checks only blocks after the last scanned block. Each
query is owner-filtered to the connected account, uses the existing
`withReadOnlyRpcFallback`, and never exceeds `OWNER_EVENT_MAX_RANGE` (2,000 blocks).
The cursor advances only after a bounded query succeeds. Overlapping observations are
safe because the provider deduplicates by transaction hash and log index.

The monitor decodes only `RuleExecuted` events from the configured execution engine.
An observed event is enough to refresh mounted state and create the success
notification. Existing receipt discovery remains the source of historical receipts.

## Manual Execution Flow

The existing execution panel continues to require a successful receipt, a matching
`RuleExecuted` event, the expected USDC transfer, zero engine balances/allowance, and
an updated spend window. After those checks, it submits the decoded event to
`reportExecution` immediately. A reverted receipt, rejected wallet request, missing
event, or mismatched event never enters the success path. The monitor and manual path
share the same deduplication key, so a manually confirmed event cannot produce a
second toast when the next bounded check sees it.

## Notification Content

Each new execution displays:

- `Rule executed successfully`
- `Bought {amountOut} {asset} for {amountIn} USDC`
- `View receipt`, linking to the matching receipt anchor on `/receipts`;
- a Basescan transaction link;
- an accessible manual dismiss control.

The toast uses existing Enkrate colors, typography, spacing, focus treatment, and
rounded geometry. It is announced through an accessible polite live region and
auto-dismisses after 8 seconds.

## Automatic Refresh

Every accepted execution increments the provider refresh version. Mounted consumers
include that version in their existing read effects:

- `/rules` reloads owner-created rules, each rule's spend window, and allowance;
- `MainnetAssetStatus` reloads B20 balances, live guard state, and wallet USDC;
- `/receipts` reloads owner-filtered successful execution receipts;
- readiness and builder allowance/asset reads refresh when mounted and subscribed.

The refresh signal causes reads only in mounted surfaces. It does not add broad
polling to those components.

## Testing

Add dependency-free focused assertions for the pure execution activity helpers:

- successful manual execution creates the required notification;
- a decoded owner-filtered `RuleExecuted` event creates the same notification;
- duplicate transaction hash plus log index is ignored;
- accepted execution increments the refresh version once;
- reverted or missing-event manual execution creates no success notification.

Run `npm run lint`, `npm run typecheck`, `npm run build`, the focused notification
assertions, and route smoke for the Enkrate routes.

## Scope Guard

Do not modify Solidity, deployment artifacts, transaction submission policy, keeper
automation, AI/chat, or any page layout beyond the small global notification surface.
