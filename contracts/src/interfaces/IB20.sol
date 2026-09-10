// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal official Base B20 read surface used by Enkrate.
/// @dev The Base native precompile is versioned by the Base runtime. These selectors are
///      the official Base Standard Library selectors verified during Phase 0C.
interface IB20 {
    enum PausableFeature {
        TRANSFER,
        MINT,
        BURN,
        SEIZE
    }

    function isPaused(PausableFeature feature) external view returns (bool);
    function policyId(bytes32 policyScope) external view returns (uint64);
    function TRANSFER_SENDER_POLICY() external view returns (bytes32);
    function TRANSFER_RECEIVER_POLICY() external view returns (bytes32);
    function TRANSFER_EXECUTOR_POLICY() external view returns (bytes32);
    function multiplier() external view returns (uint256);
}
