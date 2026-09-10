/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 1D local-only diagnosis runner.
 *
 * This script is intentionally separate from the production verifier. It deploys the
 * already-built production bytecode only inside the disposable local Base fork, requests
 * fresh 1inch quote/swap data, executes one selected asset leg, and captures the failed
 * transaction's revert data and call trace. It never uses a Mainnet signer and never sends
 * a transaction outside the explicitly required local RPC.
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  decodeErrorResult,
  decodeFunctionData,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.PHASE1A_RPC_URL ?? "http://127.0.0.1:8547";
const MODE = process.env.PHASE1D_MODE ?? "pinned";
const ASSET_LABEL = process.env.PHASE1D_ASSET ?? "AAPLc";
const ROUTE_FILTER = process.env.PHASE1D_ROUTE_FILTER ?? "normal";
const ROUTE_FILTER_VALUE = process.env.PHASE1D_ROUTE_FILTER_VALUE ?? "BASE_AERODROME_SLIPSTREAM";

const BASE_CHAIN_ID = 8453;
const FORK_BLOCK = 50_977_018n;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const NVDAc = "0xb20000000000000000000078ee7ce2fE4908108C" as Address;
const AAPLc = "0xb200000000000000000000C2e324d24d7eEcd1fb" as Address;
const ROUTER = "0x111111125421ca6dc452d289314280a0f8842a65" as Address;
const FUNDING_HOLDER = "0x28C6c06298d514Db089934071355E5743bf21d60" as Address;
const RECEIVER = "0x2222222222222222222222222222222222222222" as Address;
const ANVIL_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
const B20_FACTORY = "0xB20f000000000000000000000000000000000000" as Address;
const ORACLE_REGISTRY = "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD" as Address;
const POLICY_REGISTRY = "0x8453000000000000000000000000000000000002" as Address;
const ONE_USDC = 1_000_000n;

const ASSETS = { NVDAc, AAPLc } as const;
const TARGET = ASSETS[ASSET_LABEL as keyof typeof ASSETS];

const base = {
  id: BASE_CHAIN_ID,
  name: "Base Phase 1D fork",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

const oneInchAbi = parseAbi([
  "function swap(address,(address,address,address,address,uint256,uint256,uint256),bytes) returns (uint256,uint256)",
]);
const engineWriteAbi = parseAbi([
  "function createRule(address,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256,bool) returns (uint256)",
  "function executeRule(uint256,bytes) returns (uint256,uint256)",
]);
const erc20Abi = parseAbi([
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
]);
const b20Abi = parseAbi([
  "function isPaused(uint8) view returns (bool)",
  "function TRANSFER_SENDER_POLICY() view returns (bytes32)",
  "function TRANSFER_RECEIVER_POLICY() view returns (bytes32)",
  "function TRANSFER_EXECUTOR_POLICY() view returns (bytes32)",
  "function policyId(bytes32) view returns (uint64)",
]);
const oracleAbi = parseAbi(["function getOracleParams(address) view returns (uint256,bool)"]);
const policyAbi = parseAbi([
  "function policyExists(uint64) view returns (bool)",
  "function isAuthorized(uint64,address) view returns (bool)",
]);
const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
  "function decimals() view returns (uint8)",
]);
const errorAbi = parseAbi([
  "error Error(string)",
  "error Panic(uint256)",
  "error InvalidSelector()",
  "error MalformedCalldata()",
  "error WrongSourceToken()",
  "error WrongDestinationToken()",
  "error WrongDestinationReceiver()",
  "error WrongAmount()",
  "error MinimumOutputTooLow()",
  "error PartialFillNotAllowed()",
  "error InvalidExecutor()",
  "error InvalidSourceReceiver()",
  "error RouterCallFailed()",
  "error InsufficientReturnAmount()",
  "error ReturnAmountIsNotEnough()",
  "error SwapAmountTooSmall()",
  "error TransferFromFailed()",
  "error SafeTransferFailed()",
]);

