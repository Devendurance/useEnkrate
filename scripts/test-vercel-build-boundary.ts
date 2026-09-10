import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const deploySource = readFileSync(resolve(process.cwd(), "scripts/deploy-mainnet.ts"), "utf8");
const layoutSource = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");

assert.match(deploySource, /import \{ readFileSync \} from "node:fs";/);
assert.match(deploySource, /import \{ resolve \} from "node:path";/);
assert.match(deploySource, /function loadArtifact\(relativePath: string\)/);
assert.doesNotMatch(deploySource, /import\(\s*["'][^"']*contracts\/out\/Enkrate/);
assert.match(deploySource, /loadArtifact\("contracts\/out\/EnkrateAssetRegistry\.sol\/EnkrateAssetRegistry\.json"\)/);
assert.match(deploySource, /loadArtifact\("contracts\/out\/EnkrateExecutionEngine\.sol\/EnkrateExecutionEngine\.json"\)/);
assert.match(layoutSource, /other:\s*\{\s*"base:app_id":\s*"6aa22a02fa92e96bd08c5b2d"/);

console.log("Vercel build boundary assertions passed");
