// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IB20 } from "../src/interfaces/IB20.sol";
import { IB20OracleRegistry } from "../src/interfaces/IB20OracleRegistry.sol";

/// @notice Pinned Base fork smoke-test entry point.
///
/// Run with the official Base-patched Forge/runtime used for Phase 0C:
///
///   forge test --root contracts --match-contract EnkrateMainnetForkTest \
///     --fork-url https://base.publicnode.com --fork-block-number 50977018 --base
///
/// The fresh-route assertion is intentionally kept in `scripts/run-phase1a-fork.ts`:
/// route calldata is dynamic and must never be committed as a secret or assumed to remain
/// valid at a different block. The script deploys the production engine, obtains a fresh
/// authenticated 1inch route, and reports the real Base-compatible result without broadcasting.
contract EnkrateMainnetForkTest {
    address internal constant NVDAc = 0xb20000000000000000000078ee7ce2fE4908108C;
    address internal constant AAPLc = 0xb200000000000000000000C2e324d24d7eEcd1fb;
    address internal constant ORACLE = 0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD;

    function testOfficialRuntimeReadsCanonicalB20State() public view {
        // Keep the suite runnable on ordinary local EVMs. On Base chain 8453 this
        // test must be executed with the official `--base` patched runtime; stock
        // Anvil cannot dispatch the native B20 precompile.
        if (block.chainid != 8453) return;
        // At the accepted fork block, the documented factory precompile has no ordinary
        // contract code. Native B20 tokens instead expose the verified one-byte 0xef marker;
        // this is the same dispatch path used by the Phase 0C settlement evidence.
        require(NVDAc.code.length == 1 && NVDAc.code[0] == bytes1(0xef), "NVDAc marker missing");
        require(AAPLc.code.length == 1 && AAPLc.code[0] == bytes1(0xef), "AAPLc marker missing");
        require(!IB20(NVDAc).isPaused(IB20.PausableFeature.TRANSFER), "NVDAc transfers paused");
        require(!IB20(AAPLc).isPaused(IB20.PausableFeature.TRANSFER), "AAPLc transfers paused");
        (uint256 nvdaMultiplier, bool nvdaPaused) = IB20OracleRegistry(ORACLE).getOracleParams(NVDAc);
        (uint256 aaplMultiplier, bool aaplPaused) = IB20OracleRegistry(ORACLE).getOracleParams(AAPLc);
        require(nvdaMultiplier != 0 && aaplMultiplier != 0, "invalid multiplier");
        require(!nvdaPaused && !aaplPaused, "corporate action hold");
    }
}
