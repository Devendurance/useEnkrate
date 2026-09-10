"use client";

import { useEffect, useState } from "react";
import { b20Abi, b20FactoryAbi, erc20Abi, engineAbi, feedAbi, oracleRegistryAbi } from "@/lib/enkrate-abi";
import { DEPLOYMENTS, MAINNET_ADDRESSES, REFERENCE_AGE_THRESHOLD_SECONDS, SUPPORTED_ASSETS, type SupportedAssetKey } from "@/lib/mainnet-config";
import { formatAge, formatDate, formatToken, formatUsdc, formatUsdPrice } from "@/lib/format";
import { withReadOnlyRpcFallback } from "@/lib/web3";
import { Caption, StatusBadge, cx } from "./ui";
import { useWallet } from "./web3-provider";

type AssetSnapshot = {
  key: SupportedAssetKey;
  balance: bigint;
  referencePrice: bigint;
  referenceUpdatedAt: bigint;
  referenceAge: bigint;
  multiplier: bigint;
  oraclePaused: boolean;
  transferPaused: boolean;
  approved: boolean;
};

export function MainnetAssetStatus({ className, refreshKey = 0 }: { className?: string; refreshKey?: number }) {
  const { account, executionRefreshKey } = useWallet();
  const [snapshots, setSnapshots] = useState<AssetSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const executionEngine = DEPLOYMENTS.executionEngine;
        const rows = await Promise.all(
          (Object.keys(SUPPORTED_ASSETS) as SupportedAssetKey[]).map(async (key) => {
            const asset = SUPPORTED_ASSETS[key];
            const [balance, inspected] = await Promise.all([
              account
                 ? withReadOnlyRpcFallback((client) => client.readContract({ address: asset.address, abi: erc20Abi, functionName: "balanceOf", args: [account] }))
                : Promise.resolve(0n),
              executionEngine
                 ? withReadOnlyRpcFallback((client) => client.readContract({ address: executionEngine, abi: engineAbi, functionName: "inspectAsset", args: [asset.address] }))
                : readAssetDirect(asset.address, asset.feed),
            ]);
            const [state, approved] = inspected as unknown as readonly [{ referencePrice: bigint; referenceUpdatedAt: bigint; referenceAge: bigint; multiplier: bigint; oraclePaused: boolean; transferPaused: boolean }, boolean];
            return { key, balance, referencePrice: state.referencePrice, referenceUpdatedAt: state.referenceUpdatedAt, referenceAge: state.referenceAge, multiplier: state.multiplier, oraclePaused: state.oraclePaused, transferPaused: state.transferPaused, approved };
          }),
        );
        if (!cancelled) setSnapshots(rows);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message.split("\n")[0] : "Unable to read Base asset state.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [account, executionRefreshKey, refreshKey]);

  return (
    <section className={cx("border-y border-line", className)} aria-label="Live Base B20 status">
      <div className="flex flex-wrap items-end justify-between gap-3 py-5">
        <div>
          <Caption>Base Mainnet · live guard state</Caption>
          <h2 className="font-display mt-2 text-2xl text-ink">Supported B20 assets</h2>
        </div>
        {loading && <span className="font-mono text-xs text-muted">Refreshing…</span>}
      </div>
      {error && <p className="border-t border-line py-4 text-sm text-reject">{error}</p>}
      <div className="divide-y divide-line border-t border-line">
        {snapshots.map((snapshot) => {
          const asset = SUPPORTED_ASSETS[snapshot.key];
          const stateLabel = snapshot.oraclePaused ? "Rejected · Corporate-action hold" : snapshot.transferPaused ? "Rejected · Asset unavailable" : snapshot.referenceAge > REFERENCE_AGE_THRESHOLD_SECONDS ? "Waiting · Reference aged" : snapshot.approved ? "Active · Ready" : "Rejected · Asset unavailable";
          const tone = stateLabel.startsWith("Active") ? "pass" : stateLabel.startsWith("Waiting") ? "waiting" : "rejected";
          return (
            <article key={snapshot.key} className="grid gap-4 py-5 md:grid-cols-[1.2fr_1fr_1fr] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-ink">{asset.symbol}</h3>
                  <StatusBadge tone={tone} label={stateLabel} />
                </div>
                <p className="mt-1 text-sm text-ink-700">{asset.name}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><dt className="text-ink-700">Reference</dt><dd className="font-medium text-ink">{snapshot.referencePrice ? formatUsdPrice(snapshot.referencePrice) : "Unavailable"}</dd></div>
                <div><dt className="text-ink-700">Age / updated</dt><dd className="font-medium text-ink">{snapshot.referencePrice ? `${formatAge(snapshot.referenceAge)} · ${formatDate(snapshot.referenceUpdatedAt)}` : "—"}</dd></div>
                <div><dt className="text-ink-700">Multiplier</dt><dd className="font-medium text-ink">{snapshot.multiplier ? `${(Number(snapshot.multiplier) / 1e18).toFixed(4)}×` : "—"}</dd></div>
                <div><dt className="text-ink-700">Corporate action</dt><dd className="font-medium text-ink">{snapshot.oraclePaused ? "Hold" : "Clear"}</dd></div>
                <div><dt className="text-ink-700">Transfers</dt><dd className="font-medium text-ink">{snapshot.transferPaused ? "Paused" : "Open"}</dd></div>
                <div><dt className="text-ink-700">Wallet balance</dt><dd className="font-medium text-ink">{account ? `${formatToken(snapshot.balance)} ${asset.symbol}` : "Connect wallet"}</dd></div>
              </dl>
              <p className="break-all font-mono text-xs text-muted md:text-right">{asset.address}</p>
            </article>
          );
        })}
      </div>
      {account && snapshots.length > 0 && <UsdcBalance account={account} executionRefreshKey={executionRefreshKey} refreshKey={refreshKey} />}
      {!loading && snapshots.length === 0 && <p className="border-t border-line py-6 text-sm text-ink-700">Connect to Base Mainnet to read live B20 balances and guard state.</p>}
    </section>
  );
}

