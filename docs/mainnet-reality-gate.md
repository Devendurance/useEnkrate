# Enkrate — Base Mainnet Reality Gate

**Status:** `GO — Phase 0C Shape A verified`  
**Scope:** Phase 0 only. No wallet authorization, keeper, contract, UI, or product-flow implementation was started. No Base Mainnet transaction was broadcast.

## Environment

- Verification timestamp: `2026-09-07T01:09:40.323Z` (UTC)
- Base network: Mainnet, chain ID `8453`
- Latest block used for the final verification pass: `50977018`
- RPC used: `https://base.publicnode.com`
- Script: `scripts/verify-mainnet-route.ts`
- Runtime: Node.js `v24.15.0`, `tsx 4.23.13`, `viem 2.56.3`
- Provider documentation checked: Base B20 docs, Base Standard Library interfaces, Chainlink Coinbase B20 docs, Enso API docs, 1inch API docs, Aerodrome Router source/ABI
- No secret, API key, private key, or wallet credential was used or printed.

The live run was deliberately throttled because public Base RPC endpoints rate-limit repeated `eth_call` requests. The script is reproducible and reports optional/unsupported selectors instead of treating them as successful.

### Repository/documentation contradictions recorded before Phase 0

The locked `docs/` set targets Enkrate on Base Mainnet, but pre-existing repository state still contains older planning references. No UI route, visual component, contract, wallet implementation, or keeper was changed to resolve them during this phase. The stale references include:

- `agent-state/project-state.md`, `agent-state/memory.md`, and `QWEN.md`: ApexStock/AegisFi naming, Base Sepolia, Pyth, and `cb*` ticker assumptions;
- `agent-state/left-off.md`: a next step for contracts on Base Sepolia;
- `src/components/connect-wallet.tsx`: `Testnet prototype` and a not-wired wallet message;
- `src/app/rules/new/page.tsx`: `cbSPY`, `cbNVDA`, and `cbAAPL` constants instead of the locked canonical B20 registry.

These contradictions are blockers for later product implementation, but were intentionally left untouched because Phase 0 permits only the verifier and this report (plus minimal verifier dependencies).

## Canonical Assets

Addresses are the identity. Ticker/name text was checked but not trusted as identity.

### USDC

- Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `name()`: `USD Coin`
- `symbol()`: `USDC`
- `decimals()`: `6`
- `totalSupply()` at block `50977018`: `4219482957826891`
- `B20Factory.isB20`: `false` (expected; USDC is not a B20 asset)

### NVDAc

- Address: `0xb20000000000000000000078ee7ce2fE4908108C`
- `name()`: `NVIDIA Corporation`
- `symbol()`: `NVDAc`
- `decimals()`: `8`
- `totalSupply()` at block `50977018`: `1373108020000`
- B20 precompile code presence: `1` byte (protocol precompile dispatch)
- `B20Factory.isB20`: `true`
- `B20Factory.isB20Initialized`: `true`

### AAPLc

- Address: `0xb200000000000000000000C2e324d24d7eEcd1fb`
- `name()`: `Apple Inc.`
- `symbol()`: `AAPLc`
- `decimals()`: `8`
- `totalSupply()` at block `50977018`: `619402990000`
- B20 precompile code presence: `1` byte (protocol precompile dispatch)
- `B20Factory.isB20`: `true`
- `B20Factory.isB20Initialized`: `true`

### Additional registry checks

The script also verified the locked registry entries for `GOOGLc` and `METAc`; both returned B20 identity and initialized state. They are included only for the B20/reference-data compatibility check and are not part of the requested quote pair.

## NVDAc Quote

### Direct live Aerodrome pool quote (read-only sanity check)

- Exact input: `5 USDC` = `5000000` USDC base units
- Output token: `NVDAc` at `0xb20000000000000000000078ee7ce2fE4908108C`
- Direct pool: `0x2e39A9018330c8784956998185D23D9dB503d1F7`
- Pool type: Aerodrome volatile pool (`stable=false`)
- Pool tokens: `token0 = USDC`, `token1 = NVDAc`
- Reserves observed: `r0=4207`, `r1=1785` (base units as returned by the pool)
- `pool.getAmountOut(5000000, USDC)`: `1783` raw NVDAc units (`0.00001783 NVDAc` at 8 decimals)
- Stable pool lookup: no pool

