// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IB20OracleRegistry } from "../../src/interfaces/IB20OracleRegistry.sol";

contract MockOracleRegistry is IB20OracleRegistry {
    mapping(address => uint256) public multipliers;
    mapping(address => bool) public paused;

    function setOracleParams(address token, uint256 multiplier_, bool paused_) external {
        multipliers[token] = multiplier_;
        paused[token] = paused_;
    }

    function getOracleParams(address token)
        external
        view
        override
        returns (uint256 multiplier, bool isPaused)
    {
        return (multipliers[token], paused[token]);
    }
}
