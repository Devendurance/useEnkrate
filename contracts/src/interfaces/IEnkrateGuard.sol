// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEnkrateGuard {
    enum ExecutionBlockReason {
        NONE,
        RULE_NOT_ACTIVE,
        RULE_EXPIRED,
        INTERVAL_NOT_ELAPSED,
        SPEND_LIMIT,
        INSUFFICIENT_BALANCE,
        INSUFFICIENT_ALLOWANCE,
        ASSET_NOT_APPROVED,
        CORPORATE_ACTION_HOLD,
        REFERENCE_TOO_OLD,
        REFERENCE_UNAVAILABLE,
        TRANSFER_PAUSED,
        B20_STATE_UNAVAILABLE,
        INVALID_RULE
    }

    struct GuardState {
        uint256 referencePrice;
        uint256 referenceUpdatedAt;
        uint256 referenceAge;
        uint256 multiplier;
        bool oraclePaused;
        bool transferPaused;
    }

    function referenceAgeThreshold() external view returns (uint256);
    function inspectAsset(address targetStock) external view returns (GuardState memory state, bool approved);
}
