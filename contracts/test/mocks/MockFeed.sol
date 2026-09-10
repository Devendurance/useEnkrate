// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IChainlinkAggregatorV3 } from "../../src/interfaces/IChainlinkAggregatorV3.sol";

contract MockFeed is IChainlinkAggregatorV3 {
    int256 public answer;
    uint256 public updatedAt;

    function set(int256 answer_, uint256 updatedAt_) external {
        answer = answer_;
        updatedAt = updatedAt_;
    }

    function decimals() external pure override returns (uint8) {
        return 8;
    }

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