function assertLocalRpc() {
  if (!/^https?:\/\/(127\.0\.0\.1|localhost):8547$/.test(RPC_URL)) {
    throw new Error("Refusing to run: PHASE1A_RPC_URL must be the local port 8547 fork");
  }
  if (!TARGET) throw new Error(`Unsupported PHASE1D_ASSET: ${ASSET_LABEL}`);
  if (MODE !== "pinned" && MODE !== "latest") throw new Error(`Unsupported PHASE1D_MODE: ${MODE}`);
  if (ROUTE_FILTER !== "normal" && ROUTE_FILTER !== "aerodrome") {
    throw new Error(`Unsupported PHASE1D_ROUTE_FILTER: ${ROUTE_FILTER}`);
  }
}

async function rpc(client: any, method: string, params: any[] = []) {
  return client.request({ method, params });
}

async function wait(publicClient: any, hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash });
}

async function deployArtifact(publicClient: any, walletClient: any, name: string, args: readonly unknown[]) {
  const artifact = await import(`../contracts/out/${name}.sol/${name}.json`);
  const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object, args });
  const receipt = await wait(publicClient, hash);
  if (!receipt.contractAddress) throw new Error(`No address for ${name}`);
  return { address: receipt.contractAddress as Address, abi: artifact.abi };
}

async function impersonatedTx(publicClient: any, from: Address, to: Address, data: Hex) {
  await rpc(publicClient, "anvil_impersonateAccount", [from]);
  await rpc(publicClient, "anvil_setBalance", [from, "0x56bc75e2d63100000"]);
  const hash = await rpc(publicClient, "eth_sendTransaction", [{ from, to, data, value: "0x0" }]);
  const receipt = await wait(publicClient, hash);
  if (receipt.status !== "success") throw new Error(`Local setup transaction reverted: ${hash}`);
  return receipt;
}