This proves a current onchain venue/pool quote exists, but it is **not** an Enso or 1inch aggregator quote and does not establish production-safe route calldata.

### Aggregator quote attempt

Enso Route API, current documented endpoint:

```text
POST https://api.enso.build/api/v1/shortcuts/route
```

Request intent used:

```json
{
  "chainId": 8453,
  "fromAddress": "0x9876543210987654321098765432109876543210",
  "receiver": "0x9876543210987654321098765432109876543210",
  "routingStrategy": "delegate",
  "tokenIn": ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
  "tokenOut": ["0xb20000000000000000000078ee7ce2fE4908108C"],
  "amountIn": ["5000000"],
  "slippage": "100"
}
```

Observed response: HTTP `403`:

```json
{
  "message": "API requests require an API key. Create one at https://developers.enso.build and send it as a Bearer token or apikey query parameter.",
  "error": "Forbidden",
  "statusCode": 403,
  "portalUrl": "https://developers.enso.build"
}
```

No Enso `amountOut`, `route`, `tx.to`, `tx.data`, `tx.value`, gas, approval/pre-transaction, spender, receiver, fee, expiry, or minimum-output fields were returned. No Enso calldata was available to simulate.

## AAPLc Quote

### Direct live Aerodrome pool quote (read-only sanity check)

- Exact input: `5 USDC` = `5000000` USDC base units
- Output token: `AAPLc` at `0xb200000000000000000000C2e324d24d7eEcd1fb`
- Direct pool: `0x6b74fC52Dd84bEb8d2D1BE16732749Dee70C45e7`
- Pool type: Aerodrome volatile pool (`stable=false`)
- Pool tokens: `token0 = USDC`, `token1 = AAPLc`
- Reserves observed: `r0=4872`, `r1=1521` (base units as returned by the pool)
- `pool.getAmountOut(5000000, USDC)`: `1519` raw AAPLc units (`0.00001519 AAPLc` at 8 decimals)
- Stable pool lookup: no pool

This proves a current onchain venue/pool quote exists, but it is **not** an Enso or 1inch aggregator quote and does not establish production-safe route calldata.

### Aggregator quote attempt

The same Enso request was made with `tokenOut` set to `0xb200000000000000000000C2e324d24d7eEcd1fb`.

Observed response: HTTP `403` with the same explicit API-key requirement. No Enso transaction or route fields were returned.

## Phase 0A — 1inch Fallback Attempt (Historical)

Current documented API host is `https://api.1inch.dev`. The read-only request attempted:

```text
GET https://api.1inch.dev/swap/v6.1/8453/quote?src=...USDC&dst=...B20&amount=5000000
```

For both NVDAc and AAPLc, with no API key, the observed response was HTTP `401`:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

No 1inch output amount, route, approval target, transaction target, calldata, gas, recipient, fee, or slippage fields were returned.

# Phase 0B — Authenticated Execution

**Verification timestamp:** `2026-09-07`  
**Input:** exactly `1 USDC` = `1_000_000` raw units.  
**API host:** `https://api.1inch.dev`  
**Chain:** Base Mainnet, `8453`  
**Security:** the local `ONEINCH_API_KEY` was loaded from the ignored `.env` file. It was sent only as `Authorization: Bearer <key>` by server-side scripts, never printed, persisted in this document, or exposed as a `NEXT_PUBLIC_*` variable.

## 1inch Authentication

**PASS.** Authenticated `approve/spender`, `tokens`, `quote`, and `swap` requests returned successfully. The old Phase 0A unauthenticated 401 result above is preserved as historical evidence.

## 1 USDC → NVDAc

- Source: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Destination: `0xb20000000000000000000078ee7ce2fE4908108C`
- Input: `1_000_000` raw (`1 USDC`)
- Quote output: `429_941` raw (`0.00429941 NVDAc`)
- Implied execution price: `232.590053 USDC/NVDAc`
- Chainlink reference: `$229.9573` (`updatedAt=1788545055`, age `206,057 s` at the verifier run); quote deviation: `+114.49 bps`
- OracleRegistry: `paused=false`, multiplier `1e18`; reference regime: `AGED_OFF_HOURS_REFERENCE`
- Quote gas: `401_962`
- Quote route: `BASE_AERODROME_SLIPSTREAM` (100%)
- Authenticated swap construction output: `BASE_PMM12` (100%)
- Quote request ID: `90dec555c39a95b7678f7fd37823954c`; swap request ID: `cb02a862c53f7f4b48e5dd2b9b1fe1f2`.
- Swap transaction gas: `225_972`; gas price: `7_802_878`; response returned `tx.to` and calldata. Swap output is route-state dependent and was not treated as the quote amount.