function UsdcBalance({ account, executionRefreshKey, refreshKey }: { account: `0x${string}`; executionRefreshKey: number; refreshKey: number }) {
  const [balance, setBalance] = useState<bigint>();
  useEffect(() => {
     void withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.usdc, abi: erc20Abi, functionName: "balanceOf", args: [account] })).then(setBalance).catch(() => setBalance(undefined));
  }, [account, executionRefreshKey, refreshKey]);
  return <p className="border-t border-line py-4 text-sm text-ink-700">Wallet USDC balance: <strong className="text-ink">{balance === undefined ? "Unavailable" : `${formatUsdc(balance)} USDC`}</strong></p>;
}

async function readAssetDirect(token: `0x${string}`, feed: `0x${string}`) {
  const [round, feedDecimals, multiplierState, transferPaused, isB20, isInitialized] = await Promise.all([
     withReadOnlyRpcFallback((client) => client.readContract({ address: feed, abi: feedAbi, functionName: "latestRoundData" })),
     withReadOnlyRpcFallback((client) => client.readContract({ address: feed, abi: feedAbi, functionName: "decimals" })),
     withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.oracleRegistry, abi: oracleRegistryAbi, functionName: "getOracleParams", args: [token] })),
     withReadOnlyRpcFallback((client) => client.readContract({ address: token, abi: b20Abi, functionName: "isPaused", args: [0] })),
     withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.b20Factory, abi: b20FactoryAbi, functionName: "isB20", args: [token] })),
     withReadOnlyRpcFallback((client) => client.readContract({ address: MAINNET_ADDRESSES.b20Factory, abi: b20FactoryAbi, functionName: "isB20Initialized", args: [token] })),
  ]);
  const [, answer, , updatedAt] = round as [bigint, bigint, bigint, bigint, bigint];
  const decimals = Number(feedDecimals);
  const referencePrice = answer > 0n ? decimals < 8 ? answer * 10n ** BigInt(8 - decimals) : answer / 10n ** BigInt(decimals - 8) : 0n;
  const referenceAge = updatedAt > 0n ? BigInt(Math.max(0, Math.floor(Date.now() / 1000) - Number(updatedAt))) : 0n;
  const [multiplier, oraclePaused] = multiplierState as [bigint, boolean];
  return [{ referencePrice, referenceUpdatedAt: updatedAt, referenceAge, multiplier, oraclePaused, transferPaused }, Boolean(isB20 && isInitialized)] as const;
}
