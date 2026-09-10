/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 0 — Mainnet Reality Gate verification script (read-only).
 *
 * Sections:
 *   1. Network confirmation (Base Mainnet chainId + block).
 *   2. Canonical asset metadata (USDC, NVDAc, AAPLc, GOOGLc, METAc).
 *   3. Coinbase B20 oracle registry paused state per token.
 *   4. Chainlink Coinbase B20 feeds (latestRoundData) per token.
 *   5. Aerodrome pool discovery (USDC/NVDAc, USDC/AAPLc).
 *   6. Enso Route API quote attempt (preserved Phase 0A evidence).
 *   7. Authenticated 1inch Classic Swap API (1 USDC routes/calldata).
 *   8. Non-broadcast simulation against provider calldata.
 *   9. Aerodrome direct simulation (preserved Phase 0A sanity check).
 *  10. Summary.
 *
 * This file is intentionally side-effect-free. Nothing is broadcast.
 */

import "dotenv/config";
import {
  createPublicClient,
  http,
  defineChain,
  encodeFunctionData,
  keccak256,
  parseAbi,
  getAddress,
  type Address,
} from "viem";

// Canonical addresses from docs/architecture.md + docs.base.org
const BASE_CHAIN_ID = 8453n;
const BASE_RPCS = [ "https://base.publicnode.com", "https://mainnet.base.org", "https://base.llamarpc.com" ];
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const NVDAc = "0xb20000000000000000000078ee7ce2fE4908108C" as Address;
const AAPLc = "0xb200000000000000000000C2e324d24d7eEcd1fb" as Address;
const GOOGLc = "0xb2000000000000000000002D0BA3164cc74f58B7" as Address;
const METAc = "0xb2000000000000000000008bC8786B856E61707C" as Address;
const B20_REGISTRY = "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD" as Address;
const B20_FACTORY = "0xB20f000000000000000000000000000000000000" as Address;
const B20_POLICY_REGISTRY = "0x8453000000000000000000000000000000000002" as Address;
const CHAINLINK_FEEDS = {
  AAPLc: "0x787f13dEa48Db0897CbCDD985de77809D837F988" as Address,
  GOOGLc: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2" as Address,
  METAc: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D" as Address,
  NVDAc: "0x04689a41629776563E6822F76f2e57D148d28513" as Address,
};
const ENSO_ROUTER_V2 = "0xF75584eF6673aD213a685a1B58Cc0330B8eA22Cf" as Address;
const ENSO_DELEGATE_V2 = "0xA2F4f9C6ec598CA8c633024f8851c79CA5F43e48" as Address;
const AERODOME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as Address;
const AERODOME_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as Address;
const FIVE_USDC_UNITS = 5_000_000n;
const ONE_USDC_UNITS = 1_000_000n;
// Deterministic address used for eth_call only. The script prints its live
// balances; it is never funded and no transaction is signed or broadcast.
const SIMULATION_FROM = "0x9876543210987654321098765432109876543210" as Address;
// Phase 0B uses a separate deterministic receiver to prove caller/recipient
// separation. These addresses are never funded and no transaction is signed.
const PHASE_0B_CALLER = "0x1111111111111111111111111111111111111111" as Address;
const PHASE_0B_RECEIVER = "0x2222222222222222222222222222222222222222" as Address;
const INTERMEDIARY_ADDRESSES: Array<[string, Address]> = [
  ["simulationEOA", SIMULATION_FROM],
  ["AerodromeRouter", AERODOME_ROUTER],
  ["EnsoRouterV2", ENSO_ROUTER_V2],
  ["EnsoDelegateV2", ENSO_DELEGATE_V2],
];

const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
]);

const b20FactoryAbi = parseAbi([
  "function isB20(address token) view returns (bool)",
  "function isB20Initialized(address token) view returns (bool)",
]);

const oracleRegistryAbi = parseAbi([
  "function getOracleParams(address token) view returns (uint256 multiplier, bool paused)",
]);