## 1 USDC → AAPLc

- Source: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Destination: `0xb200000000000000000000C2e324d24d7eEcd1fb`
- Input: `1_000_000` raw (`1 USDC`)
- Quote output: `310_756` raw (`0.00310756 AAPLc`)
- Implied execution price: `321.795878 USDC/AAPLc`
- Chainlink reference: `$320.0800` (`updatedAt=1788551915`, age `199,195 s` at the verifier run); quote deviation: `+53.61 bps`
- OracleRegistry: `paused=false`, multiplier `1e18`; reference regime: `AGED_OFF_HOURS_REFERENCE`
- Quote gas: `401_962`
- Quote route: `BASE_AERODROME_SLIPSTREAM` (100%)
- Authenticated swap construction output: `BASE_PMM12` (100%)
- Quote request ID: `7a6547bd6774e3d65221499398e45aa5`; swap request ID: `138999424daea29a97875ebacc03b910`.
- Swap transaction gas: `225_972`; gas price: `7_802_878`; response returned `tx.to` and calldata. Swap output is route-state dependent and was not treated as the quote amount.

The token-list endpoint recognized all three canonical addresses, including NVDAc and AAPLc. Direct-address routing is therefore also independently supported, but metadata discovery was not a blocker.

## Approval Architecture

- `approve/spender` on Base returned `0x111111125421ca6dc452d289314280a0f8842a65`.
- This is also the returned swap transaction target (`tx.to`), so the API uses the same 1inch router/spender architecture for ordinary ERC-20 approval.
- The route calldata pulls USDC from the `srcReceiver` through the 1inch executor. No Permit2 approval/address was required by the observed Classic Swap API flow; the API explicitly checked the ordinary ERC-20 allowance for this spender. The decoded transaction has a non-empty `bytes` argument, but it was not a Permit2 approval and no separate Permit2 authorization was requested.
- No provider fee field was returned in the quote or swap responses (`fee: unavailable`); the only returned cost fields were gas/gasPrice.
- The temporary fork harness uses an exact bounded allowance of `1_000_000` raw USDC and never grants infinite approval.

## Swap Calldata

The first authenticated swap request used:

```text
from/origin   = 0x1111111111111111111111111111111111111111
destReceiver = 0x2222222222222222222222222222222222222222
slippage     = 1
```

This caller/receiver separation succeeded at API route generation for both assets. Returned transaction semantics were:

- `tx.from`: the deterministic caller above;
- `tx.to`: `0x111111125421ca6dc452d289314280a0f8842a65`;
- `tx.value`: `0`;
- selector: `0x07ed2379` (`swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)`);
- decoded executor: `0x111116053F09d34a7Eae8102887004445176CA11`;
- decoded `srcReceiver`: the 1inch executor;
- decoded `dstReceiver`: the separate receiver above;
- decoded amount: `1_000_000`;
- decoded slippage-derived `minReturnAmount`: `425_128` in one run;
- raw calldata was recorded by selector/length/hash in the verifier, not dumped into this report.

An explicit `minReturn` request omitted `slippage` and encoded the caller-supplied bound directly. For example, `minReturn=429_000` decoded to `minReturnAmount=429_000`. An impossible `minReturn` (`expectedReturn + 1`) was rejected by the API with `INSUFFICIENT_RETURN`; fork execution of that negative case remains blocked by the B20 precompile limitation below.

## Fork Simulation

- Harness source: `fork-harness/src/RouteCallerHarness.sol`
- Runner: `scripts/run-phase0b-fork.ts`
- Fork command: Anvil using `https://mainnet.base.org`, pinned to block `50_977_018`, local RPC `http://127.0.0.1:8547`.
- Harness responsibilities implemented: hold exactly `1 USDC`, reset/set exact spender allowance, forward the exact provider target/calldata, and inspect caller/receiver balances.
- Funding uses Anvil impersonation of a forked USDC holder; no real USDC or private key is used.

