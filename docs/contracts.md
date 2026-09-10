# Enkrate contracts — Phase 1A

## Scope

Phase 1A implements the production execution core only. It does not deploy, wire the UI,
create a keeper service, or broadcast a Base Mainnet transaction.

The workspace is `contracts/` and uses Solidity `0.8.24`, OpenZeppelin Contracts `5.7.0`,
and Foundry. The accepted live B20 fork requires the official Base-patched runtime documented
in [`mainnet-reality-gate.md`](./mainnet-reality-gate.md), not stock Anvil.

## Architecture: zero persistent custody

Each successful execution follows Shape A:

```text
rule owner --exact USDC transferFrom--> EnkrateExecutionEngine
engine --exact finite approval--> official 1inch V6 router
router --swap--> B20 directly to rule owner
```

The engine rejects a nonzero starting USDC balance, approves exactly `amountIn`, and resets
the router allowance to zero after the swap. Any unused USDC is returned to the rule owner.
The engine checks its B20 balance before and after and reverts if it retained purchased stock.
The user's USDC authorization is an ordinary finite allowance to the engine; Permit2 and
session-key systems are intentionally out of scope.

## Rule lifecycle

`createRule` supports only:

- `RECURRING`: `intervalSeconds` is required and each successful execution updates `lastExecutedAt`.
- `CONDITIONAL_PRICE`: `triggerPrice` uses an 8-decimal USD convention and a successful execution
  consumes the rule (`EXECUTED`). The final trigger check uses the realized settlement amount,
  never a keeper-provided price.

`cancelRule` is owner-only. Cancelled and expired rules cannot execute. `getRule`,
`getSpendWindow`, and `canAttemptExecution` expose stored state and deterministic block reasons.

The spend limit is a fixed/tumbling 24-hour window beginning at the first spend. It is not a
mathematically exact sliding window. The check is `window.spent + amountIn <= maxSpendPerWindow`;
the window resets after 24 hours.

## Canonical asset registry

`EnkrateAssetRegistry` identifies assets by address, not ticker. It starts with:

| Asset | Address | Chainlink feed |
|---|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | n/a |
| NVDAc | `0xb20000000000000000000078ee7ce2fE4908108C` | `0x04689a41629776563E6822F76f2e57D148d28513` |
| AAPLc | `0xb200000000000000000000C2e324d24d7eEcd1fb` | `0x787f13dEa48Db0897CbCDD985de77809D837F988` |

Execution checks the official B20 identity at the boundary. The guard calls `isB20` and
`isB20Initialized` on the official factory precompile first; the accepted Base-patched fork
dispatches these methods even though the address has no EXTCODE-visible bytecode. If a runtime
does not support the factory call, the guard falls back to the native one-byte `0xef` B20 marker.
This matches the direct native B20 dispatch proven in Phase 0C without treating EXTCODE as the
source of truth for a precompile.

## B20 / corporate-action guard

`EnkrateGuard.inspectAsset` reads:

- official Coinbase `OracleRegistry.getOracleParams(token)`;
- Chainlink V3 `latestRoundData()` and feed decimals;
- B20 `isPaused(TRANSFER)`;
- official B20 factory initialization state.

`oraclePaused == true` is a hard `CORPORATE_ACTION_HOLD`. It is not conflated with ordinary
reference aging. The configured reference-age threshold defaults to the deployment argument
(the test deployment uses one day); an aged feed can execute only when the rule explicitly
sets `allowAgedReference`. There is no fake market-calendar boolean and no 15-minute rule.

The Chainlink feed is an 8-decimal total-return value that already includes Coinbase's relevant
multiplier semantics. The engine records the OracleRegistry multiplier in `RuleExecuted` but
does not multiply the feed price by it again.

Where a B20 exposes configured transfer policy slots, the execution guard queries the official
policy registry for the owner's receiver authorization and the decoded 1inch executor's
executor authorization. The B20 token remains the final authority for route-specific source
policy checks during `transferFrom`.

## 1inch V6 adapter validation

`OneInchV6Adapter` accepts only selector `0x07ed2379`, the observed generic Classic Swap call:

```solidity
swap(address executor, SwapDescription desc, bytes permit)
```

Before the call, Enkrate asserts:

- the call target is the immutable official Base router `0x111111125421cA6dc452d289314280a0f8842A65`;
- selector is the supported generic swap selector;
- `srcToken == USDC`;
- `dstToken == rule.targetStock`;
- `dstReceiver == rule.owner`;
- `amount == rule.amountIn`;
- executor and `srcReceiver` are nonzero;
- partial-fill flag is not set;
- `minReturnAmount >= requiredMinOut`.

The route provider may change the internal route. Enkrate does not hard-code Aerodrome or PMM
internals. `maxSlippageBps` is a quote-builder constraint; because the contract cannot know the
API quote independently, the contract enforces the reference-derived hard floor instead.

## Minimum output and realized price

`requiredMinOut` derives a B20 raw-unit floor from the USDC amount, the 8-decimal Chainlink
reference, and `maxReferenceDeviationBps`. After the call, the owner B20 balance delta must be
at least that floor. A conditional rule then computes:

```text
realizedPrice (8 decimals) = actual USDC spent × 10^(B20 decimals + 2) / actual B20 received
```

For a buy condition, execution succeeds only when `realizedPrice <= triggerPrice`. Any failure
reverts the entire transaction, including the swap and all allowance/balance changes.

## Receipts

Only successful executions emit `RuleExecuted`, containing rule/owner/asset, actual amount in,
actual amount out, realized price, reference price and update timestamp, multiplier, and block
timestamp. Reverted evaluations do not leave logs; callers can use `canAttemptExecution` or an
offchain evaluation record for waiting/blocking states.

## Validation commands

```text
forge fmt --root contracts
forge build --root contracts
forge test --root contracts
npm run typecheck       # if added by the application workspace
npm run lint
npm run build
```

The pinned live route runner is `scripts/run-phase1a-fork.ts`. It intentionally refuses non-Base
forks and never broadcasts to Base Mainnet.