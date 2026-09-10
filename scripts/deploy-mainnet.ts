/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mainnet deployment preparation/broadcast script.
 *
 * Required environment: DEPLOYER_PRIVATE_KEY, BASE_MAINNET_RPC_URL.
 * The key is read by viem and is never logged. Run only after the documented
 * Forge and Base fork checks pass. This script writes deployment metadata to
 * deployments/base-mainnet.json (ignored) and performs constructor checks.
 *
 * EnkrateGuard is abstract (inherited by the engine) and OneInchV6Adapter is
 * an internal library (inlined by the engine), so neither has a standalone
 * deployable runtime in the current architecture. The two concrete production
 * deployments are the asset registry and execution engine.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, fallback, formatEther, getContractAddress, http, type Address, type TransactionReceipt } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const chain = {
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.BASE_MAINNET_RPC_URL ?? "https://base.publicnode.com"] } },
} as const;
const rpcUrl = process.env.BASE_MAINNET_RPC_URL ?? "https://base.publicnode.com";
const rpcUrls = [...new Set([rpcUrl, "https://mainnet.base.org", "https://base.publicnode.com"])]
  .map((url) => http(url, { retryCount: 0, timeout: 20_000 }));
const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const factory = "0xB20f000000000000000000000000000000000000" as Address;
const oracle = "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD" as Address;
const policies = "0x8453000000000000000000000000000000000002" as Address;
const router = "0x111111125421cA6dc452d289314280a0f8842A65" as Address;
const nvda = "0xb20000000000000000000078ee7ce2fE4908108C" as Address;
const aapl = "0xb200000000000000000000C2e324d24d7eEcd1fb" as Address;
const nvdaFeed = "0x04689a41629776563E6822F76f2e57D148d28513" as Address;
const aaplFeed = "0x787f13dEa48Db0897CbCDD985de77809D837F988" as Address;

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function deploymentCost(receipt: { gasUsed: bigint; effectiveGasPrice: bigint }, l1Fee: bigint) {
  const l2Wei = receipt.gasUsed * receipt.effectiveGasPrice;
  const wei = l2Wei + l1Fee;
  return { wei: wei.toString(), eth: formatEther(wei), l2Wei: l2Wei.toString(), l1FeeWei: l1Fee.toString() };
}

async function getL1Fee(publicClient: any, hash: `0x${string}`) {
  const receipt = await publicClient.request({ method: "eth_getTransactionReceipt", params: [hash] }) as { l1Fee?: string };
  return receipt.l1Fee ? BigInt(receipt.l1Fee) : 0n;
}

