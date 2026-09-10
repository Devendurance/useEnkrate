import type { Address } from "viem";

export type ExecutionObservation = {
  transactionHash: `0x${string}`;
  logIndex: bigint;
  ruleId: bigint;
  owner: Address;
  targetStock: Address;
  amountIn: bigint;
  amountOut: bigint;
  timestamp: bigint;
};

export type ExecutionNotification = ExecutionObservation & {
  key: string;
  asset: string;
};

export type ExecutionActivityState = {
  notifications: ExecutionNotification[];
  refreshVersion: number;
  seenKeys: ReadonlySet<string>;
};

export function createExecutionActivityState(): ExecutionActivityState {
  return { notifications: [], refreshVersion: 0, seenKeys: new Set() };
}

export function executionKey(observation: Pick<ExecutionObservation, "transactionHash" | "logIndex">) {
  return `${observation.transactionHash.toLowerCase()}:${observation.logIndex.toString()}`;
}

export function createExecutionNotification(
  observation: ExecutionObservation,
  expectedOwner: Address,
  asset: string,
): ExecutionNotification | undefined {
  if (observation.owner.toLowerCase() !== expectedOwner.toLowerCase() || observation.amountOut <= 0n) return undefined;
  return { ...observation, key: executionKey(observation), asset };
}

export function manualExecutionObservation(status: string, observation?: ExecutionObservation) {
  return status === "success" ? observation : undefined;
}

export function recordExecution(state: ExecutionActivityState, notification: ExecutionNotification) {
  if (state.seenKeys.has(notification.key)) return state;
  const seenKeys = new Set(state.seenKeys);
  seenKeys.add(notification.key);
  return {
    notifications: [...state.notifications, notification],
    refreshVersion: state.refreshVersion + 1,
    seenKeys,
  };
}