**Result: BLOCKED / UNRESOLVED.** Base B20 addresses are custom precompiles with bytecode `0xef`. Vanilla Anvil faithfully forks that bytecode but returns `OpcodeNotFound` for `balanceOf`/settlement calls; no standard Anvil hardfork flag enables the Base B20 opcode. The harness therefore cannot honestly assert a B20 balance delta or claim Shape A execution on this runner. No production transaction was broadcast.

## Negative Tests

- Valid `minReturn`: API calldata generation PASS; fork settlement BLOCKED by the same B20 precompile limitation.
- Impossible `minReturn`: API rejects with `INSUFFICIENT_RETURN` before calldata generation; fork assertion BLOCKED.
- Insufficient approval: API correctly returned `NOT_ENOUGH_ALLOWANCE` when the harness caller had zero allowance; fork settlement assertion BLOCKED.
- Zero/insufficient USDC: route construction is available with `disableEstimate=true`, but fork execution assertion is BLOCKED by B20 opcode support.
- Alternate receiver: API calldata decodes a separate `dstReceiver`; fork delivery assertion BLOCKED.
- B20 policy compatibility: live Phase 0A policy reads remain encouraging, but execution compatibility is **UNRESOLVED** because the custom B20 implementation cannot execute in vanilla Anvil.

## Direct Aerodrome Reality Cross-check

The authenticated 1inch quote route identifies `BASE_AERODROME_SLIPSTREAM` (concentrated liquidity) at 100% for both pairs. The API did not expose a pool address, fee tier, or tick spacing in the response; those identifiers are therefore recorded as unavailable rather than inferred from the legacy volatile-pool reads. The authenticated swap-construction response selected `BASE_PMM12`, which is recorded as the actual generated route and not forced to Aerodrome.

## Execution Shape

**UNRESOLVED.** API semantics support a contract caller and a separate B20 receiver, which is consistent with preferred Shape A, but the required real fork settlement proof could not run against the custom B20 precompile.

## Recommended Adapter

**`1INCH CLASSIC SWAP` for further investigation.** It is the only authenticated provider path tested here, returns executable target/calldata, exposes a bounded `minReturn`, recognizes both canonical assets, and identifies Aerodrome Slipstream as the quoted route. It is not production-approved until a Base-compatible fork/runtime proves settlement and policy behavior.

## Final Phase Decision

### `NO-GO`

The authenticated route, spender, target, caller/receiver semantics, quote bounds, and API-level negative behavior are proven. The required Base-compatible fork execution, direct B20 delivery, and policy compatibility are not proven because vanilla Anvil cannot execute the Base B20 custom precompile. Do not begin Phase 1.

## Simulation

### NVDAc

- Aggregator route simulation: `BLOCKED`
- Why: both providers returned authentication errors; no provider calldata existed to pass to `eth_call` or Enso Quoter.
- Direct Aerodrome router `eth_call`: attempted with `from=0x9876543210987654321098765432109876543210`, exact input `5000000`, output recipient equal to the simulation address, and a 600-second deadline. The final metadata pass showed zero USDC and zero NVDAc/AAPLc for this address; the call reverted. No state changed. The call was made against the live router, but the public RPC did not expose a decoded revert reason.
- Prerequisites not satisfied: no funded/authorized user execution context and no bounded allowance to a selected final adapter/router. The script never created an allowance or broadcast a transaction.

### AAPLc

- Aggregator route simulation: `BLOCKED`
- Why: both providers returned authentication errors; no provider calldata existed to pass to `eth_call` or Enso Quoter.
- Direct Aerodrome router `eth_call`: attempted with the same zero-balance deterministic simulation address and reverted without a decoded reason. No state changed.
- Prerequisites not satisfied: no funded/authorized user execution context and no bounded allowance to a selected final adapter/router.

The direct pool `getAmountOut` reads are quotes, not execution simulations. They do not prove that a transfer-from, router approval, B20 receiver policy, or final settlement would succeed.

## Execution Integration Shape

**Chosen shape: none — unresolved; do not start Phase 1.**

The evidence is insufficient to choose Shape A, B, C, or D:

