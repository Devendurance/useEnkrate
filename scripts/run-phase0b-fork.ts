/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Phase 0B temporary fork integration harness.
 *
 * Start Anvil separately, pinned to a Base Mainnet block, then run this file:
 *   anvil --fork-url https://mainnet.base.org --fork-block-number 50977018 --port 8547
 *   forge build --root fork-harness
 *   PHASE0B_RPC_URL=http://127.0.0.1:8547 npx tsx scripts/run-phase0b-fork.ts
 *
 * This script uses only Anvil's default test key and impersonation facilities.
 * It never signs with a founder key and never connects a wallet to Mainnet.
 */

import "dotenv/config";
import fs from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  decodeFunctionData,
  encodeFunctionData,
  http,
  parseAbi,
  getAddress,
  keccak256,
  toHex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.PHASE0B_RPC_URL ?? "http://127.0.0.1:8547";
const BASE_CHAIN_ID = 8453;
const FORK_BLOCK = 50_977_018n;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const NVDAc = "0xb20000000000000000000078ee7ce2fE4908108C" as Address;
const AAPLc = "0xb200000000000000000000C2e324d24d7eEcd1fb" as Address;
const SPENDER = "0x111111125421ca6dc452d289314280a0f8842a65" as Address;
const FUNDING_HOLDER = "0x28C6c06298d514Db089934071355E5743bf21d60" as Address;
const USER_RECEIVER = "0x2222222222222222222222222222222222222222" as Address;
const ONE_USDC = 1_000_000n;
const ANVIL_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);
const harnessAbi = parseAbi([
  "function approveExact(address token, address spender, uint256 amount)",
  "function execute(address target, bytes data) returns (bytes)",
  "function sweep(address token, address recipient, uint256 amount)",
]);
const oneInchSwapAbi = parseAbi([
  "function swap(address executor, (address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags) desc, bytes permit) returns (uint256 returnAmount, uint256 spentAmount)",
]);

