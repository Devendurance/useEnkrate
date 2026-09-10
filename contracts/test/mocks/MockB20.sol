// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { MockERC20 } from "./MockERC20.sol";
import { IB20 } from "../../src/interfaces/IB20.sol";

contract MockB20 is MockERC20, IB20 {
    bool public transferPaused;
    uint256 public override multiplier = 1e18;
    mapping(bytes32 => uint64) private _policies;

    constructor(string memory name_, string memory symbol_) MockERC20(name_, symbol_, 8) { }

    function isPaused(PausableFeature feature) external view override returns (bool) {
        return feature == PausableFeature.TRANSFER && transferPaused;
    }

    function setTransferPaused(bool paused) external {
        transferPaused = paused;
    }

    function policyId(bytes32 scope) external view override returns (uint64) {
        return _policies[scope];
    }

    function setPolicy(bytes32 scope, uint64 id) external {
        _policies[scope] = id;
    }

    function TRANSFER_SENDER_POLICY() external pure override returns (bytes32) {
        return keccak256("TRANSFER_SENDER_POLICY");
    }

    function TRANSFER_RECEIVER_POLICY() external pure override returns (bytes32) {
        return keccak256("TRANSFER_RECEIVER_POLICY");
    }

    function TRANSFER_EXECUTOR_POLICY() external pure override returns (bytes32) {
        return keccak256("TRANSFER_EXECUTOR_POLICY");
    }
}