- Enso documentation says `router` uses an EOA and the returned Enso Router transaction; `delegate` uses the supplied `fromAddress` as execution context, and query-level `receiver` controls final output. Enso V2 Base addresses documented are:
  - Router V2: `0xF75584eF6673aD213a685a1B58Cc0330B8eA22Cf`
  - Delegate V2: `0xA2F4f9C6ec598CA8c633024f8851c79CA5F43e48`
- Those documentation facts are not a returned route for either asset. They do not prove which approval target, calldata ownership model, or B20 recipient behavior will be used for this exact route.
- A future authenticated Enso run must record the returned `tx.to`, `tx.data`, `tx.value`, `amountOut`, `gas`, `route`, approval/pre-transaction, `spender`, `receiver`, fee data, and any minimum-output field.

Therefore the specific answers are:

- **Who owns USDC at execution?** Unknown for the selected production route. The direct Aerodrome router model is EOA/contract dependent; aggregator route behavior was not returned.
- **Can Enkrate specify the stock recipient?** Unknown for the selected production route. Enso documents a query-level `receiver`, but this was not validated against a real route response.
- **What approval is required?** Unknown for the selected production route. Enso docs distinguish router approvals from delegate strategy; no exact returned spender was available.
- **Where is `minAmountOut` enforced?** Unknown for the selected production route. The direct Aerodrome interface accepts `amountOutMin`, but no provider-generated calldata or route-specific encoding was obtained.
- **Can the route be simulated before signing?** Not yet. Provider simulation was blocked by missing API authentication; direct router simulation reverted because the deterministic caller had no execution prerequisites.

## B20 Policy Compatibility

### Live state observed

For both NVDAc and AAPLc at the final verification block:

- `pausedFeatures()`: empty set (`[]`)
- `isPaused(TRANSFER)`: `false`
- `isPaused(MINT)`: `false`
- `isPaused(BURN)`: `false`
- `isPaused(SEIZE)`: the current live precompile reverted for this selector; this is recorded as an unsupported/unresolved selector, not treated as `false`
- `TRANSFER_SENDER_POLICY` ID: `5`
- `TRANSFER_RECEIVER_POLICY` ID: `5`
- `TRANSFER_EXECUTOR_POLICY` ID: `5`
- `IPolicyRegistry.isAuthorized(5, address)`: `true` for the deterministic simulation address, Aerodrome Router, Enso Router V2, and Enso Delegate V2
- `multiplier()`: `1000000000000000000` (`1e18`)
- `OracleRegistry.getOracleParams(token).paused`: `false`
- `OracleRegistry.getOracleParams(token).multiplier`: `1000000000000000000` (`1e18`)

The official B20 interfaces are:

- `pausedFeatures() returns (PausableFeature[] memory)`
- `isPaused(PausableFeature feature) returns (bool)`
- `policyId(bytes32 policyScope) returns (uint64)`
- `transferFrom` consults sender, receiver, and executor policy slots
- `ContractPaused` and `PolicyForbids` are execution-time failure modes

### Intermediary conclusion

**Current answer: UNKNOWN — not proven safe for an Enkrate intermediary.**

The observed policy IDs and current allow results are encouraging for the tested addresses, and no transfer pause is active. However, a policy read for a deterministic address is not proof that a future Enkrate deployment address will remain authorized, nor does it prove the route’s actual sender/receiver/executor sequence. The direct router call reverted before settlement prerequisites were present, so it cannot prove an intermediary transfer succeeds. A funded, bounded, non-broadcast fork/state-override or provider simulation using the exact authenticated route is still required.

## Reference Data

Official Chainlink Coinbase B20 feed addresses on Base Mainnet:

| Asset | Feed | Answer | Feed decimals | `updatedAt` | Age at final script time |
|---|---|---:|---:|---:|---:|
| AAPLc | `0x787f13dEa48Db0897CbCDD985de77809D837F988` | `32008000000` (`$320.0800`) | 8 | `1788551915` | ~`191498` s |
| NVDAc | `0x04689a41629776563E6822F76f2e57D148d28513` | `22995730000` (`$229.9573`) | 8 | `1788545055` | ~`198362` s |

The final script also read the GOOGLc and METAc feeds. All four feed calls returned normally with 8 decimals.

Official verified `OracleRegistry`:

