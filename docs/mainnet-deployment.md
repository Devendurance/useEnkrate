# Enkrate Base Mainnet deployment record

## Current status

**DEPLOYED / VERIFICATION PENDING — Phase 1C Mainnet deployment completed with constraints.**

The two production runtimes are deployed on Base Mainnet (`8453`). No Guard or standalone
1inch Adapter runtime was deployed. No user rule, USDC approval, 1inch quote, stock swap, or
keeper automation was performed.

### Public deployment evidence

| Runtime | Address | Transaction | Block | Gas used | Total ETH cost |
|---|---|---|---:|---:|---:|
| `EnkrateAssetRegistry` | `0x57192cb77D0C5E659d25651CF3BBbbe6F2C4ecA4` | `0x67740160b44e5d23fbfe3a9e4e6b998a4e394b9f92f9592a6fcdb621532c4ca6` | `51014632` | `599368` | `0.000003607371506293` |
| `EnkrateExecutionEngine` | `0x460BBb6f0064936E49A4458749575cC998a0db09` | `0x109c24c0d0ddd0814627f1e8686427a415ff49d8c42b338f27f2d2dc9dfc4100` | `51015985` | `2898845` | `0.000017440360175183` |

Deployer: `0xbCac292011ac4BC3eAe525531d54dD2aCE3Ee2B1`  
Base ETH: `0.0001` before deployment → `0.000078952268318524` after deployment  
Total deployment cost: `0.000021047731681476 ETH` (Base L2 gas plus recorded L1 fee).

The complete public metadata is stored locally in the ignored file
`deployments/base-mainnet.json`. It contains no private key or provider API key.

Source verification was not attempted because no `BASESCAN_API_KEY`, `ETHERSCAN_API_KEY`, or
verifier credential is configured locally. Status: **DEPLOYED / VERIFICATION PENDING**.

The fresh `npm run verify:phase1a-fork` preflight was attempted but remains blocked by the
environment: no official Base-patched runtime was serving `http://127.0.0.1:8547`, producing
`HttpRequestError`. The deterministic Forge suite and live Mainnet assertions passed.

## Required production deployments

The current Solidity architecture has two concrete deployable runtimes:

| Requested surface | Deployment treatment |
|---|---|
| `EnkrateAssetRegistry` | Deploy as a concrete contract. |
| `EnkrateGuard` | Abstract base inherited by `EnkrateExecutionEngine`; no standalone runtime. |
| `OneInchV6Adapter` | Internal Solidity library inlined into the engine; no standalone runtime. |
| `EnkrateExecutionEngine` | Deploy as a concrete contract after the registry. |

The deployment script verifies the constructor/configuration values after both deployments:

- Base Mainnet chain ID `8453`;
- USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`;
- B20 factory `0xB20f000000000000000000000000000000000000`;
- Coinbase B20 oracle registry `0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`;
- B20 policy registry `0x8453000000000000000000000000000000000002`;
- official 1inch router `0x111111125421cA6dc452d289314280a0f8842A65`;
- reference age threshold `86400` seconds;
- registry entries only for NVDAc and AAPLc with their locked Chainlink feeds.

## Safe broadcast procedure

From the repository root, after reviewing the generated artifacts and confirming the dedicated
wallet has Base ETH:

```text
forge fmt --root contracts --check
forge build --root contracts
forge test --root contracts
npm run verify:phase1a-fork
npm run deploy:mainnet
```

`npm run deploy:mainnet` reads `DEPLOYER_PRIVATE_KEY` only from the ignored `.env`, never logs
the key, checks the RPC chain ID and wallet balance, waits for both receipts, validates deployed
constructor state, and writes the local ignored `deployments/base-mainnet.json` record.

After a successful deployment, copy only the public registry/engine addresses and deployment
block into the ignored app environment as `NEXT_PUBLIC_ENKRATE_ASSET_REGISTRY`,
`NEXT_PUBLIC_ENKRATE_EXECUTION_ENGINE`, and `NEXT_PUBLIC_ENKRATE_DEPLOYMENT_BLOCK`. Never put
the private key or `ONEINCH_API_KEY` in a `NEXT_PUBLIC_*` variable.

## Phase 1C post-deployment assertions

- Registry and engine bytecode exist on Base Mainnet.
- Registry owner is the dedicated deployer; registry USDC and B20 factory match production.
- NVDAc and AAPLc are the only enabled entries, with the required Chainlink feeds and 8 decimals.
- Canonical `isB20`/`isB20Initialized` validation passes for both assets.
- Engine points to the expected registry, USDC, B20 oracle registry, B20 policy registry, factory,
  and official 1inch router; reference age threshold is `86400` seconds.
- `canAttemptExecution(0)` safely returns `false` with `RULE_NOT_ACTIVE` (`1`).
- Engine and registry ETH/token balances are zero after deployment.
- Live reads pass for both assets: transfer pause is clear, corporate-action pause is clear,
  multiplier is `1e18`, and Chainlink reference values/timestamps are readable.
- Configured production build, TypeScript, ESLint, and route smoke all pass. `/`, `/rules`,
  `/rules/new`, `/receipts`, and `/playbooks` return `200` without `CONTRACTS_NOT_CONFIGURED`.
- The server-only 1inch endpoint reaches the deployed engine; a nonexistent rule returns safe
  `404 RULE_NOT_FOUND`. No provider quote was requested for a real rule.