// Official IB20/IB20Asset read surface. PausableFeature values are
// TRANSFER=0, MINT=1, BURN=2, SEIZE=3.
const b20Abi = parseAbi([
  "function pausedFeatures() view returns (uint8[])",
  "function isPaused(uint8 feature) view returns (bool)",
  "function policyId(bytes32 policyScope) view returns (uint64)",
  "function TRANSFER_SENDER_POLICY() view returns (bytes32)",
  "function TRANSFER_RECEIVER_POLICY() view returns (bytes32)",
  "function TRANSFER_EXECUTOR_POLICY() view returns (bytes32)",
  "function multiplier() view returns (uint256)",
  "function uiMultiplier() view returns (uint256)",
  "function newUIMultiplier() view returns (uint256)",
  "function effectiveAt() view returns (uint256)",
]);

const policyRegistryAbi = parseAbi([
  "function isAuthorized(uint64 policyId, address account) view returns (bool)",
  "function policyExists(uint64 policyId) view returns (bool)",
]);

const aggregatorV3Abi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);

const aerodromePoolAbi = parseAbi([
  "function getReserves() view returns (uint256 _reserve0, uint256 _reserve1, uint256 _blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getAmountOut(uint256 amountIn, address tokenIn) view returns (uint256)",
]);

const aerodromeFactoryAbi = parseAbi([
  "function getPool(address tokenA, address tokenB, bool stable) view returns (address)",
]);

const aerodromeRouterAbi = [{ type: "function", name: "swapExactTokensForTokens", stateMutability: "nonpayable", inputs: [ { name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" }, { name: "routes", type: "tuple[]", components: [ { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "stable", type: "bool" }, { name: "factory", type: "address" } ] }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" } ], outputs: [ { name: "", type: "uint256" } ] }] as const;

const base = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: BASE_RPCS }, public: { http: BASE_RPCS } },
  blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
  testnet: false,
});

function header(title: string) {
  console.log("\n" + "=".repeat(78));
  console.log(title);
  console.log("=".repeat(78));
}

function fmtAddress(a: string): string {
  return getAddress(a);
}

function safeString(s: string | undefined | null): string {
  if (s === undefined || s === null) return "<undefined>";
  return s;
}

function printNormalizedRoute(label: string, provider: string, body: any, inputAmount = ONE_USDC_UNITS) {
  const tx = body?.tx ?? {};
  const amountOut = body?.amountOut ?? body?.toTokenAmount ?? body?.dstAmount ?? "<unavailable>";
  const gas = body?.gas ?? body?.estimatedGas ?? tx?.gas ?? "<unavailable>";
  const target = tx?.to ?? body?.to ?? "<unavailable>";
  const value = tx?.value ?? "0";
  const spender = body?.spender ?? body?.approval?.spender ?? body?.approvals?.[0]?.spender ?? "<unavailable>";
  const receiver = body?.receiver ?? body?.destReceiver ?? body?.destinationReceiver ?? "<unavailable>";
  console.log(`  NORMALIZED ${label}: provider=${provider} inputToken=${USDC} outputToken=${label.includes("NVDA") ? NVDAc : AAPLc} inputAmount=${inputAmount} amountOut=${amountOut} gas=${gas} target=${target} value=${value} spender=${spender} receiver=${receiver}`);
  if (tx?.data) console.log(`  CALldata ${label}: ${summarizeCalldata(tx.data)}`);
  if (body?.route) console.log(`  ROUTE ${label}: ${JSON.stringify(body.route)}`);
}

function summarizeCalldata(data: string | undefined) {
  if (!data) return "<unavailable>";
  return `selector=${data.slice(0, 10)} bytes=${Math.max(0, (data.length - 2) / 2)} keccak256=${keccak256(data as `0x${string}`)}`;
}

