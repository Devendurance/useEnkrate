export function formatUsdc(value: bigint | string | number, maximumFractionDigits = 2) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  const whole = amount / 1_000_000n;
  const fraction = (amount % 1_000_000n).toString().padStart(6, "0").slice(0, maximumFractionDigits);
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function formatToken(value: bigint | string | number, decimals = 8, maximumFractionDigits = 8) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = (amount % base).toString().padStart(decimals, "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function formatUsdPrice(value: bigint | string | number) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  return `$${(Number(amount) / 1e8).toFixed(2)}`;
}

export function formatAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatDate(seconds: bigint | string | number) {
  const timestamp = Number(seconds) * 1000;
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toLocaleString() : "—";
}

export function formatAge(seconds: bigint | string | number) {
  const age = Number(seconds);
  if (!Number.isFinite(age)) return "Unknown";
  if (age < 60) return `${age}s ago`;
  if (age < 3600) return `${Math.floor(age / 60)}m ago`;
  if (age < 86400) return `${Math.floor(age / 3600)}h ago`;
  return `${Math.floor(age / 86400)}d ago`;
}

export function parseUsdc(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized) || Number(normalized) <= 0) throw new Error("Enter a positive USDC amount with up to 6 decimals.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function parsePrice(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(normalized) || Number(normalized) <= 0) throw new Error("Enter a positive price.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
}