const base = {
  id: BASE_CHAIN_ID,
  name: "Base fork",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

function assertAddress(value: string): Address {
  return getAddress(value) as Address;
}

async function rpc(publicClient: any, method: string, params: any[] = []) {
  return publicClient.request({ method, params });
}

async function waitForRpc(publicClient: any) {
  for (let i = 0; i < 30; i++) {
    try {
      const chainId = await publicClient.getChainId();
      if (chainId === BASE_CHAIN_ID) return;
    } catch {
      // Anvil may need a few seconds to initialize its fork.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No Base fork at ${RPC_URL}. Start Anvil at the pinned block first.`);
}

async function sendImpersonated(publicClient: any, from: Address, to: Address, data: `0x${string}`) {
  await rpc(publicClient, "anvil_impersonateAccount", [from]);
  await rpc(publicClient, "anvil_setBalance", [from, toHex(10n ** 20n)]);
  const hash = await rpc(publicClient, "eth_sendTransaction", [{ from, to, data, value: "0x0" }]);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function apiRequest(path: string, params: Record<string, string>) {
  const key = process.env.ONEINCH_API_KEY;
  if (!key) throw new Error("ONEINCH_API_KEY is missing; fork run cannot construct authenticated calldata.");
  const url = new URL(`https://api.1inch.dev/swap/v6.1/${BASE_CHAIN_ID}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!response.ok) throw new Error(`1inch ${path} HTTP ${response.status} ${body?.code ?? ""}: ${body?.description ?? body?.error ?? "unknown"}`);
  return { body, requestId: response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? body?.requestId };
}

async function buildRoute(tokenOut: Address, harness: Address, minReturn?: bigint) {
  const { body, requestId } = await apiRequest("/swap", {
    src: USDC,
    dst: tokenOut,
    amount: ONE_USDC.toString(),
    from: harness,
    origin: harness,
    destReceiver: USER_RECEIVER,
    ...(minReturn === undefined ? { slippage: "1" } : { minReturn: minReturn.toString() }),
    includeProtocols: "true",
    includeGas: "true",
    disableEstimate: "true",
  });
  if (!body?.tx?.to || !body?.tx?.data) throw new Error("1inch returned no executable transaction");
  const decoded = decodeFunctionData({ abi: oneInchSwapAbi, data: body.tx.data });
  const description = decoded.args?.[1];
  return {
    requestId,
    quoteOutput: BigInt(body.dstAmount),
    protocols: body.protocols ?? [],
    tx: body.tx,
    calldataSelector: body.tx.data.slice(0, 10),
    calldataBytes: (body.tx.data.length - 2) / 2,
    calldataHash: keccak256(body.tx.data),
    decoded: description
      ? {
          srcToken: description.srcToken,
          dstToken: description.dstToken,
          srcReceiver: description.srcReceiver,
          dstReceiver: description.dstReceiver,
          amount: description.amount.toString(),
          minReturnAmount: description.minReturnAmount.toString(),
          flags: description.flags.toString(),
        }
      : null,
  };
}

function replaceMinReturn(data: `0x${string}`, minReturn: bigint): `0x${string}` {
  const decoded = decodeFunctionData({ abi: oneInchSwapAbi, data });
  const args = decoded.args as any[];
  if (!args?.[1]) throw new Error("1inch calldata did not contain a swap description");
  return encodeFunctionData({
    abi: oneInchSwapAbi,
    functionName: "swap",
    args: [args[0], { ...args[1], minReturnAmount: minReturn }, args[2]],
  });
}

function summarizeTx(tx: any) {
  return {
    from: tx?.from,
    to: tx?.to,
    value: tx?.value ?? "0",
    gas: tx?.gas,
    gasPrice: tx?.gasPrice,
  };
}

async function balance(publicClient: any, token: Address, owner: Address) {
  return publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
}

async function safeBalance(publicClient: any, token: Address, owner: Address) {
  try {
    return { value: await balance(publicClient, token, owner) as bigint };
  } catch (error) {
    return { error: String(error).split("\n")[0].slice(0, 240) };
  }
}

async function snapshot(publicClient: any) {
  return rpc(publicClient, "evm_snapshot");
}

async function revertSnapshot(publicClient: any, id: string) {
  const result = await rpc(publicClient, "evm_revert", [id]);
  if (!result) throw new Error(`Could not revert fork snapshot ${id}`);
}

async function main() {
  const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
  const account = privateKeyToAccount(ANVIL_KEY);
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) });
  await waitForRpc(publicClient);
  const actualBlock = await publicClient.getBlockNumber();
  if (actualBlock !== FORK_BLOCK) throw new Error(`Fork block ${actualBlock} does not match required ${FORK_BLOCK}`);

  const artifactPath = "fork-harness/out/RouteCallerHarness.sol/RouteCallerHarness.json";
  if (!fs.existsSync(artifactPath)) throw new Error(`Missing ${artifactPath}; run forge build --root fork-harness first.`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const deployHash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object });
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const harness = assertAddress(deployReceipt.contractAddress);

  const allowanceAbi = parseAbi(["function allowance(address,address) view returns (uint256)"]);

  const results: any = {
    rpc: RPC_URL,
    block: actualBlock.toString(),
    harness,
    userReceiver: USER_RECEIVER,
    funding: { source: FUNDING_HOLDER, amount: ONE_USDC.toString() },
    boundedAllowance: { before: "0", after: "0", exact: false },
    pairs: {},
    negativeTests: {},
  };

  for (const [label, tokenOut] of [["NVDAc", NVDAc], ["AAPLc", AAPLc]] as const) {
    const existingUsdc = await balance(publicClient, USDC, harness);
    if (existingUsdc < ONE_USDC) {
      await sendImpersonated(
        publicClient,
        FUNDING_HOLDER,
        USDC,
        encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [harness, ONE_USDC - existingUsdc] }),
      );
    }
    const spenderBefore = await publicClient.readContract({ address: USDC, abi: allowanceAbi, functionName: "allowance", args: [harness, SPENDER] });
    const approveHash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "approveExact", args: [USDC, SPENDER, ONE_USDC] });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const spenderAfter = await publicClient.readContract({ address: USDC, abi: allowanceAbi, functionName: "allowance", args: [harness, SPENDER] });
    if (results.boundedAllowance.before === "0") {
      results.boundedAllowance = { before: spenderBefore.toString(), after: spenderAfter.toString(), exact: spenderAfter === ONE_USDC };
    }
    const route = await buildRoute(tokenOut, harness);
    const pairStart = await snapshot(publicClient);
    const beforeHarnessUsdc = await balance(publicClient, USDC, harness);
    const beforeUser = await safeBalance(publicClient, tokenOut, USER_RECEIVER);
    let receipt: any = null;
    let executionError = "";
    try {
      const executeHash = await walletClient.sendTransaction({
        to: harness,
        data: encodeFunctionData({ abi: harnessAbi, functionName: "execute", args: [assertAddress(route.tx.to), route.tx.data] }),
        gas: BigInt(route.tx.gas ?? 800_000),
      });
      receipt = await publicClient.waitForTransactionReceipt({ hash: executeHash });
    } catch (error) {
      executionError = String(error).split("\n")[0].slice(0, 240);
    }
    const afterHarnessUsdc = await balance(publicClient, USDC, harness);
    const afterUser = await safeBalance(publicClient, tokenOut, USER_RECEIVER);
    const afterHarnessStock = await safeBalance(publicClient, tokenOut, harness);
    results.pairs[label] = {
      route: { ...route, tx: summarizeTx(route.tx) },
      receiptStatus: receipt?.status ?? "not-mined",
      executionError,
      harnessUsdcDelta: (afterHarnessUsdc - beforeHarnessUsdc).toString(),
      userStockDelta: beforeUser.value !== undefined && afterUser.value !== undefined ? (afterUser.value - beforeUser.value).toString() : "<unavailable>",
      harnessStockBalance: afterHarnessStock.value?.toString() ?? "<unavailable>",
      b20ReadErrors: [beforeUser.error, afterUser.error, afterHarnessStock.error].filter(Boolean),
      pass: receipt?.status === "success" && beforeHarnessUsdc - afterHarnessUsdc === ONE_USDC && beforeUser.value !== undefined && afterUser.value !== undefined && afterUser.value > beforeUser.value && afterHarnessStock.value === 0n,
    };

    await revertSnapshot(publicClient, pairStart);

    if (beforeUser.value === undefined || afterUser.value === undefined) {
      results.negativeTests[label] = {
        status: "BLOCKED",
        blocker: "vanilla Anvil cannot execute the Base B20 custom precompile (0xef); balanceOf reverted with OpcodeNotFound",
        validMinReturn: "not attempted",
        impossibleMinReturn: "not attempted",
        insufficientApproval: "not attempted",
        zeroUsdc: "not attempted",
      };
      continue;
    }

    const validMin = route.quoteOutput > 1n ? (route.quoteOutput * 99n) / 100n : 1n;
    const impossibleMin = route.quoteOutput * 2n;
    let validMinRoute: any = null;
    let validMinApiError = "";
    try {
      validMinRoute = await buildRoute(tokenOut, harness, validMin);
    } catch (error) {
      validMinApiError = String(error).split("\n")[0].slice(0, 240);
    }
    const validSnap = await snapshot(publicClient);
    const validBefore = await safeBalance(publicClient, tokenOut, USER_RECEIVER);
    let validReceipt: any = null;
    let validExecutionError = "";
    if (validMinRoute) {
      try {
        const validHash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "execute", args: [assertAddress(validMinRoute.tx.to), validMinRoute.tx.data] });
        validReceipt = await publicClient.waitForTransactionReceipt({ hash: validHash });
      } catch (error) {
        validExecutionError = String(error).split("\n")[0].slice(0, 240);
      }
    }
    const validAfter = await safeBalance(publicClient, tokenOut, USER_RECEIVER);
    await revertSnapshot(publicClient, validSnap);

    let impossibleRoute: any = null;
    let impossibleApiError = "";
    try {
      impossibleRoute = await buildRoute(tokenOut, harness, impossibleMin);
    } catch (error) {
      impossibleApiError = String(error).split("\n")[0].slice(0, 240);
    }
    const impossibleSnap = await snapshot(publicClient);
    const impossibleBefore = await safeBalance(publicClient, tokenOut, USER_RECEIVER);
    let impossibleError = "";
    let impossibleReverted = false;
    let impossibleOnchainAttempted = false;
    let impossibleOnchainError = "";
    const impossibleData = replaceMinReturn(route.tx.data, impossibleMin);
    try {
      impossibleOnchainAttempted = true;
      const hash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "execute", args: [assertAddress(route.tx.to), impossibleData] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      impossibleReverted = receipt.status === "reverted";
    } catch (error) {
      impossibleReverted = true;
      impossibleError = String(error).split("\n")[0].slice(0, 240);
      impossibleOnchainError = impossibleError;
    }
    if (!impossibleOnchainAttempted && impossibleRoute) {
      try {
        const hash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "execute", args: [assertAddress(impossibleRoute.tx.to), impossibleRoute.tx.data] });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        impossibleReverted = receipt.status === "reverted";
      } catch (error) {
        impossibleReverted = true;
        impossibleError = String(error).split("\n")[0].slice(0, 240);
      }
    }
    const impossibleAfter = await safeBalance(publicClient, tokenOut, USER_RECEIVER);
    await revertSnapshot(publicClient, impossibleSnap);

    const approvalSnap = await snapshot(publicClient);
    const zeroApprovalHash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "approveExact", args: [USDC, SPENDER, 0n] });
    await publicClient.waitForTransactionReceipt({ hash: zeroApprovalHash });
    let approvalReverted = false;
    try {
      const hash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "execute", args: [assertAddress(route.tx.to), route.tx.data] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      approvalReverted = receipt.status === "reverted";
    } catch {
      approvalReverted = true;
    }
    await revertSnapshot(publicClient, approvalSnap);

    const fundsSnap = await snapshot(publicClient);
    const beforeFunds = await balance(publicClient, USDC, harness);
    const sweepHash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "sweep", args: [USDC, USER_RECEIVER, beforeFunds] });
    await publicClient.waitForTransactionReceipt({ hash: sweepHash });
    let fundsReverted = false;
    try {
      const hash = await walletClient.writeContract({ address: harness, abi: harnessAbi, functionName: "execute", args: [assertAddress(route.tx.to), route.tx.data] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      fundsReverted = receipt.status === "reverted";
    } catch {
      fundsReverted = true;
    }
    await revertSnapshot(publicClient, fundsSnap);

    results.negativeTests[label] = {
      validMinReturn: { minReturn: validMin.toString(), status: validReceipt?.status ?? "not-executed", apiError: validMinApiError, executionError: validExecutionError, outputDelta: validBefore.value !== undefined && validAfter.value !== undefined ? (validAfter.value - validBefore.value).toString() : "<unavailable>", pass: validReceipt?.status === "success" && validAfter.value !== undefined && validBefore.value !== undefined && validAfter.value > validBefore.value },
      impossibleMinReturn: { minReturn: impossibleMin.toString(), apiRejected: !impossibleRoute, apiError: impossibleApiError, onchainAttempted: impossibleOnchainAttempted, reverted: impossibleReverted, receiverDelta: impossibleBefore.value !== undefined && impossibleAfter.value !== undefined ? (impossibleAfter.value - impossibleBefore.value).toString() : "<unavailable>", error: impossibleError, onchainError: impossibleOnchainError, pass: impossibleOnchainAttempted && impossibleReverted && impossibleBefore.value !== undefined && impossibleAfter.value !== undefined && impossibleAfter.value === impossibleBefore.value },
      insufficientApproval: { reverted: approvalReverted, pass: approvalReverted },
      zeroUsdc: { reverted: fundsReverted, pass: fundsReverted },
    };
  }

  console.log(JSON.stringify(results, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
  console.log("No Base Mainnet transaction was broadcast; all calls were sent only to the local Anvil fork.");
}

main().catch((error) => {
  console.error(`FATAL: ${String(error).split("\n")[0]}`);
  process.exit(1);
});