async function oneInchRequest(
  key: string,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(`https://api.1inch.dev/swap/v6.1/${BASE_CHAIN_ID.toString()}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? body?.requestId;
  return { status: response.status, ok: response.ok, body, requestId, url: url.toString() };
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_r, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, process.env.VERIFY_FAST === "1" ? 0 : ms));
}

async function readOptional<T>(label: string, read: () => Promise<T>): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await read() };
  } catch (err) {
    return { error: `${label}: ${(err as Error).message.split("\n")[0]}` };
  }
}

async function main() {
  const ts = new Date().toISOString();
  header("ENKRATE — PHASE 0 MAINNET REALITY GATE");
  console.log("Timestamp:", ts);
  console.log("Mode:      read-only / no broadcast");
  console.log(
    "Env keys:",
    "ENSO_API_KEY=" + (process.env.ENSO_API_KEY ? "<set>" : "<missing>"),
    "ONEINCH_API_KEY=" + (process.env.ONEINCH_API_KEY ? "<set>" : "<missing>"),
  );

  const client = createPublicClient({
    chain: base,
    transport: http(BASE_RPCS[0], { retryCount: 0, timeout: 15_000 }),
    batch: { batchMulticall: true },
  });

  // 1. Network confirmation
  header("1. Network confirmation");
  const blockNumber = await client.getBlockNumber();
  const chainId = await client.getChainId();
  console.log("RPC:                 ", BASE_RPCS[0]);
  console.log("chainId:             ", chainId.toString());
  console.log("latestBlockNumber:   ", blockNumber.toString());
  if (chainId !== Number(BASE_CHAIN_ID)) {
    throw new Error(`Wrong chainId: got ${chainId}, expected ${BASE_CHAIN_ID}`);
  }

  // 2. Asset metadata
  header("2. Canonical asset metadata");
  const tokens: Array<{ label: string; address: Address }> = [
    { label: "USDC", address: USDC },
    { label: "NVDAc", address: NVDAc },
    { label: "AAPLc", address: AAPLc },
    { label: "GOOGLc", address: GOOGLc },
    { label: "METAc", address: METAc },
  ];
  for (const t of tokens) {
    try {
      const name = await withTimeout(client.readContract({ address: t.address, abi: erc20Abi, functionName: "name" }), 20000, "name");
      await sleep(300);
      const symbol = await withTimeout(client.readContract({ address: t.address, abi: erc20Abi, functionName: "symbol" }), 20000, "symbol");
      await sleep(300);
      const decimals = await withTimeout(client.readContract({ address: t.address, abi: erc20Abi, functionName: "decimals" }), 20000, "decimals");
      await sleep(300);
      const totalSupply = await withTimeout(client.readContract({ address: t.address, abi: erc20Abi, functionName: "totalSupply" }), 20000, "totalSupply");
      const simulationBalance = await withTimeout(client.readContract({ address: t.address, abi: erc20Abi, functionName: "balanceOf", args: [SIMULATION_FROM] }), 20000, "balanceOf");
      const code = await client.getCode({ address: t.address });
      const isB20 = await client.readContract({ address: B20_FACTORY, abi: b20FactoryAbi, functionName: "isB20", args: [t.address] });
      const isB20Initialized = await client.readContract({ address: B20_FACTORY, abi: b20FactoryAbi, functionName: "isB20Initialized", args: [t.address] });
      console.log(`  ${t.label.padEnd(6)} ${fmtAddress(t.address)}  name="${safeString(name)}"  symbol="${safeString(symbol)}"  decimals=${decimals}  totalSupply=${totalSupply.toString()}  balanceOf(simulationEOA)=${simulationBalance.toString()}  codeBytes=${code ? Math.max(0, (code.length - 2) / 2) : 0}  factory.isB20=${isB20}  factory.isB20Initialized=${isB20Initialized}`);
    } catch (err) {
      console.log(`  ${t.label.padEnd(6)} ${fmtAddress(t.address)}  READ_FAILED ${(err as Error).message}`);
    }
    await sleep(400);
  }

  // 3. B20 token pause/policy state + OracleRegistry corporate-action state
  header("3. B20 pause, policy, multiplier, and OracleRegistry state");
  for (const t of tokens) {
    if (t.label === "USDC") {
      console.log(`  USDC is not a B20 — skip`);
      continue;
    }
    const pausedFeatures = await readOptional("pausedFeatures", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "pausedFeatures" }));
    const pauseReads = await Promise.all([0, 1, 2, 3].map((feature) => readOptional(`isPaused(${feature})`, () => client.readContract({ address: t.address, abi: b20Abi, functionName: "isPaused", args: [feature] }))));
    const senderScope = await readOptional("TRANSFER_SENDER_POLICY", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "TRANSFER_SENDER_POLICY" }));
    const receiverScope = await readOptional("TRANSFER_RECEIVER_POLICY", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "TRANSFER_RECEIVER_POLICY" }));
    const executorScope = await readOptional("TRANSFER_EXECUTOR_POLICY", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "TRANSFER_EXECUTOR_POLICY" }));
    const senderPolicy = senderScope.value === undefined ? { error: "scope unavailable" } : await readOptional("sender policyId", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "policyId", args: [senderScope.value] }));
    const receiverPolicy = receiverScope.value === undefined ? { error: "scope unavailable" } : await readOptional("receiver policyId", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "policyId", args: [receiverScope.value] }));
    const executorPolicy = executorScope.value === undefined ? { error: "scope unavailable" } : await readOptional("executor policyId", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "policyId", args: [executorScope.value] }));
    const senderAuthorized = senderPolicy.value === undefined ? { error: "policy unavailable" } : await readOptional("sender authorization", () => client.readContract({ address: B20_POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "isAuthorized", args: [senderPolicy.value, SIMULATION_FROM] }));
    const receiverAuthorized = receiverPolicy.value === undefined ? { error: "policy unavailable" } : await readOptional("receiver authorization", () => client.readContract({ address: B20_POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "isAuthorized", args: [receiverPolicy.value, SIMULATION_FROM] }));
    const executorAuthorized = executorPolicy.value === undefined ? { error: "policy unavailable" } : await readOptional("executor authorization", () => client.readContract({ address: B20_POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "isAuthorized", args: [executorPolicy.value, SIMULATION_FROM] }));
    const multiplier = await readOptional("multiplier", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "multiplier" }));
    const uiMultiplier = await readOptional("uiMultiplier", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "uiMultiplier" }));
    const newUIMultiplier = await readOptional("newUIMultiplier", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "newUIMultiplier" }));
    const effectiveAt = await readOptional("effectiveAt", () => client.readContract({ address: t.address, abi: b20Abi, functionName: "effectiveAt" }));
    const oracle = await readOptional("OracleRegistry.getOracleParams", () => client.readContract({ address: B20_REGISTRY, abi: oracleRegistryAbi, functionName: "getOracleParams", args: [t.address] }));
    const oracleValue = oracle.value;
    const render = (result: { value?: any; error?: string }) => result.value === undefined ? `<unavailable: ${result.error}>` : String(result.value);
    console.log(`  ${t.label.padEnd(6)} token=${fmtAddress(t.address)} pausedFeatures=${pausedFeatures.value ? JSON.stringify(pausedFeatures.value) : `<unavailable: ${pausedFeatures.error}>`} isPaused=[transfer:${render(pauseReads[0])},mint:${render(pauseReads[1])},burn:${render(pauseReads[2])},seize:${render(pauseReads[3])}] senderPolicy=${render(senderPolicy)} receiverPolicy=${render(receiverPolicy)} executorPolicy=${render(executorPolicy)} authorized(simulationEOA)=[sender:${render(senderAuthorized)},receiver:${render(receiverAuthorized)},executor:${render(executorAuthorized)}] multiplier=${render(multiplier)} uiMultiplier=${render(uiMultiplier)} pendingMultiplier=${render(newUIMultiplier)} effectiveAt=${render(effectiveAt)} oraclePaused=${oracleValue ? String(oracleValue[1]) : `<unavailable: ${oracle.error}>`} oracleMultiplier=${oracleValue ? String(oracleValue[0]) : `<unavailable: ${oracle.error}>`}`);
    if (senderPolicy.value !== undefined && receiverPolicy.value !== undefined && executorPolicy.value !== undefined) {
      const intermediaryChecks = await Promise.all(INTERMEDIARY_ADDRESSES.map(async ([name, address]) => {
        const [sender, receiver, executor] = await Promise.all([
          client.readContract({ address: B20_POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "isAuthorized", args: [senderPolicy.value, address] }),
          client.readContract({ address: B20_POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "isAuthorized", args: [receiverPolicy.value, address] }),
          client.readContract({ address: B20_POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "isAuthorized", args: [executorPolicy.value, address] }),
        ]);
        return `${name}:sender=${sender},receiver=${receiver},executor=${executor}`;
      }));
      console.log(`    intermediary policy checks: ${intermediaryChecks.join(" | ")}`);
    }
    await sleep(400);
  }

  // 4. Chainlink feeds
  header("4. Chainlink Coinbase B20 reference feeds (latestRoundData)");
  const referencePrices: Record<string, { price: number; updatedAt: bigint; ageSec: bigint; multiplier?: bigint; paused?: boolean }> = {};
  for (const [ticker, feed] of Object.entries(CHAINLINK_FEEDS)) {
    try {
      const round = await client.readContract({ address: feed, abi: aggregatorV3Abi, functionName: "latestRoundData" });
      await sleep(300);
      const decimals = await client.readContract({ address: feed, abi: aggregatorV3Abi, functionName: "decimals" });
      const [, answer, , updatedAt] = round;
      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const ageSec = nowSec - updatedAt;
      const humanPrice = Number(answer) / 10 ** Number(decimals);
      referencePrices[ticker] = { price: humanPrice, updatedAt, ageSec };
      console.log(
        `  ${ticker.padEnd(6)} feed=${fmtAddress(feed)}  answer=${answer.toString()}  (~$${humanPrice.toFixed(4)})  decimals=${decimals}  updatedAt=${updatedAt.toString()}  ageSec=${ageSec.toString()}`,
      );
    } catch (err) {
      console.log(`  ${ticker.padEnd(6)} feed.read FAILED: ${(err as Error).message}`);
    }
    await sleep(400);
  }

  // 5. Aerodrome pool discovery
  header("5. Aerodrome pool discovery (USDC / NVDAc / AAPLc)");
  const discoveredPools: Record<string, { stable: boolean; pool: Address; r0: bigint; r1: bigint; t0: Address; t1: Address }> = {};
  for (const t of [{ label: "NVDAc", address: NVDAc }, { label: "AAPLc", address: AAPLc }]) {
    let foundAny = false;
    for (const stable of [true, false]) {
      try {
        const pool = await client.readContract({
          address: AERODOME_FACTORY,
          abi: aerodromeFactoryAbi,
          functionName: "getPool",
          args: [USDC, t.address, stable],
        });
        const poolAddr = pool as Address;
        const exists = poolAddr !== "0x0000000000000000000000000000000000000000";
        if (!exists) {
          console.log(`  USDC/${t.label} stable=${stable}  pool=<none>`);
          continue;
        }
        const tk0 = await client.readContract({ address: poolAddr, abi: aerodromePoolAbi, functionName: "token0" });
        await sleep(200);
        const tk1 = await client.readContract({ address: poolAddr, abi: aerodromePoolAbi, functionName: "token1" });
        await sleep(200);
        const res = await client.readContract({ address: poolAddr, abi: aerodromePoolAbi, functionName: "getReserves" });
        const amountOut = await readOptional("pool.getAmountOut", () => client.readContract({ address: poolAddr, abi: aerodromePoolAbi, functionName: "getAmountOut", args: [FIVE_USDC_UNITS, USDC] }));
        discoveredPools[`${t.label}:${stable}`] = { stable, pool: poolAddr, r0: res[0], r1: res[1], t0: tk0, t1: tk1 };
        console.log(
          `  USDC/${t.label} stable=${stable}  pool=${fmtAddress(poolAddr)}  r0=${res[0].toString()}  r1=${res[1].toString()}  token0=${fmtAddress(tk0)}  token1=${fmtAddress(tk1)}  amountOut(5_USDC)=${amountOut.value ?? `<unavailable: ${amountOut.error}>`}`,
        );
        foundAny = true;
      } catch (err) {
        console.log(`  USDC/${t.label} stable=${stable}  factory.read FAILED: ${(err as Error).message}`);
      }
    }
    if (!foundAny) console.log(`  USDC/${t.label}: NO Aerodrome pool discovered (volatile + stable)`);
  }

  // 6. Enso quote attempt
  header("6. Quote attempt — Enso Route API");
  const ensoKey = process.env.ENSO_API_KEY;
  let ensoNvda: any = null;
  let ensoAapl: any = null;
  let ensoError: string | null = null;
  try {
      const call = async (tokenIn: Address, tokenOut: Address) => {
        const url = "https://api.enso.build/api/v1/shortcuts/route";
        const body = {
          chainId: Number(BASE_CHAIN_ID),
          fromAddress: SIMULATION_FROM,
          receiver: SIMULATION_FROM,
          routingStrategy: "delegate",
          tokenIn: [tokenIn],
          tokenOut: [tokenOut],
          amountIn: [FIVE_USDC_UNITS.toString()],
          slippage: "100",
        };
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (ensoKey) headers.Authorization = "Bearer " + ensoKey;
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const text = await res.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
        return { status: res.status, ok: res.ok, body: parsed };
      };

      const nvda = await call(USDC, NVDAc);
      console.log("  USDC → NVDAc:", nvda.status, nvda.ok ? "OK" : "FAIL");
      console.log(JSON.stringify(nvda.body, null, 2));
      if (nvda.ok) { ensoNvda = nvda.body; printNormalizedRoute("USDC → NVDAc", "Enso", nvda.body); }

      const aapl = await call(USDC, AAPLc);
      console.log("  USDC → AAPLc:", aapl.status, aapl.ok ? "OK" : "FAIL");
      console.log(JSON.stringify(aapl.body, null, 2));
      if (aapl.ok) { ensoAapl = aapl.body; printNormalizedRoute("USDC → AAPLc", "Enso", aapl.body); }
  } catch (err) {
    ensoError = (err as Error).message;
    console.log("  Enso call threw:", ensoError);
  }

  // 7. Authenticated 1inch Classic Swap API. This section deliberately uses
  // exactly 1 USDC (1_000_000 raw units), unlike the preserved Phase 0A
  // direct-pool sanity checks above.
  header("7. Phase 0B — authenticated 1inch Classic Swap API");
  const oneInchKey = process.env.ONEINCH_API_KEY;
  let inchNvda: any = null;
  let inchAapl: any = null;
  let inchSpender: Address | null = null;
  try {
    if (!oneInchKey) {
      console.log("  Authentication: FAIL (ONEINCH_API_KEY missing; no request made)");
    } else {
      const spender = await oneInchRequest(oneInchKey, "/approve/spender", {});
      inchSpender = spender.ok && spender.body?.address ? getAddress(spender.body.address) : null;
      console.log(`  Authentication: ${spender.ok ? "PASS" : "FAIL"} (approve/spender HTTP ${spender.status})`);
      console.log(`  approve/spender: ${inchSpender ?? `<unavailable: ${spender.body?.description ?? spender.body?.error ?? "unknown"}>`}`);

      const tokenList = await oneInchRequest(oneInchKey, "/tokens", {});
      const listed = (address: Address) => tokenList.body?.tokens?.[address.toLowerCase()] ?? null;
      for (const [label, address] of [["USDC", USDC], ["NVDAc", NVDAc], ["AAPLc", AAPLc]] as const) {
        const metadata = listed(address);
        console.log(`  token-list ${label}: ${metadata ? `PASS symbol=${metadata.symbol} decimals=${metadata.decimals}` : "ABSENT (direct address will still be tested)"}`);
      }

      const runPair = async (label: string, tokenOut: Address) => {
        const quote = await oneInchRequest(oneInchKey, "/quote", {
          src: USDC,
          dst: tokenOut,
          amount: ONE_USDC_UNITS.toString(),
          includeProtocols: "true",
          includeGas: "true",
        });
        console.log(`  quote ${label}: HTTP ${quote.status} ${quote.ok ? "PASS" : "FAIL"}${quote.requestId ? ` requestId=${quote.requestId}` : ""}`);
        if (!quote.ok) {
          console.log(`    error=${quote.body?.description ?? quote.body?.error ?? "unknown"}`);
          return null;
        }
        const output = BigInt(quote.body?.dstAmount ?? 0);
        const outputHuman = Number(output) / 1e8;
        const executionPrice = output > 0n ? Number(ONE_USDC_UNITS) / 1e6 / outputHuman : 0;
        const reference = referencePrices[label]?.price;
        const deviationBps = reference && executionPrice ? ((executionPrice / reference) - 1) * 10_000 : null;
        console.log(`    inputRaw=${ONE_USDC_UNITS} outputRaw=${output} output=${outputHuman.toFixed(8)} impliedUsdcPerStock=${executionPrice.toFixed(6)} reference=${reference?.toFixed(6) ?? "<unavailable>"} quoteDeviationBps=${deviationBps?.toFixed(2) ?? "<unavailable>"} gas=${quote.body?.gas ?? "<unavailable>"}`);
        console.log(`    protocols=${JSON.stringify(quote.body?.protocols ?? [])}`);

        const swap = await oneInchRequest(oneInchKey, "/swap", {
          src: USDC,
          dst: tokenOut,
          amount: ONE_USDC_UNITS.toString(),
          from: PHASE_0B_CALLER,
          origin: PHASE_0B_CALLER,
          destReceiver: PHASE_0B_RECEIVER,
          slippage: "1",
          includeProtocols: "true",
          includeGas: "true",
          disableEstimate: "true",
        });
        console.log(`    swap caller=${PHASE_0B_CALLER} origin=${PHASE_0B_CALLER} destReceiver=${PHASE_0B_RECEIVER}: HTTP ${swap.status} ${swap.ok ? "PASS" : "FAIL"}${swap.requestId ? ` requestId=${swap.requestId}` : ""}`);
        if (swap.ok) {
          const tx = swap.body?.tx ?? {};
          console.log(`    tx.from=${tx.from ?? "<unavailable>"} tx.to=${tx.to ?? "<unavailable>"} tx.value=${tx.value ?? "0"} tx.gas=${tx.gas ?? "<unavailable>"}`);
          console.log(`    calldata=${summarizeCalldata(tx.data)}`);
          console.log(`    route=${JSON.stringify(swap.body?.protocols ?? [])}`);
        } else {
          console.log(`    error=${swap.body?.description ?? swap.body?.error ?? "unknown"}`);
        }

        const boundedMinReturn = output > 0n ? (output * 99n) / 100n : 1n;
        const minReturnSwap = await oneInchRequest(oneInchKey, "/swap", {
          src: USDC,
          dst: tokenOut,
          amount: ONE_USDC_UNITS.toString(),
          from: PHASE_0B_CALLER,
          origin: PHASE_0B_CALLER,
          destReceiver: PHASE_0B_RECEIVER,
          minReturn: boundedMinReturn.toString(),
          includeProtocols: "true",
          includeGas: "true",
          disableEstimate: "true",
        });
        console.log(`    minReturn=${boundedMinReturn}: HTTP ${minReturnSwap.status} ${minReturnSwap.ok ? "PASS" : "FAIL"} calldata=${summarizeCalldata(minReturnSwap.body?.tx?.data)}`);

        const impossibleMinReturn = await oneInchRequest(oneInchKey, "/swap", {
          src: USDC,
          dst: tokenOut,
          amount: ONE_USDC_UNITS.toString(),
          from: PHASE_0B_CALLER,
          origin: PHASE_0B_CALLER,
          destReceiver: PHASE_0B_RECEIVER,
          minReturn: (output + 1n).toString(),
          includeProtocols: "true",
          includeGas: "true",
          disableEstimate: "true",
        });
        console.log(`    impossibleMinReturn=${output + 1n}: HTTP ${impossibleMinReturn.status} ${impossibleMinReturn.ok ? "generated (fork revert test required)" : "rejected"}`);
        return { quote: quote.body, swap: swap.body, minReturnSwap: minReturnSwap.body, impossibleMinReturn, boundedMinReturn };
      };

      inchNvda = await runPair("NVDAc", NVDAc);
      inchAapl = await runPair("AAPLc", AAPLc);
    }
  } catch (err) {
    console.log("  1inch call threw:", (err as Error).message);
  }

  // 8. Simulation against provider calldata
  header("8. Non-broadcast simulation against provider calldata");
  const simTargets: Array<{ label: string; source: "enso" | "1inch"; body: any }> = [];
  if (ensoNvda) simTargets.push({ label: "USDC → NVDAc (enso)", source: "enso", body: ensoNvda });
  if (ensoAapl) simTargets.push({ label: "USDC → AAPLc (enso)", source: "enso", body: ensoAapl });
  if (inchNvda?.swap) simTargets.push({ label: "USDC → NVDAc (1inch)", source: "1inch", body: inchNvda.swap });
  if (inchAapl?.swap) simTargets.push({ label: "USDC → AAPLc (1inch)", source: "1inch", body: inchAapl.swap });

  if (simTargets.length === 0) {
    console.log("  No provider returned calldata — nothing to simulate.");
    console.log("  Honest expected outcome: simulation BLOCKED (no funded/approved test EOA, and no quote provider available).");
  } else {
    for (const t of simTargets) {
      const tx = t.body?.tx ?? {};
      const to = (tx.to ?? tx.To) as Address | undefined;
      const data = (tx.data ?? tx.Data) as `0x${string}` | undefined;
      const value = BigInt((tx.value ?? tx.Value ?? "0") as string);
      if (!to || !data) {
        console.log(`  ${t.label}: tx missing to/data — skip`);
        continue;
      }
      try {
        await client.call({ account: SIMULATION_FROM, to, data, value });
        console.log(`  ${t.label}: PASS (no revert)`);
      } catch (err) {
        const msg = (err as Error).message;
        console.log(`  ${t.label}: REVERT (${msg.slice(0, 200)})`);
      }
    }
  }

  // 9. Aerodrome direct simulation (expected to revert — unfunded EOA)
  header("9. Aerodrome direct simulation (expected to revert — unfunded EOA)");
  for (const t of [{ label: "NVDAc", address: NVDAc }, { label: "AAPLc", address: AAPLc }]) {
    const stableKey = `${t.label}:false`;
    const stablePool = discoveredPools[stableKey];
    if (!stablePool) {
      console.log(`  USDC/${t.label} no volatile pool discovered — skip simulation.`);
      continue;
    }
    const data = encodeFunctionData({
      abi: aerodromeRouterAbi,
      functionName: "swapExactTokensForTokens",
      args: [
        FIVE_USDC_UNITS,
        0n,
        [{ from: USDC, to: t.address, stable: false, factory: AERODOME_FACTORY }],
        SIMULATION_FROM,
        BigInt(Math.floor(Date.now() / 1000) + 600),
      ],
    });
    try {
      await client.call({ account: SIMULATION_FROM, to: AERODOME_ROUTER, data });
      console.log(`  USDC/${t.label} PASS (unexpected without funding!)`);
    } catch (err) {
      const msg = (err as Error).message;
      console.log(`  USDC/${t.label} REVERT — ${msg.slice(0, 220)}`);
    }
  }

  // 10. Summary
  header("10. Phase 0 summary");
  console.log("Base chainId:           ", chainId.toString());
  console.log("Base block:             ", blockNumber.toString());
  console.log("Enso API key present:   ", !!ensoKey);
  console.log("1inch API key present:  ", !!oneInchKey);
  console.log("Enso NVDAc quote:       ", ensoNvda ? "available" : "not obtained");
  console.log("Enso AAPLc quote:       ", ensoAapl ? "available" : "not obtained");
  console.log("1inch NVDAc quote:      ", inchNvda ? "available" : "not obtained");
  console.log("1inch AAPLc quote:      ", inchAapl ? "available" : "not obtained");
  if (ensoError) console.log("Enso error:             ", ensoError);
  console.log("Enso Router V2 (Base):  ", fmtAddress(ENSO_ROUTER_V2));
  console.log("Enso Delegate V2 (Base):", fmtAddress(ENSO_DELEGATE_V2));
  console.log("Aerodrome Router:       ", fmtAddress(AERODOME_ROUTER));
  console.log("Aerodrome Factory:      ", fmtAddress(AERODOME_FACTORY));
  console.log("\nNo transaction was broadcast. Script is read-only.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