async function oneInchRequest(path: string, params: Record<string, string>) {
  const apiKey = process.env.ONEINCH_API_KEY;
  if (!apiKey) throw new Error("ONEINCH_API_KEY is missing; no route will be guessed");

  const url = new URL(`https://api.1inch.dev/swap/v6.1/${BASE_CHAIN_ID}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return {
    status: response.status,
    ok: response.ok,
    requestId: response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? body?.requestId ?? null,
    body,
  };
}

function routeParams(engine: Address, tokenOut: Address) {
  const params: Record<string, string> = {
    src: USDC,
    dst: tokenOut,
    amount: ONE_USDC.toString(),
    includeProtocols: "true",
    includeGas: "true",
  };
  if (ROUTE_FILTER === "aerodrome") params.protocols = ROUTE_FILTER_VALUE;
  return params;
}

function swapParams(engine: Address, tokenOut: Address) {
  return {
    ...routeParams(engine, tokenOut),
    from: engine,
    origin: engine,
    destReceiver: RECEIVER,
    slippage: "0.5",
    disableEstimate: "true",
  };
}

function tupleValue(value: any, index: number, name: string) {
  return value?.[name] ?? value?.[index];
}

function protocolNames(value: any): string[] {
  const names: string[] = [];
  const visit = (entry: any) => {
    if (typeof entry === "string") {
      if (/^[A-Z0-9_]+$/.test(entry)) names.push(entry);
      return;
    }
    if (!entry || typeof entry !== "object") return;
    for (const key of ["name", "protocol", "id"]) {
      if (typeof entry[key] === "string") names.push(entry[key]);
    }
    for (const child of Object.values(entry)) visit(child);
  };
  visit(value);
  return [...new Set(names)];
}

function stateOverrideSummary(body: any) {
  const candidates = [
    ["body.stateOverrides", body?.stateOverrides],
    ["body.stateOverride", body?.stateOverride],
    ["body.tx.stateOverrides", body?.tx?.stateOverrides],
    ["body.tx.stateOverride", body?.tx?.stateOverride],
  ] as const;
  for (const [path, value] of candidates) {
    if (value === undefined || value === null) continue;
    const keys = Array.isArray(value) ? value.map((_entry, index) => String(index)) : Object.keys(value);
    if (keys.length > 0) return { present: true, path, keys, count: keys.length };
  }
  return { present: false, path: null, keys: [], count: 0 };
}

async function buildRoute(engine: Address, tokenOut: Address) {
  const quote = await oneInchRequest("/quote", routeParams(engine, tokenOut));
  const swap = await oneInchRequest("/swap", swapParams(engine, tokenOut));
  const route = {
    filter: ROUTE_FILTER === "aerodrome" ? { parameter: "protocols", value: ROUTE_FILTER_VALUE } : null,
    quote: {
      status: quote.status,
      ok: quote.ok,
      requestId: quote.requestId,
      output: quote.body?.dstAmount ?? null,
      protocols: quote.body?.protocols ?? quote.body?.route ?? null,
      protocolNames: protocolNames(quote.body?.protocols ?? quote.body?.route),
      error: quote.ok ? null : quote.body?.description ?? quote.body?.message ?? quote.body?.error ?? null,
    },
    swap: {
      status: swap.status,
      ok: swap.ok,
      requestId: swap.requestId,
      output: swap.body?.dstAmount ?? swap.body?.toTokenAmount ?? swap.body?.amountOut ?? null,
      protocols: swap.body?.protocols ?? swap.body?.route ?? null,
      protocolNames: protocolNames(swap.body?.protocols ?? swap.body?.route),
      stateOverrides: stateOverrideSummary(swap.body),
      error: swap.ok ? null : swap.body?.description ?? swap.body?.message ?? swap.body?.error ?? null,
    },
  } as any;

  if (!swap.ok || !swap.body?.tx?.to || !swap.body?.tx?.data) return route;

  const calldata = swap.body.tx.data as Hex;
  const decoded = decodeFunctionData({ abi: oneInchAbi, data: calldata });
  const desc = decoded.args?.[1] as any;
  route.swap.transaction = {
    from: swap.body.tx.from ?? null,
    to: swap.body.tx.to,
    value: swap.body.tx.value ?? "0",
    gas: swap.body.tx.gas ?? null,
    gasPrice: swap.body.tx.gasPrice ?? null,
  };
  route.swap.calldata = {
    selector: calldata.slice(0, 10),
    bytes: (calldata.length - 2) / 2,
    keccak256: keccak256(calldata),
  };
  route.swap.decoded = {
    executor: decoded.args?.[0] as Address,
    srcToken: tupleValue(desc, 0, "srcToken"),
    dstToken: tupleValue(desc, 1, "dstToken"),
    srcReceiver: tupleValue(desc, 2, "srcReceiver"),
    dstReceiver: tupleValue(desc, 3, "dstReceiver"),
    amount: String(tupleValue(desc, 4, "amount")),
    minReturnAmount: String(tupleValue(desc, 5, "minReturnAmount")),
    flags: String(tupleValue(desc, 6, "flags")),
    permitBytes: typeof decoded.args?.[2] === "string" ? (decoded.args[2] as string).length / 2 - 1 : null,
  };
  Object.defineProperty(route.swap, "_calldata", { value: calldata, enumerable: false });
  return route;
}

async function readPolicy(publicClient: any, token: Address, scope: Hex, account: Address) {
  const policyId = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "policyId", args: [scope] });
  if (policyId === 0n) return { id: "0", exists: true, authorized: true };
  const exists = await publicClient.readContract({ address: POLICY_REGISTRY, abi: policyAbi, functionName: "policyExists", args: [policyId] });
  const authorized = exists
    ? await publicClient.readContract({ address: POLICY_REGISTRY, abi: policyAbi, functionName: "isAuthorized", args: [policyId, account] })
    : false;
  return { id: policyId.toString(), exists, authorized };
}

async function readB20State(publicClient: any, token: Address, executor: Address | null) {
  const feed = token === NVDAc ? "0x04689a41629776563E6822F76f2e57D148d28513" : "0x787f13dEa48Db0897CbCDD985de77809D837F988";
  const code = await publicClient.getCode({ address: token });
  const paused = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "isPaused", args: [0] });
  const senderScope = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "TRANSFER_SENDER_POLICY" });
  const receiverScope = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "TRANSFER_RECEIVER_POLICY" });
  const executorScope = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "TRANSFER_EXECUTOR_POLICY" });
  const oracle = await publicClient.readContract({ address: ORACLE_REGISTRY, abi: oracleAbi, functionName: "getOracleParams", args: [token] });
  const round = await publicClient.readContract({ address: feed as Address, abi: feedAbi, functionName: "latestRoundData" });
  const feedDecimals = await publicClient.readContract({ address: feed as Address, abi: feedAbi, functionName: "decimals" });
  const answer = round[1] as bigint;
  const updatedAt = round[3] as bigint;
  const price = feedDecimals < 8 ? answer * 10n ** BigInt(8 - feedDecimals) : answer / 10n ** BigInt(feedDecimals - 8);
  const block = await publicClient.getBlock();
  const referenceAge = block.timestamp > updatedAt ? block.timestamp - updatedAt : 0n;
  return {
    codeBytes: code ? (code.length - 2) / 2 : 0,
    code,
    transferPaused: paused,
    oracleMultiplier: (oracle[0] as bigint).toString(),
    oraclePaused: oracle[1],
    referencePrice: price.toString(),
    referenceUpdatedAt: updatedAt.toString(),
    referenceAge: referenceAge.toString(),
    feed,
    feedDecimals,
    policies: {
      sender: await readPolicy(publicClient, token, senderScope, RECEIVER),
      receiver: await readPolicy(publicClient, token, receiverScope, RECEIVER),
      executor: executor ? await readPolicy(publicClient, token, executorScope, executor) : null,
    },
    policyScopes: { sender: senderScope, receiver: receiverScope, executor: executorScope },
  };
}

function findHexData(value: any, depth = 0): string | null {
  if (depth > 7 || value === null || value === undefined) return null;
  if (typeof value === "string" && /^0x[0-9a-fA-F]{8,}$/.test(value)) return value;
  if (typeof value !== "object") return null;
  for (const key of ["data", "returnData", "output", "result", "cause", "details", "meta"] as const) {
    const found = findHexData(value[key], depth + 1);
    if (found) return found;
  }
  for (const child of Object.values(value)) {
    const found = findHexData(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function decodeRevertData(data: string | null) {
  if (!data) return null;
  try {
    const decoded = decodeErrorResult({ abi: errorAbi, data: data as Hex });
    return { selector: data.slice(0, 10), name: decoded.errorName, args: decoded.args ?? [] };
  } catch {
    return { selector: data.slice(0, 10), name: null, args: [] };
  }
}

async function captureRevert(publicClient: any, hash: `0x${string}`) {
  const tx = await publicClient.getTransaction({ hash });
  const callTx = {
    from: tx.from,
    to: tx.to,
    data: tx.input,
    value: toHex(tx.value),
    gas: toHex(tx.gas),
  };
  let callError: string | null = null;
  let data: string | null = null;
  try {
    await rpc(publicClient, "eth_call", [callTx, "latest"]);
  } catch (error) {
    callError = String(error).split("\n")[0].slice(0, 400);
    data = findHexData(error);
  }
  return {
    ethCallError: callError,
    data,
    decoded: decodeRevertData(data),
  };
}

async function captureTrace(publicClient: any, hash: `0x${string}`) {
  try {
    const trace = await rpc(publicClient, "debug_traceTransaction", [hash, { tracer: "callTracer" }]);
    return {
      mode: "callTracer",
      root: traceFrameSummary(trace),
      failures: traceFailures(trace),
    };
  } catch (callTracerError) {
    try {
      const trace = await rpc(publicClient, "debug_traceTransaction", [hash, { disableStorage: true, disableMemory: true }]);
      return {
        mode: "structLogs",
        unsupportedCallTracer: String(callTracerError).split("\n")[0].slice(0, 300),
        trace: { gas: trace.gas, failed: trace.failed, returnValueSelector: trace.returnValue?.slice?.(0, 10) ?? null, logCount: trace.structLogs?.length ?? 0 },
        failures: [],
      };
    } catch (structError) {
      return {
        mode: "unavailable",
        error: String(structError).split("\n")[0].slice(0, 300),
        unsupportedCallTracer: String(callTracerError).split("\n")[0].slice(0, 300),
        failures: [],
      };
    }
  }
}

function traceFrameSummary(frame: any) {
  if (!frame || typeof frame !== "object") return null;
  return {
    type: frame.type ?? null,
    from: frame.from ?? null,
    to: frame.to ?? null,
    selector: typeof frame.input === "string" ? frame.input.slice(0, 10) : null,
    gasUsed: frame.gasUsed ?? null,
    error: frame.error ?? null,
    revertReason: frame.revertReason ?? null,
    outputSelector: typeof frame.output === "string" ? frame.output.slice(0, 10) : null,
    callCount: Array.isArray(frame.calls) ? frame.calls.length : 0,
  };
}

function traceFailures(node: any, path = "root"): any[] {
  if (!node || typeof node !== "object") return [];
  const failures: any[] = [];
  const hasError = node.error || node.revertReason;
  if (hasError) {
    failures.push({
      path,
      type: node.type ?? null,
      from: node.from ?? null,
      to: node.to ?? null,
      selector: typeof node.input === "string" ? node.input.slice(0, 10) : null,
      gasUsed: node.gasUsed ?? null,
      error: node.error ?? null,
      revertReason: node.revertReason ?? null,
      outputSelector: typeof node.output === "string" ? node.output.slice(0, 10) : null,
      outputBytes: typeof node.output === "string" ? Math.max(0, (node.output.length - 2) / 2) : null,
    });
  }
  if (Array.isArray(node.calls)) {
    node.calls.forEach((child: any, index: number) => failures.push(...traceFailures(child, `${path}.calls[${index}]`)));
  }
  return failures;
}

async function main() {
  assertLocalRpc();
  const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
  const account = privateKeyToAccount(ANVIL_KEY);
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) });
  const result: any = {
    mode: MODE,
    asset: ASSET_LABEL,
    routeFilter: ROUTE_FILTER,
    chainId: await publicClient.getChainId(),
    block: (await publicClient.getBlockNumber()).toString(),
    rpc: RPC_URL,
    localOnly: true,
  };
  if (MODE === "pinned" && BigInt(result.block) !== FORK_BLOCK) {
    throw new Error(`Expected pinned block ${FORK_BLOCK}, got ${result.block}`);
  }

  const registry = await deployArtifact(publicClient, walletClient, "EnkrateAssetRegistry", [RECEIVER, USDC, B20_FACTORY]);
  const engine = await deployArtifact(publicClient, walletClient, "EnkrateExecutionEngine", [
    RECEIVER,
    registry.address,
    ORACLE_REGISTRY,
    POLICY_REGISTRY,
    86400n,
  ]);
  result.localDeployments = { registry: registry.address, engine: engine.address };

  const receiverInitialUsdc = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] });
  const receiverInitialB20 = await publicClient.readContract({ address: TARGET, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] });
  result.receiverInitialBalances = {
    usdc: receiverInitialUsdc.toString(),
    b20: receiverInitialB20.toString(),
  };
  await impersonatedTx(
    publicClient,
    FUNDING_HOLDER,
    USDC,
    encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [RECEIVER, ONE_USDC] }),
  );
  await impersonatedTx(
    publicClient,
    RECEIVER,
    USDC,
    encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [engine.address, ONE_USDC] }),
  );
  result.funding = {
    source: FUNDING_HOLDER,
    receiver: RECEIVER,
    amount: ONE_USDC.toString(),
    receiverUsdc: (await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] })).toString(),
    engineAllowance: (await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "allowance", args: [RECEIVER, engine.address] })).toString(),
  };

  const route = await buildRoute(engine.address, TARGET);
  result.route = route;
  if (!route.swap.ok || !route.swap.decoded) {
    result.execution = { status: "not-attempted", reason: "swap route unavailable" };
    console.log(JSON.stringify(result, jsonReplacer, 2));
    return;
  }
  if (ROUTE_FILTER === "aerodrome") {
    const names = route.swap.protocolNames as string[];
    const onlyAerodrome = names.length > 0 && names.every((name) => name.includes("AERODROME"));
    if (!onlyAerodrome) {
      result.execution = { status: "not-attempted", reason: "requested Aerodrome filter did not produce an Aerodrome-only route" };
      console.log(JSON.stringify(result, jsonReplacer, 2));
      return;
    }
  }

  const executor = route.swap.decoded.executor as Address;
  result.b20BeforeRule = await readB20State(publicClient, TARGET, executor);
  const createReceipt = await impersonatedTx(
    publicClient,
    RECEIVER,
    engine.address,
    encodeFunctionData({
      abi: engineWriteAbi,
      functionName: "createRule",
      args: [TARGET, ONE_USDC, ONE_USDC, 0, 0n, 1n, 200n, 100n, BigInt(Math.floor(Date.now() / 1000) + 86400), true],
    }),
  );
  const createdLog = createReceipt.logs.find((log: any) => log.address.toLowerCase() === engine.address.toLowerCase());
  const ruleId = createdLog?.topics?.[1] ? BigInt(createdLog.topics[1]) : 0n;
  if (ruleId === 0n) throw new Error("Could not find local RuleCreated event");
  result.ruleId = ruleId.toString();

  const inspected = await publicClient.readContract({ address: engine.address, abi: engine.abi, functionName: "inspectAsset", args: [TARGET] }) as any;
  const guardState = inspected[0] as any;
  const canAttempt = await publicClient.readContract({ address: engine.address, abi: engine.abi, functionName: "canAttemptExecution", args: [ruleId] }) as any;
  const referencePrice = tupleValue(guardState, 0, "referencePrice") as bigint;
  const requiredMinimum = await publicClient.readContract({ address: engine.address, abi: engine.abi, functionName: "requiredMinOut", args: [ruleId, referencePrice, 8] }) as bigint;
  result.enginePreflight = {
    inspectApproved: inspected[1],
    guardState,
    canAttempt,
    requiredMinimum: requiredMinimum.toString(),
    routeMinimum: route.swap.decoded.minReturnAmount,
  };

  const receiverUsdcBefore = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] });
  const receiverB20Before = await publicClient.readContract({ address: TARGET, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] });
  const engineStockBefore = await publicClient.readContract({ address: TARGET, abi: erc20Abi, functionName: "balanceOf", args: [engine.address] });
  const executeData = encodeFunctionData({ abi: engineWriteAbi, functionName: "executeRule", args: [ruleId, route.swap._calldata] });
  let txHash: `0x${string}` | null = null;
  let receipt: any = null;
  let sendError: string | null = null;
  try {
    txHash = await walletClient.sendTransaction({ to: engine.address, data: executeData, gas: 1_200_000n });
    receipt = await wait(publicClient, txHash);
  } catch (error) {
    sendError = String(error).split("\n")[0].slice(0, 500);
  }

  const receiverUsdcAfter = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] });
  const receiverB20After = await publicClient.readContract({ address: TARGET, abi: erc20Abi, functionName: "balanceOf", args: [RECEIVER] });
  const engineStockAfter = await publicClient.readContract({ address: TARGET, abi: erc20Abi, functionName: "balanceOf", args: [engine.address] });
  const engineUsdcAfter = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [engine.address] });
  const routerAllowanceAfter = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "allowance", args: [engine.address, ROUTER] });
  result.execution = {
    status: receipt?.status ?? (txHash ? "unknown" : "send-failed"),
    txHash,
    sendError,
    gasUsed: receipt?.gasUsed?.toString() ?? null,
    receiverUsdcBefore: receiverUsdcBefore.toString(),
    receiverUsdcAfter: receiverUsdcAfter.toString(),
    receiverUsdcDelta: (receiverUsdcAfter - receiverUsdcBefore).toString(),
    receiverB20Before: receiverB20Before.toString(),
    receiverB20After: receiverB20After.toString(),
    receiverB20Delta: (receiverB20After - receiverB20Before).toString(),
    targetOutputBefore: receiverB20Before.toString(),
    targetOutputAfter: receiverB20After.toString(),
    outputDelta: (receiverB20After - receiverB20Before).toString(),
    engineStockBefore: engineStockBefore.toString(),
    engineStockAfter: engineStockAfter.toString(),
    engineUsdcAfter: engineUsdcAfter.toString(),
    routerAllowanceAfter: routerAllowanceAfter.toString(),
    directReceiver: receipt?.status === "success" && receiverB20After > receiverB20Before,
    engineB20Retained: engineStockAfter.toString(),
    routerAllowanceZero: routerAllowanceAfter === 0n,
  };
  if (txHash && receipt?.status === "reverted") {
    result.revert = await captureRevert(publicClient, txHash);
    result.trace = await captureTrace(publicClient, txHash);
  }
  if (txHash) {
    const transaction = await publicClient.getTransaction({ hash: txHash });
    result.transaction = {
      from: transaction.from,
      to: transaction.to,
      value: transaction.value.toString(),
      gas: transaction.gas.toString(),
      inputSelector: transaction.input.slice(0, 10),
    };
  }
  result.b20AfterExecution = await readB20State(publicClient, TARGET, executor);
  console.log(JSON.stringify(result, jsonReplacer, 2));
}

function jsonReplacer(_key: string, value: any) {
  return typeof value === "bigint" ? value.toString() : value;
}

main().catch((error) => {
  console.error(`FATAL: ${String(error).split("\n")[0]}`);
  process.exit(1);
});