- Address: `0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`
- Verified source contract: `OracleRegistry`
- Read method: `getOracleParams(address token) returns (uint256 multiplier, bool paused)`

Important correction: this address is not the B20 `PolicyRegistry` precompile. Official B20 precompiles are:

- B20 Factory: `0xB20f000000000000000000000000000000000000`
- Activation Registry: `0x8453000000000000000000000000000000000001`
- Policy Registry: `0x8453000000000000000000000000000000000002`

The feed values are aged at this verification time. Per the official Chainlink documentation, Coinbase B20 feeds are 24/5 and can hold the last value outside the underlying market session. The age was therefore not treated as an automatic failure or conflated with `OracleRegistry.paused`.

## Phase 0B Historical Blockers

1. **Phase 0A historical:** no authenticated Enso API key was available; Enso returned HTTP `403`.
2. **Phase 0A historical:** no authenticated 1inch API key was available; 1inch returned HTTP `401`. Phase 0B authentication now passes.
3. **Phase 0B:** vanilla Anvil cannot execute Base B20 custom precompile bytecode `0xef` (`OpcodeNotFound`), so the required real fork settlement and direct-recipient balance assertions remain unresolved.
4. **Phase 0B:** B20 policy reads are encouraging (policy ID `5`, current router/executor addresses authorized), but execution compatibility for a future Enkrate contract address is not proven without a Base-compatible fork/runtime.
5. **B20 `SEIZE` pause selector and ERC-8056 optional selectors are unsupported on the current live token precompiles** (`isPaused(3)`, `uiMultiplier()`, `newUIMultiplier()`, and `effectiveAt()` reverted). `multiplier()` and the official OracleRegistry values did work. This compatibility nuance needs to be handled explicitly in future integration code.
6. **The direct pools are extremely shallow in the returned base-unit values** (`r0=4207`/`4872`, `r1=1785`/`1521`). Do not infer usable production liquidity from pool existence alone; the authenticated aggregator quote and simulation must establish practical execution.

## Phase 0B Historical Recommendation

### `NO-GO — Base-compatible fork execution unresolved (superseded by Phase 0C)`

The authenticated 1inch acceptance items are proven at the API/calldata level, but the required Base-compatible fork execution, final B20 recipient balance delta, negative execution assertions, and policy compatibility remain unresolved because vanilla Anvil cannot execute the B20 custom precompile. The direct Aerodrome pool read and authenticated Slipstream route prove venues, but not final settlement.

This was the correct Phase 0B decision before the official Base-compatible runtime was installed. Phase 0C below supersedes it with the native-runtime execution evidence. No real transaction was broadcast.

## Sources

- Base B20 tokenized stocks: <https://docs.base.org/specifications/b20/tokenized-stocks-on-base>
- Base B20 interfaces: <https://github.com/base/base-std/tree/main/src/interfaces>
- Base B20 constants and precompile addresses: <https://docs.base.org/specifications/b20/reference/constants-addresses>
- Chainlink Coinbase B20 feeds: <https://docs.chain.link/data-feeds/tokenized-equity-feeds/coinbase>
- Enso Route API: <https://docs.enso.build/api-reference/defi-shortcuts/optimal-route-between-two-tokens-1>
- Enso authentication: <https://docs.enso.build/pages/build/get-started/authentication.md>
- Enso deployments/routing strategies: <https://docs.enso.build/pages/build/reference/deployments.md>, <https://docs.enso.build/pages/build/reference/routing-strategies.md>
- 1inch Coinbase Tokenized Stocks: <https://1inch.com/blog/post/coinbase-tokenized-stocks>
- Aerodrome Router ABI/source: <https://github.com/aerodrome-finance/contracts/blob/main/contracts/interfaces/IRouter.sol>

## Phase 0C — Native B20 Runtime

**Verification date:** `2026-09-07`  
**Execution mode:** local-only Base Mainnet fork; no transaction was broadcast to Base Mainnet and no real USDC was spent.

### Official Base runtime

