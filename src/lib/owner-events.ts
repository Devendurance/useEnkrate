import type { AbiEvent, Address } from "viem";
import { publicClient, withReadOnlyRpcFallback } from "./web3";
import { blockRanges } from "./rule-builder";

export type OwnerEventLog = {
  blockNumber?: bigint | null;
  logIndex?: bigint | number | null;
  transactionHash?: `0x${string}` | null;
};

export const OWNER_EVENT_MAX_RANGE = 2_000n;

export function mergeOwnerEventLogs<T extends OwnerEventLog>(logs: readonly T[]) {
  const unique = new Map<string, T>();
  for (const log of logs) {
    const blockNumber = log.blockNumber?.toString() ?? "unknown";
    const logIndex = log.logIndex?.toString() ?? "unknown";
    const key = `${log.transactionHash ?? `block:${blockNumber}`}:${logIndex}`;
    unique.set(key, log);
  }

  return [...unique.values()].sort((left, right) => {
    const leftBlock = left.blockNumber ?? 0n;
    const rightBlock = right.blockNumber ?? 0n;
    if (leftBlock !== rightBlock) return leftBlock < rightBlock ? -1 : 1;
    const leftIndex = BigInt(left.logIndex ?? 0);
    const rightIndex = BigInt(right.logIndex ?? 0);
    if (leftIndex === rightIndex) return 0;
    return leftIndex < rightIndex ? -1 : 1;
  });
}

type OwnerEventQuery = {
  address: Address;
  event: AbiEvent;
  owner: Address;
  fromBlock: bigint;
  toBlock: bigint;
};

async function readOwnerEventLogs<T extends OwnerEventLog>(client: typeof publicClient, query: OwnerEventQuery) {
  const { address, event, owner, fromBlock, toBlock } = query;
  if (fromBlock < 0n || toBlock < 0n) throw new Error("Block range values must be non-negative.");
  if (fromBlock > toBlock) return [] as T[];

  const logs: T[] = [];
  for (const range of blockRanges(fromBlock, toBlock, OWNER_EVENT_MAX_RANGE)) {
    const rangeLogs = await client.getLogs({
      address,
      event,
      args: { owner },
      fromBlock: range.fromBlock,
      toBlock: range.toBlock,
    });
    logs.push(...(rangeLogs as unknown as T[]));
  }

  return mergeOwnerEventLogs(logs);
}

export async function getOwnerEventLogs<T extends OwnerEventLog = OwnerEventLog>({
  address,
  event,
  owner,
  fromBlock,
}: {
  address: Address;
  event: AbiEvent;
  owner: Address;
  fromBlock?: bigint;
}) {
  if (fromBlock === undefined) throw new Error("Deployment block is required for event discovery.");

  return withReadOnlyRpcFallback(async (client) => {
    const latestBlock = await client.getBlockNumber();
    return readOwnerEventLogs<T>(client, { address, event, owner, fromBlock, toBlock: latestBlock });
  });
}

export async function getOwnerEventLogsInRange<T extends OwnerEventLog = OwnerEventLog>({
  address,
  event,
  owner,
  fromBlock,
  toBlock,
}: OwnerEventQuery) {
  return withReadOnlyRpcFallback((client) => readOwnerEventLogs<T>(client, {
    address,
    event,
    owner,
    fromBlock,
    toBlock,
  }));
}
