"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { decodeEventLog, type Address, type Log } from "viem";
import { browserProvider, connectToBase, firstErrorMessage, walletClient, withReadOnlyRpcFallback, type BrowserProvider } from "@/lib/web3";
import { BASE_CHAIN_ID, DEPLOYMENTS, SUPPORTED_ASSETS } from "@/lib/mainnet-config";
import { engineAbi } from "@/lib/enkrate-abi";
import { getOwnerEventLogsInRange, OWNER_EVENT_MAX_RANGE } from "@/lib/owner-events";
import {
  createExecutionActivityState,
  createExecutionNotification,
  recordExecution,
  type ExecutionNotification,
  type ExecutionObservation,
} from "@/lib/execution-activity";
import { ExecutionToastViewport } from "./execution-toast";

type WalletContextValue = {
  account?: Address;
  provider?: BrowserProvider;
  isConnecting: boolean;
  error?: string;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getWalletClient: () => ReturnType<typeof walletClient>;
  executionNotifications: readonly ExecutionNotification[];
  executionRefreshKey: number;
  reportExecution: (observation: ExecutionObservation) => void;
  dismissExecution: (key: string) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);
const EXECUTION_EVENT_POLL_MS = 12_000;
const ruleExecutedEvent = engineAbi.find((item) => item.type === "event" && item.name === "RuleExecuted");

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Address>();
  const [provider, setProvider] = useState<BrowserProvider | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [executionActivity, setExecutionActivity] = useState(createExecutionActivityState);

  useEffect(() => {
    const detected = browserProvider();
    if (!detected) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      setAccount(accounts?.[0] as Address | undefined);
    };
    const onChainChanged = () => {
      setError(undefined);
      void detected.request({ method: "eth_chainId" }).then((chainId) => {
        if (Number.parseInt(String(chainId), 16) !== BASE_CHAIN_ID) {
          setError("Switch your wallet to Base Mainnet (chain 8453) to continue.");
        }
      });
    };
    detected.on?.("accountsChanged", onAccountsChanged);
    detected.on?.("chainChanged", onChainChanged);
    return () => {
      detected.removeListener?.("accountsChanged", onAccountsChanged);
      detected.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  useEffect(() => {
    // Notifications belong to the connected owner and must not leak across accounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExecutionActivity(createExecutionActivityState());
  }, [account]);

  const reportExecution = useCallback((observation: ExecutionObservation) => {
    if (!account) return;
    setExecutionActivity((state) => {
      const notification = createExecutionNotification(observation, account, supportedAssetLabel(observation.targetStock));
      return notification ? recordExecution(state, notification) : state;
    });
  }, [account]);

  const dismissExecution = useCallback((key: string) => {
    setExecutionActivity((state) => {
      if (!state.notifications.some((notification) => notification.key === key)) return state;
      return { ...state, notifications: state.notifications.filter((notification) => notification.key !== key) };
    });
  }, []);

  useEffect(() => {
    const executionEngine = DEPLOYMENTS.executionEngine;
    const executionEvent = ruleExecutedEvent;
    if (!account || !executionEngine || DEPLOYMENTS.deploymentBlock === undefined || !executionEvent) return;
    const monitoredAccount: Address = account;
    const monitoredEngine: Address = executionEngine;
    const monitoredEvent = executionEvent;

    let cancelled = false;
    let cursor: bigint | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let checking = false;

    async function checkForExecutionEvents() {
      if (cancelled || checking) return;
      checking = true;
      try {
        const latest = await withReadOnlyRpcFallback((client) => client.getBlockNumber());
        if (cursor === undefined) {
          cursor = latest;
          return;
        }

        const fromBlock = cursor + 1n;
        if (fromBlock > latest) return;
        const toBlock = fromBlock + OWNER_EVENT_MAX_RANGE - 1n > latest
          ? latest
          : fromBlock + OWNER_EVENT_MAX_RANGE - 1n;
        const logs = await getOwnerEventLogsInRange<Log>({
          address: monitoredEngine,
          event: monitoredEvent,
          owner: monitoredAccount,
          fromBlock,
          toBlock,
        });
        for (const log of logs) {
          const observation = decodeRuleExecutedLog(log);
          if (observation) reportExecution(observation);
        }
        cursor = toBlock;
      } catch {
        // Keep the cursor unchanged so the next bounded check retries the same range.
      } finally {
        checking = false;
        if (!cancelled) timeout = setTimeout(() => void checkForExecutionEvents(), EXECUTION_EVENT_POLL_MS);
      }
    }

    void checkForExecutionEvents();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [account, reportExecution]);

  const value = useMemo<WalletContextValue>(
    () => ({
      account,
      provider,
      isConnecting,
      error,
      connect: async () => {
        const detected = provider ?? browserProvider();
        if (!detected) {
          setError("No browser wallet was found. Install a wallet that supports Base.");
          return false;
        }
        setIsConnecting(true);
        setError(undefined);
        try {
          const connected = await connectToBase(detected);
          setProvider(detected);
          setAccount(connected);
          return true;
        } catch (connectError) {
          setError(firstErrorMessage(connectError));
          return false;
        } finally {
          setIsConnecting(false);
        }
      },
      disconnect: () => setAccount(undefined),
      getWalletClient: () => {
        if (!provider || !account) throw new Error("Connect a Base wallet first");
        return walletClient(provider, account);
      },
      executionNotifications: executionActivity.notifications,
      executionRefreshKey: executionActivity.refreshVersion,
      reportExecution,
      dismissExecution,
    }),
    [account, dismissExecution, error, executionActivity.notifications, executionActivity.refreshVersion, isConnecting, provider, reportExecution],
  );

  return (
    <WalletContext.Provider value={value}>
      <ExecutionToastViewport notifications={executionActivity.notifications} onDismiss={dismissExecution} />
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside Web3Provider");
  return context;
}

function supportedAssetLabel(targetStock: Address) {
  return Object.values(SUPPORTED_ASSETS).find((asset) => asset.address.toLowerCase() === targetStock.toLowerCase())?.symbol ?? targetStock;
}

function decodeRuleExecutedLog(log: Log): ExecutionObservation | undefined {
  const transactionHash = log.transactionHash;
  const logIndex = log.logIndex;
  const executionEvent = ruleExecutedEvent;
  if (!executionEvent || !transactionHash || logIndex === null || logIndex === undefined) return undefined;
  try {
    const decoded = decodeEventLog({ abi: [executionEvent], data: log.data, topics: log.topics });
    if (decoded.eventName !== "RuleExecuted") return undefined;
    const args = decoded.args as unknown as Record<string, bigint | Address>;
    return {
      transactionHash,
      logIndex: BigInt(logIndex),
      ruleId: args.ruleId as bigint,
      owner: args.owner as Address,
      targetStock: args.targetStock as Address,
      amountIn: args.amountIn as bigint,
      amountOut: args.amountOut as bigint,
      timestamp: args.timestamp as bigint,
    };
  } catch {
    return undefined;
  }
}