- WSL2 distribution: Ubuntu `26.04 LTS`, Linux `6.18.33.2-microsoft-standard-WSL2`.
- Installation authority: official `base/base-anvil` installer and release artifacts.
- Acceptance binaries: Base patched Foundry `v1.1.1`, underlying `forge/anvil 1.6.0-v1.1.1`, Foundry commit `dccbdfd0b37d364cc50e0e15f1686ab029543c6f`.
- Stable release target: `base-anvil v1.1.1`, built against `base/base` commit `3ce1275095c21506d9e1173b7bd08425357112b7`.
- Commands used: `base-forge build --root fork-harness`; patched `anvil --base --fork-url https://mainnet.base.org --fork-block-number 50977018 --port 8547`.
- The current official immutable nightly was also downloaded and SHA-256 verified against Base's published digest, but its `forge/anvil 1.6.0-nightly` binary (base-anvil commit `98e7839c65f64aee9627b69a9b98b79afaeb1fae`, built against `base/base 3eb481791135e465e7e1682218f1e4619b574fa6`) segfaulted before serving RPC in this WSL image. It was not used for acceptance; this is recorded as a tooling limitation, not a product result.

### Fork and native B20 smoke test

- Fork chain ID: `8453`.
- Fork block: `50977018`.
- Fork block hash: `0x92addeba396eef816e1c2f5952126697b052507d536dc6ee1deafc9ea3d4dd00`.
- Patched dispatch was enabled with `--base`; the fork served Base's native B20 precompile behavior rather than stock Anvil's `OpcodeNotFound` path.
- Direct `NVDAc.balanceOf(0x2222222222222222222222222222222222222222)` returned `0`.
- Direct `NVDAc.decimals()` returned `8`.
- The native `0xef` marker therefore executed successfully in the acceptance fork; no Solidity B20 mock or unofficial emulator was used.

### Shape A execution evidence

- Temporary harness: `RouteCallerHarness` at `0xa5B00a9b466B77043e3Ca8DB0886a9EF641c6A20`.
- 1inch target and spender: `0x111111125421ca6dc452d289314280a0f8842a65`.
- Separate deterministic receiver: `0x2222222222222222222222222222222222222222`.
- Input: exactly `1 USDC` = `1_000_000` raw units.
- Fresh authenticated NVDAc route request ID: `7cf9fce23f057c19955eff5b49d87bcd`.
- Route protocol: `BASE_AERODROME_SLIPSTREAM` (100%).
- Quote output: `429_932` raw NVDAc; actual delivered output: `430_722` raw (`0.00430722 NVDAc`).
- Harness before: exactly `1_000_000` USDC and `0` NVDAc.
- Harness after: USDC delta `-1_000_000`; NVDAc balance `0` (purchased stock not retained).
- User receiver NVDAc delta: `+430_722` raw.
- Bounded approval: allowance before `1_000_000`; after `1_000_000`; exact finite allowance, no infinite approval introduced.
- Direct receiver behavior: **PASS** — the receiver differs from the harness and received the purchased NVDAc.
- B20 policy path: **PASS** — the selected sender/receiver/executor route settled through the native B20 transfer path without policy rejection. This is consistent with the previously recorded active transfer policy ID `5` and authorized tested router/executor state.

### Required negative tests

- Valid `minReturn`: **PASS** — on-chain execution succeeded with `minReturn=425_632`; receiver delta was `+430_722`.
- Impossible `minReturn`: **PASS** — locally mutated calldata used `minReturn=859_864`; the fork transaction reverted atomically and receiver delta remained `0`. 1inch independently rejected the same bound with `INSUFFICIENT_RETURN`.
- Insufficient allowance: **PASS** — zero allowance caused execution failure and no stock transfer persisted.
- Insufficient USDC: **PASS** — fork-local USDC was swept before execution; execution failed and no stock transfer persisted.
- Alternate receiver: **PASS** — harness and receiver were distinct, and the receiver received all delivered NVDAc.

### Optional AAPLc confirmation

- Fresh authenticated route protocol: `BASE_PMM12` (100%).
- Quote output: `310_715` raw AAPLc; actual receiver output: `310_715` raw.
- Harness retained `0` AAPLc; valid `minReturn`, impossible `minReturn`, insufficient allowance, and insufficient USDC checks also passed in the fork run.

### Execution Shape

`SHAPE A VERIFIED`

### Final Phase Decision

#### GO

Shape A and the required negative tests pass against the official Base-compatible patched runtime. Phase 1 remains out of scope and must not begin without explicit permission.