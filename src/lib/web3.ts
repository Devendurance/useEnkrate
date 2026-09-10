import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type EIP1193Provider,
} from "viem";
import { BASE_CHAIN_ID, BASE_RPC_URL } from "./mainnet-config";

const READ_ONLY_FALLBACK_RPC_URL = "https://base.publicnode.com";

export const baseChain = {
  id: BASE_CHAIN_ID,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [BASE_RPC_URL] } },
  blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
} as const;

export const publicClient = createPublicClient({
  chain: baseChain,
  transport: http(BASE_RPC_URL, { retryCount: 1, timeout: 15_000 }),
});

const readOnlyFallbackClient = createPublicClient({
  chain: baseChain,
  transport: http(READ_ONLY_FALLBACK_RPC_URL, { retryCount: 0, timeout: 15_000 }),
});

const readOnlyClients = BASE_RPC_URL === READ_ONLY_FALLBACK_RPC_URL
  ? [publicClient]
  : [publicClient, readOnlyFallbackClient];

export async function withReadOnlyRpcFallback<T>(
  operation: (client: typeof publicClient) => Promise<T>,
  clients: readonly (typeof publicClient)[] = readOnlyClients,
) {
  let lastError: unknown;
  for (const client of clients) {
    try {
      return await operation(client);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("The read-only RPC request failed.");
}

export type BrowserProvider = EIP1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export function browserProvider(): BrowserProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: BrowserProvider }).ethereum;
}

export function walletClient(provider: BrowserProvider, account: Address) {
  return createWalletClient({ account, chain: baseChain, transport: custom(provider) });
}

export async function connectToBase(provider: BrowserProvider) {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0] as Address | undefined;
  if (!account) throw new Error("No wallet account was returned");
  await ensureBaseChain(provider);
  return account;
}

export async function ensureBaseChain(provider: BrowserProvider) {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (Number.parseInt(String(chainId), 16) === BASE_CHAIN_ID) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
          chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [BASE_RPC_URL],
          blockExplorerUrls: ["https://basescan.org"],
        },
      ],
    });
  }
}

export function firstErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0];
  return "The wallet request was not completed.";
}

export function assertReceiptSucceeded(status: string) {
  if (status !== "success") throw new Error("Transaction did not confirm successfully.");
}

export function assertZeroAllowance(allowance: bigint | undefined) {
  if (allowance !== 0n) throw new Error("USDC allowance must be exactly zero before cancellation.");
}

export type AllowanceConfirmation = {
  allowance: bigint;
  source: "receipt" | "latest";
};

export async function confirmAllowance(
  readAllowance: (blockNumber?: bigint) => Promise<bigint | undefined>,
  expected: bigint,
  receiptBlock: bigint,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<AllowanceConfirmation | undefined> {
  const attempts = Math.max(1, options.attempts ?? 5);
  const delayMs = Math.max(0, options.delayMs ?? 500);
  const receiptAllowance = await readAllowance(receiptBlock);

  if (receiptAllowance === undefined || receiptAllowance < expected) return undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const latestAllowance = await readAllowance();
    if (latestAllowance !== undefined && latestAllowance >= expected) {
      return { allowance: latestAllowance, source: "latest" };
    }
    if (attempt < attempts - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { allowance: receiptAllowance, source: "receipt" };
}