function loadArtifact(relativePath: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), "utf8"));
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("DEPLOYMENT BLOCKED: DEPLOYER_PRIVATE_KEY is missing or invalid.");
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: fallback(rpcUrls, { rank: false }) });
  const walletClient = createWalletClient({ account, chain, transport: fallback(rpcUrls, { rank: false }) });
  const chainId = await publicClient.getChainId();
  if (chainId !== 8453) throw new Error(`DEPLOYMENT BLOCKED: RPC returned chain ${chainId}, expected 8453.`);
  const currentBalance = await publicClient.getBalance({ address: account.address });
  const configuredBalanceBefore = process.env.DEPLOYMENT_BALANCE_BEFORE_WEI;
  const balanceBefore = configuredBalanceBefore ? BigInt(configuredBalanceBefore) : currentBalance;
  if (balanceBefore === 0n) throw new Error("DEPLOYMENT BLOCKED: deployment wallet has no Base ETH for gas.");
  console.log(`Deployer: ${account.address}`);
  console.log(`Base chain ID: ${chainId}`);
  console.log(`ETH balance before: ${formatEther(balanceBefore)} ETH`);

  const registryArtifact = loadArtifact("contracts/out/EnkrateAssetRegistry.sol/EnkrateAssetRegistry.json");
  const engineArtifact = loadArtifact("contracts/out/EnkrateExecutionEngine.sol/EnkrateExecutionEngine.json");
  const deployedAt = new Date().toISOString();
  const expectedRegistryAddress = getContractAddress({ from: account.address, nonce: 0n });
  const existingRegistryCode = await publicClient.getCode({ address: expectedRegistryAddress });
  let registryReceipt: TransactionReceipt;
  let registryTxHash: `0x${string}`;
  if (existingRegistryCode && existingRegistryCode !== "0x") {
    const recoveredHash = process.env.RECOVERED_REGISTRY_TX_HASH;
    if (!recoveredHash || !/^0x[0-9a-fA-F]{64}$/.test(recoveredHash)) {
      throw new Error("DEPLOYMENT BLOCKED: registry already exists at nonce 0; provide RECOVERED_REGISTRY_TX_HASH to resume safely.");
    }
    registryTxHash = recoveredHash as `0x${string}`;
    registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryTxHash });
    if (!registryReceipt.contractAddress || !sameAddress(registryReceipt.contractAddress, expectedRegistryAddress) || registryReceipt.status !== "success") {
      throw new Error("Recovered registry transaction does not match the confirmed nonce-0 deployment.");
    }
    console.log(`Registry already deployed: ${expectedRegistryAddress}`);
  } else {
    const registryTx = await walletClient.deployContract({
      abi: registryArtifact.abi,
      bytecode: registryArtifact.bytecode.object as `0x${string}`,
      args: [account.address, usdc, factory],
    });
    registryTxHash = registryTx;
    registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryTx });
    if (!registryReceipt.contractAddress) throw new Error("Registry deployment did not return an address.");
    if (registryReceipt.status !== "success") throw new Error("Registry deployment transaction failed.");
  }
  const expectedEngineAddress = getContractAddress({ from: account.address, nonce: 1n });
  const existingEngineCode = await publicClient.getCode({ address: expectedEngineAddress });
  let engineReceipt: TransactionReceipt;
  let engineTxHash: `0x${string}`;
  if (existingEngineCode && existingEngineCode !== "0x") {
    const recoveredHash = process.env.RECOVERED_ENGINE_TX_HASH;
    if (!recoveredHash || !/^0x[0-9a-fA-F]{64}$/.test(recoveredHash)) {
      throw new Error("DEPLOYMENT BLOCKED: engine already exists at nonce 1; provide RECOVERED_ENGINE_TX_HASH to resume safely.");
    }
    engineTxHash = recoveredHash as `0x${string}`;
    engineReceipt = await publicClient.waitForTransactionReceipt({ hash: engineTxHash });
    if (!engineReceipt.contractAddress || !sameAddress(engineReceipt.contractAddress, expectedEngineAddress) || engineReceipt.status !== "success") {
      throw new Error("Recovered engine transaction does not match the confirmed nonce-1 deployment.");
    }
    console.log(`Engine already deployed: ${expectedEngineAddress}`);
  } else {
    const engineTx = await walletClient.deployContract({
      abi: engineArtifact.abi,
      bytecode: engineArtifact.bytecode.object as `0x${string}`,
      args: [account.address, registryReceipt.contractAddress, oracle, policies, 86_400n],
    });
    engineTxHash = engineTx;
    engineReceipt = await publicClient.waitForTransactionReceipt({ hash: engineTx });
    if (!engineReceipt.contractAddress) throw new Error("Engine deployment did not return an address.");
    if (engineReceipt.status !== "success") throw new Error("Engine deployment transaction failed.");
  }
  const [registryCode, engineCode] = await Promise.all([
    publicClient.getCode({ address: registryReceipt.contractAddress }),
    publicClient.getCode({ address: engineReceipt.contractAddress }),
  ]);
  if (!registryCode || registryCode === "0x" || !engineCode || engineCode === "0x") {
    throw new Error("Deployed contract bytecode verification failed.");
  }

  const registryAbi = [{
    type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }],
  }, {
    type: "function", name: "usdc", stateMutability: "view", inputs: [], outputs: [{ type: "address" }],
  }, {
    type: "function", name: "b20Factory", stateMutability: "view", inputs: [], outputs: [{ type: "address" }],
  }, {
    type: "function", name: "isOfficialB20", stateMutability: "view", inputs: [{ name: "token", type: "address" }], outputs: [{ type: "bool" }],
  }, {
    type: "function", name: "getAsset", stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "asset", type: "tuple", components: [
      { name: "feed", type: "address" }, { name: "decimals", type: "uint8" }, { name: "enabled", type: "bool" },
    ] }],
  }] as const;
  const engineConfigAbi = [
    { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "usdc", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "assetRegistry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "referenceOracleRegistry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "policyRegistry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "referenceAgeThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "ONE_INCH_ROUTER", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "B20_FACTORY", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "B20_ORACLE_REGISTRY", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "B20_POLICY_REGISTRY", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "canAttemptExecution", stateMutability: "view", inputs: [{ name: "ruleId", type: "uint256" }], outputs: [
      { name: "canAttempt", type: "bool" }, { name: "reason", type: "uint8" }, { name: "state", type: "tuple", components: [
        { name: "referencePrice", type: "uint256" }, { name: "referenceUpdatedAt", type: "uint256" }, { name: "referenceAge", type: "uint256" },
        { name: "multiplier", type: "uint256" }, { name: "oraclePaused", type: "bool" }, { name: "transferPaused", type: "bool" },
      ] },
    ] },
  ] as const;
  const [registryOwner, registryUsdc, registryFactory, nvdaAsset, aaplAsset, nvdaOfficial, aaplOfficial] = await Promise.all([
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "owner" }),
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "usdc" }),
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "b20Factory" }),
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "getAsset", args: [nvda] }),
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "getAsset", args: [aapl] }),
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "isOfficialB20", args: [nvda] }),
    publicClient.readContract({ address: registryReceipt.contractAddress, abi: registryAbi, functionName: "isOfficialB20", args: [aapl] }),
  ]);
  if (!sameAddress(registryOwner, account.address) || !sameAddress(registryUsdc, usdc) || !sameAddress(registryFactory, factory)) {
    throw new Error("Deployed registry owner/infrastructure configuration mismatch.");
  }
  if (!nvdaAsset.enabled || !sameAddress(nvdaAsset.feed, nvdaFeed) || nvdaAsset.decimals !== 8 || !aaplAsset.enabled || !sameAddress(aaplAsset.feed, aaplFeed) || aaplAsset.decimals !== 8 || !nvdaOfficial || !aaplOfficial) {
    throw new Error("Deployed registry canonical asset configuration or B20 validation mismatch.");
  }
  const configured = await Promise.all([
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "owner" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "usdc" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "assetRegistry" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "referenceOracleRegistry" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "policyRegistry" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "referenceAgeThreshold" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "ONE_INCH_ROUTER" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "B20_FACTORY" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "B20_ORACLE_REGISTRY" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "B20_POLICY_REGISTRY" }),
    publicClient.readContract({ address: engineReceipt.contractAddress, abi: engineConfigAbi, functionName: "canAttemptExecution", args: [0n] }),
  ]);
  if (!sameAddress(configured[0], account.address) || !sameAddress(configured[1], usdc) || !sameAddress(configured[2], registryReceipt.contractAddress) || !sameAddress(configured[3], oracle) || !sameAddress(configured[4], policies) || configured[5] !== 86_400n || !sameAddress(configured[6], router) || !sameAddress(configured[7], factory) || !sameAddress(configured[8], oracle) || !sameAddress(configured[9], policies)) {
    throw new Error("Deployed engine constructor/configuration mismatch.");
  }
  const [engineEth, registryEth, engineUsdc, engineNvda, engineAapl] = await Promise.all([
    publicClient.getBalance({ address: engineReceipt.contractAddress }),
    publicClient.getBalance({ address: registryReceipt.contractAddress }),
    publicClient.readContract({ address: usdc, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }] as const, functionName: "balanceOf", args: [engineReceipt.contractAddress] }),
    publicClient.readContract({ address: nvda, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }] as const, functionName: "balanceOf", args: [engineReceipt.contractAddress] }),
    publicClient.readContract({ address: aapl, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }] as const, functionName: "balanceOf", args: [engineReceipt.contractAddress] }),
  ]);
  if (engineEth !== 0n || registryEth !== 0n || engineUsdc !== 0n || engineNvda !== 0n || engineAapl !== 0n) {
    throw new Error("Unexpected ETH/token balance detected on deployed runtime.");
  }
  const readiness = configured[10] as readonly [boolean, number, unknown];
  if (readiness[0] || readiness[1] !== 1) throw new Error("Nonexistent-rule readiness assertion failed.");
  const balanceAfter = await publicClient.getBalance({ address: account.address });
  const [registryL1Fee, engineL1Fee] = await Promise.all([
    getL1Fee(publicClient, registryTxHash),
    getL1Fee(publicClient, engineTxHash),
  ]);

  const output = {
    network: "base-mainnet",
    chainId: 8453,
    deployer: account.address,
    deployedAt,
    deployerBalance: { beforeWei: balanceBefore.toString(), beforeEth: formatEther(balanceBefore), afterWei: balanceAfter.toString(), afterEth: formatEther(balanceAfter) },
    contracts: {
      EnkrateAssetRegistry: { address: registryReceipt.contractAddress, txHash: registryTxHash, blockNumber: registryReceipt.blockNumber.toString(), gasUsed: registryReceipt.gasUsed.toString(), effectiveGasPriceWei: registryReceipt.effectiveGasPrice.toString(), ethCost: deploymentCost(registryReceipt, registryL1Fee) },
      EnkrateGuard: { inheritedBy: engineReceipt.contractAddress, standalone: false },
      OneInchV6Adapter: { linkedInto: engineReceipt.contractAddress, standalone: false },
      EnkrateExecutionEngine: { address: engineReceipt.contractAddress, txHash: engineTxHash, blockNumber: engineReceipt.blockNumber.toString(), gasUsed: engineReceipt.gasUsed.toString(), effectiveGasPriceWei: engineReceipt.effectiveGasPrice.toString(), ethCost: deploymentCost(engineReceipt, engineL1Fee) },
    },
    config: { owner: account.address, usdc, factory, oracle, policies, router, referenceAgeThreshold: "86400", assets: { NVDAc: { token: nvda, feed: nvdaFeed, decimals: 8 }, AAPLc: { token: aapl, feed: aaplFeed, decimals: 8 } } },
    assertions: { registryCode: true, engineCode: true, registryOwner: true, registryInfrastructure: true, canonicalAssets: true, canonicalB20Validation: { NVDAc: nvdaOfficial, AAPLc: aaplOfficial }, engineConfiguration: true, nonexistentRuleReadiness: { canAttempt: readiness[0], reason: readiness[1].toString() }, zeroRuntimeBalances: true },
  };
  await mkdir("deployments", { recursive: true });
  await writeFile("deployments/base-mainnet.json", JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(output, null, 2));
  console.log(`ETH balance after: ${formatEther(balanceAfter)} ETH`);
}

main().catch((error) => {
  const details = error as { shortMessage?: string; details?: string; metaMessages?: string[]; cause?: { shortMessage?: string } };
  console.error(JSON.stringify({ shortMessage: details.shortMessage, details: details.details, metaMessages: details.metaMessages, cause: details.cause?.shortMessage }, null, 2));
  process.exit(1);
});
