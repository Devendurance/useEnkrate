import type { Address } from "viem";

export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://base.publicnode.com";
export const BASE_EXPLORER_URL = "https://basescan.org";
export const REFERENCE_AGE_THRESHOLD_SECONDS = 86_400;

export const MAINNET_ADDRESSES = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  b20Factory: "0xB20f000000000000000000000000000000000000",
  oracleRegistry: "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD",
  policyRegistry: "0x8453000000000000000000000000000000000002",
  oneInchRouter: "0x111111125421cA6dc452d289314280a0f8842A65",
} as const satisfies Record<string, Address>;

export type SupportedAssetKey = "NVDAc" | "AAPLc";

export type SupportedAsset = {
  key: SupportedAssetKey;
  name: string;
  symbol: SupportedAssetKey;
  address: Address;
  feed: Address;
  decimals: 8;
};

export const SUPPORTED_ASSETS = {
  NVDAc: {
    key: "NVDAc",
    name: "NVIDIA Corporation",
    symbol: "NVDAc",
    address: "0xb20000000000000000000078ee7ce2fE4908108C",
    feed: "0x04689a41629776563E6822F76f2e57D148d28513",
    decimals: 8,
  },
  AAPLc: {
    key: "AAPLc",
    name: "Apple Inc.",
    symbol: "AAPLc",
    address: "0xb200000000000000000000C2e324d24d7eEcd1fb",
    feed: "0x787f13dEa48Db0897CbCDD985de77809D837F988",
    decimals: 8,
  },
} as const satisfies Record<SupportedAssetKey, SupportedAsset>;

export const DEPLOYMENTS = {
  assetRegistry: optionalAddress(process.env.NEXT_PUBLIC_ENKRATE_ASSET_REGISTRY),
  // EnkrateGuard is inherited by the engine and has no standalone deployment.
  guard: optionalAddress(process.env.NEXT_PUBLIC_ENKRATE_GUARD),
  // OneInchV6Adapter is an internal library and is inlined into the engine.
  oneInchAdapter: optionalAddress(process.env.NEXT_PUBLIC_ONEINCH_ADAPTER),
  executionEngine: optionalAddress(process.env.NEXT_PUBLIC_ENKRATE_EXECUTION_ENGINE),
  deploymentBlock: parseOptionalBigInt(process.env.NEXT_PUBLIC_ENKRATE_DEPLOYMENT_BLOCK),
} as const;

export const DEPLOYMENT_CONFIGURED =
  DEPLOYMENTS.assetRegistry !== undefined && DEPLOYMENTS.executionEngine !== undefined;

export function explorerAddressUrl(address: Address) {
  return `${BASE_EXPLORER_URL}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  return `${BASE_EXPLORER_URL}/tx/${hash}`;
}

function optionalAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error("Invalid Base Mainnet contract address configuration");
  }
  return value as Address;
}

function parseOptionalBigInt(value: string | undefined): bigint | undefined {
  if (!value) return undefined;
  try {
    const parsed = BigInt(value);
    return parsed >= 0n ? parsed : undefined;
  } catch {
    return undefined;
  }
}