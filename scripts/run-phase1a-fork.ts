/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 1A fresh-route fork integration runner (no Base Mainnet broadcast).
 *
 * Start the official Base-patched local fork first, then run:
 *   npx tsx scripts/run-phase1a-fork.ts
 *
 * This runner deliberately refuses to run against a non-8453 chain or an unfunded local
 * fork. It uses the default Anvil key only on the local fork and keeps the 1inch API key
 * server-side in the ignored `.env` file.
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  decodeFunctionData,
  encodeFunctionData,
  http,
  parseAbi,
  type Address,
} from "viem";
import {privateKeyToAccount} from "viem/accounts";

const RPC_URL = process.env.PHASE1A_RPC_URL ?? "http://127.0.0.1:8547";
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

const base = {
  id: BASE_CHAIN_ID,
  name: "Base Phase 1A fork",
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: [RPC_URL]}},
} as const;
const oneInchAbi = parseAbi(["function swap(address,(address,address,address,address,uint256,uint256,uint256),bytes) returns (uint256,uint256)"]);
const engineAbi = parseAbi([
  "function createRule(address,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256,bool) returns (uint256)",
  "function executeRule(uint256,bytes) returns (uint256,uint256)",
  "function getRule(uint256) view returns (uint256,address,address,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint8)",
]);
const erc20WriteAbi = parseAbi([
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

async function rpc(client: any, method: string, params: any[] = []) { return client.request({method, params}); }

async function wait(client: any, hash: `0x${string}`) {
  return client.waitForTransactionReceipt({hash});
}

async function deployArtifact(publicClient: any, walletClient: any, name: string, args: readonly unknown[]) {
  const artifact = await import(`../contracts/out/${name}.sol/${name}.json`);
  const hash = await walletClient.deployContract({abi: artifact.abi, bytecode: artifact.bytecode.object, args});
  const receipt = await wait(publicClient, hash);
  if (!receipt.contractAddress) throw new Error(`No address for ${name}`);
  return {address: receipt.contractAddress as Address, abi: artifact.abi};
}

async function impersonatedTx(publicClient: any, from: Address, to: Address, data: `0x${string}`) {
  await rpc(publicClient, "anvil_impersonateAccount", [from]);
  await rpc(publicClient, "anvil_setBalance", [from, "0x56bc75e2d63100000"]);
  const hash = await rpc(publicClient, "eth_sendTransaction", [{from, to, data, value: "0x0"}]);
  return wait(publicClient, hash);
}

async function route(tokenOut: Address, engine: Address) {
  const key = process.env.ONEINCH_API_KEY;
  if (!key) throw new Error("ONEINCH_API_KEY is missing; no route will be guessed.");
  const url = new URL(`https://api.1inch.dev/swap/v6.1/${BASE_CHAIN_ID}/swap`);
  for (const [keyName, value] of Object.entries({
    src: USDC, dst: tokenOut, amount: "1000000", from: engine, origin: engine,
    // Keep the provider minimum above the fixture rule's 200-bps reference floor. The
    // contract still independently validates both calldata minReturn and actual output.
    destReceiver: RECEIVER, slippage: "0.5", includeProtocols: "true", disableEstimate: "true",
  })) url.searchParams.set(keyName, value);
  const response = await fetch(url, {headers: {Authorization: `Bearer ${key}`} });
  const body = await response.json();
  if (!response.ok || !body?.tx?.data) throw new Error(`1inch route failed: ${response.status}`);
  const decoded = decodeFunctionData({abi: oneInchAbi, data: body.tx.data});
  return {body, decoded};
}

async function main() {
  const publicClient = createPublicClient({chain: base, transport: http(RPC_URL)});
  const account = privateKeyToAccount(ANVIL_KEY);
  const walletClient = createWalletClient({account, chain: base, transport: http(RPC_URL)});
  if (await publicClient.getChainId() !== BASE_CHAIN_ID) throw new Error("Not a Base fork");
  if (await publicClient.getBlockNumber() !== FORK_BLOCK) throw new Error(`Expected pinned block ${FORK_BLOCK}`);
  const registry = await deployArtifact(publicClient, walletClient, "EnkrateAssetRegistry", [
    RECEIVER, USDC, B20_FACTORY,
  ]);
  const engine = await deployArtifact(publicClient, walletClient, "EnkrateExecutionEngine", [
    RECEIVER, registry.address, ORACLE_REGISTRY, POLICY_REGISTRY, 86400n,
  ]);

  // Fund and authorize the deterministic receiver only on the local fork. No key for this
  // address is used: the local node impersonates it for setup, exactly like Phase 0C.
  const fundingAmount = 2_000_000n;
  await impersonatedTx(
    publicClient,
    FUNDING_HOLDER,
    USDC,
    encodeFunctionData({abi: erc20WriteAbi, functionName: "transfer", args: [RECEIVER, fundingAmount]}),
  );
  await impersonatedTx(
    publicClient,
    RECEIVER,
    USDC,
    encodeFunctionData({abi: erc20WriteAbi, functionName: "approve", args: [engine.address, fundingAmount]}),
  );

  const results: Record<string, any> = {};
  for (const [label, tokenOut] of [["NVDAc", NVDAc], ["AAPLc", AAPLc]] as const) {
    const built = await route(tokenOut, engine.address);
    // viem decodes the SwapDescription positionally: [srcToken, dstToken, srcReceiver,
    // dstReceiver, amount, minReturnAmount, flags].
    const desc = built.decoded.args?.[1];
    if (!desc || desc[3].toLowerCase() !== RECEIVER.toLowerCase() || desc[4] !== 1_000_000n) {
      throw new Error(`${label}: route calldata failed direct-settlement invariants`);
    }
    // `createRule` is sent as an impersonated local transaction; the rule id comes from
    // the indexed RuleCreated topic.
    const createReceipt = await impersonatedTx(publicClient, RECEIVER, engine.address, encodeFunctionData({abi: engineAbi, functionName: "createRule", args: [
      // The pinned Phase 0 route was approximately +114 bps from the Chainlink reference.
      // Keep the route-builder slippage at 100 bps while giving this explicit fixture rule a
      // 200 bps reference-deviation boundary so the known-good route can execute.
      tokenOut, 1_000_000n, 1_000_000n, 0, 0n, 1n, 200n, 100n, BigInt(Math.floor(Date.now() / 1000) + 86400), true,
    ]}));
    const createdLog = createReceipt.logs.find((log: any) => log.address.toLowerCase() === engine.address.toLowerCase());
    const ruleId = createdLog?.topics?.[1] ? BigInt(createdLog.topics[1]) : 0n;
    if (ruleId === 0n) throw new Error(`${label}: could not find RuleCreated event`);
    const before = await publicClient.readContract({address: tokenOut, abi: erc20WriteAbi, functionName: "balanceOf", args: [RECEIVER]});
    const executeData = encodeFunctionData({abi: engineAbi, functionName: "executeRule", args: [ruleId, built.body.tx.data]});
    const execution = await walletClient.sendTransaction({to: engine.address, data: executeData, gas: 1_200_000n});
    const receipt = await wait(publicClient, execution);
    if (receipt.status !== "success") {
      throw new Error(`${label}: executeRule reverted (${receipt.transactionHash}); no successful receipt was emitted`);
    }
    const after = await publicClient.readContract({address: tokenOut, abi: erc20WriteAbi, functionName: "balanceOf", args: [RECEIVER]});
    results[label] = {
      status: receipt.status,
      txHash: receipt.transactionHash,
      outputDelta: (after - before).toString(),
      engineStock: (await publicClient.readContract({address: tokenOut, abi: erc20WriteAbi, functionName: "balanceOf", args: [engine.address]})).toString(),
      engineRouterAllowance: (await publicClient.readContract({address: USDC, abi: parseAbi(["function allowance(address,address) view returns (uint256)"]), functionName: "allowance", args: [engine.address, ROUTER]})).toString(),
    };
  }
  console.log(JSON.stringify({chainId: BASE_CHAIN_ID, block: FORK_BLOCK.toString(), router: ROUTER, receiver: RECEIVER, results}, null, 2));
}

main().catch((error) => { console.error(`FATAL: ${String(error).split("\n")[0]}`); process.exit(1); });