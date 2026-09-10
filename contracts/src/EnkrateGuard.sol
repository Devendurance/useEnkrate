// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IEnkrateGuard } from "./interfaces/IEnkrateGuard.sol";
import { IEnkrateAssetRegistry } from "./interfaces/IEnkrateAssetRegistry.sol";
import { IB20 } from "./interfaces/IB20.sol";
import { IB20Factory } from "./interfaces/IB20Factory.sol";
import { IB20OracleRegistry } from "./interfaces/IB20OracleRegistry.sol";
import { IChainlinkAggregatorV3 } from "./interfaces/IChainlinkAggregatorV3.sol";
import { IPolicyRegistry } from "./interfaces/IPolicyRegistry.sol";

/// @title EnkrateGuard
/// @notice Read-only B20, oracle, reference, and policy checks shared by the execution engine.
/// @dev The oracle registry pause is the corporate-action guard. Reference age is a separate
///      24/5 feed policy and is never described as market-open/closed state.
abstract contract EnkrateGuard is IEnkrateGuard {
    uint256 internal constant BPS = 10_000;
    uint256 internal constant PRICE_DECIMALS = 8;
    uint256 internal constant WAD = 1e18;

    address public immutable referenceOracleRegistry;
    address public immutable policyRegistry;
    address public immutable assetRegistry;
    uint256 public immutable override referenceAgeThreshold;

    error ReferenceUnavailable();
    error B20StateUnavailable();

    constructor(
        address assetRegistry_,
        address referenceOracleRegistry_,
        address policyRegistry_,
        uint256 referenceAgeThreshold_
    ) {
        if (
            assetRegistry_ == address(0) || referenceOracleRegistry_ == address(0)
                || policyRegistry_ == address(0) || referenceAgeThreshold_ == 0
        ) revert B20StateUnavailable();
        assetRegistry = assetRegistry_;
        referenceOracleRegistry = referenceOracleRegistry_;
        policyRegistry = policyRegistry_;
        referenceAgeThreshold = referenceAgeThreshold_;
    }

    function inspectAsset(address targetStock)
        public
        view
        virtual
        override
        returns (GuardState memory state, bool approved)
    {
        IEnkrateAssetRegistry.Asset memory asset = IEnkrateAssetRegistry(assetRegistry).getAsset(targetStock);
        approved = asset.enabled;
        if (!approved) return (state, false);

        (state.referencePrice, state.referenceUpdatedAt) = _readReference(asset.feed);
        state.referenceAge =
            block.timestamp > state.referenceUpdatedAt ? block.timestamp - state.referenceUpdatedAt : 0;

        (state.multiplier, state.oraclePaused) =
            IB20OracleRegistry(referenceOracleRegistry).getOracleParams(targetStock);
        state.transferPaused = IB20(targetStock).isPaused(IB20.PausableFeature.TRANSFER);

        // The factory address is a Base precompile and may expose no ordinary EVM runtime
        // code on a fork, even though the native B20 token itself is fully dispatchable. Use
        // the factory when its runtime is available; otherwise require the native B20 marker.
        // This preserves official-B20 validation without making the execution path depend on
        // a precompile that the pinned Base runtime does not materialize as contract code.
        approved = _isOfficialB20(targetStock);
    }

    function _readReference(address feed) internal view returns (uint256 price, uint256 updatedAt) {
        (, int256 answer,, uint256 feedUpdatedAt,) = IChainlinkAggregatorV3(feed).latestRoundData();
        uint8 feedDecimals = IChainlinkAggregatorV3(feed).decimals();
        if (answer <= 0 || feedUpdatedAt == 0 || feedUpdatedAt > block.timestamp || feedDecimals > 18) {
            revert ReferenceUnavailable();
        }
        uint256 raw = uint256(answer);
        price = feedDecimals < PRICE_DECIMALS
            ? raw * 10 ** (PRICE_DECIMALS - feedDecimals)
            : raw / 10 ** (feedDecimals - PRICE_DECIMALS);
        if (price == 0) revert ReferenceUnavailable();
        updatedAt = feedUpdatedAt;
    }

    function _policyAuthorized(address token, bytes32 scope, address account) internal view returns (bool) {
        uint64 id = IB20(token).policyId(scope);
        if (id == 0) return true;
        if (!IPolicyRegistry(policyRegistry).policyExists(id)) return false;
        return IPolicyRegistry(policyRegistry).isAuthorized(id, account);
    }

    function _isOfficialB20(address token) internal view returns (bool) {
        address factory = IEnkrateAssetRegistry(assetRegistry).b20Factory();
        // A precompile can dispatch calls without exposing bytecode through EXTCODE.
        // Attempt the official factory first; only use the marker fallback when the call
        // itself is unsupported by the active runtime.
        try IB20Factory(factory).isB20(token) returns (bool isB20) {
            if (!isB20) return false;
            try IB20Factory(factory).isB20Initialized(token) returns (bool initialized) {
                return initialized;
            } catch {
                return false;
            }
        } catch { }

        if (factory.code.length != 0) {
            return false;
        }

        // Base-native B20 deployments expose the one-byte 0xef marker. Solidity bytecode
        // cannot normally be deployed with this invalid legacy opcode, so it is a useful
        // runtime-level discriminator when the factory precompile has no code account.
        bytes memory code = token.code;
        return code.length == 1 && code[0] == bytes1(0xef);
    }

    function _transferState(
        address token,
        address owner,
        address executor
    )
        internal
        view
        returns (bool allowed)
    {
        if (IB20(token).isPaused(IB20.PausableFeature.TRANSFER)) return false;
        bytes32 receiverScope = IB20(token).TRANSFER_RECEIVER_POLICY();
        bytes32 executorScope = IB20(token).TRANSFER_EXECUTOR_POLICY();
        // The source account is route-dependent (pool/executor internals are deliberately
        // not hard-coded). We can still preflight the owner as a permitted destination and
        // the 1inch executor as the route's visible transfer executor; the token itself
        // remains the final authority for any source-side policy during the swap.
        return
            _policyAuthorized(token, receiverScope, owner)
                && _policyAuthorized(token, executorScope, executor);
    }
}
