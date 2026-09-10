import assert from "node:assert/strict";
import * as web3 from "../src/lib/web3";

type Candidate = { name: string };
type ReadOnlyFallback = <T>(
  operation: (client: Candidate) => Promise<T>,
  clients: readonly Candidate[],
) => Promise<T>;

async function main() {
  const fallback = (web3 as { withReadOnlyRpcFallback?: unknown }).withReadOnlyRpcFallback;
  assert.equal(typeof fallback, "function", "read-only fallback helper must be exported");

  const run = fallback as ReadOnlyFallback;
  const primary = { name: "primary" };
  const secondary = { name: "fallback" };
  const attempts: string[] = [];
  const recovered = await run(async (client) => {
    attempts.push(client.name);
    if (client.name === "primary") throw new Error("primary RPC rate limited");
    return client.name;
  }, [primary, secondary]);

  assert.equal(recovered, "fallback");
  assert.deepEqual(attempts, ["primary", "fallback"]);

  let fallbackUsed = false;
  const primaryResult = await run(async (client) => {
    if (client.name === "fallback") fallbackUsed = true;
    return "primary result";
  }, [primary, secondary]);

  assert.equal(primaryResult, "primary result");
  assert.equal(fallbackUsed, false);
  console.log("read-only RPC fallback assertions passed");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
